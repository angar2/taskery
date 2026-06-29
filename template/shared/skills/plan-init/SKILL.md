---
name: plan-init
description: plan(기능 그룹) 생성 — NNN 채번 폴더 + PLAN.md/ROADMAP.md + 제품 관통 문서(FEATURES/UX-UI) 의도 레벨 delta
---

# /plan-init

## 개요

plan(기능 그룹)마다 호출. **plan = 작업을 묶는 기능 그룹 단위** — 제품 전체 스냅샷(버전)이 아니다. 규모는 가변: 기능 그룹 하나가 보편이나, 첫 plan(MVP처럼 여러 기능 그룹을 묶은 큰 plan)도 같은 흐름으로 처리한다(특례 없음).

본 스킬이 만드는 것:
- **plan 로컬(그룹 C)** — `.project/plans/<NNN_slug>/`에 `PLAN.md` + `ROADMAP.md` 생성.
- **제품 관통 문서(그룹 B) delta — 의도 레벨만** — `.project/FEATURES.md` / `.project/UX-UI.md`에 이 기능 그룹의 *섹션 헤더 + 의도 스텁* append.

본 스킬이 만들지 *않는* 것:
- **제품 관통 문서 전체 생성** — SERVICE-POLICY/TECH-STACK/ARCHITECTURE/DATA-MODEL/API-SPEC/FEATURES/UX-UI 7종은 `/project-init`이 루트에 작성/골격화 완료. plan-init은 부수적 add/mod만.
- **DATA-MODEL/API-SPEC 상세 본문** — 스키마·엔드포인트는 *선기획 금지*. 구현 동반으로 task 진행(`/task-plan` Phase 0 / `/task-dev`)이 채운다. plan-init은 빈 섹션 헤더만 둘 수 있다.

> plan 폴더명은 `NNN_<slug>` 형식(3자리 채번 + 기능 그룹 slug). 예: `001_mvp`, `002_compare-products`. tasks 폴더도 동일명.

## 호출 시점

- `/project-init` 직후 첫 plan(보통 MVP) 생성 시.
- 새 기능 그룹(예: `compare-products` 다음 `auth-system`) 착수 시.

> **자투리는 plan 없이** — 급한 버그·오타·의존성 업데이트 같은 단발 작업은 어느 기능 그룹에도 안 묶인다. plan-init 호출 없이 `/task-init`로 바로 진행(무소속). 전역 TASK-NNN이 순서를 보장하므로 소속과 무관하다.

## 입력 처리

인자 = plan slug (예: `/plan-init compare-products`). 인자 없으면 사용자에게 *"어느 plan(기능 그룹)? slug 알려줘 (예: mvp, compare-products)"* 질문. 형식: 한국어면 영어 *의미 변환* → kebab-case(공백 불가, 3 단어 이내 권장).

## 단계

### Step 1 — 사전 검증 + 메인 워크트리 검출

1. **메인 워크트리 검출**:
   ```sh
   MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
   ```
2. 메인 워크트리 dev 체크아웃 검증 — 위배 시 사용자 호출 + 중단.
3. `$MAIN_WT/.project/PROJECT.md` 존재 확인 — 없으면 *"`/project-init` 먼저 호출 필요"* + 중단.

### Step 2 — plan 생성 (CLI — 채번 + 폴더 + 골격 + AGENT-GUIDE)

1. slug 확정 (인자 또는 사용자 질문 — 위 입력 처리).
2. `npx @angar2/taskery plan-init <slug>` 한 번으로 다음을 코드가 원자 수행:
   - **NNN 채번** (3자리, 기존 최대+1)
   - **폴더 생성** — `plans/<NNN_slug>/` + `tasks/<NNN_slug>/{spec-diffs,screenshots,mockup}/`
   - **골격 Write** — ROADMAP.md / PLAN.md / BACKLOG.md (placeholder 포함, Step 3~4·7 형식)
   - **AGENT-GUIDE.md `## 활성 plan 버전` 갱신** (Step 8)
   - 성공 시 JSON 한 줄 — `{ plan, nnn, planDir, tasksDir }`. 이후 단계는 이 `plan`(=`<NNN_slug>`)을 사용.
3. **legacy 게이트** — `plans/`에 NNN 채번이 아닌 폴더(구버전 `v1.0` / `alpha` 등) 잔존 시 CLI가 **exit 2 + `{gated:true, legacyDirs}`**로 멈춘다(폴더 생성 X). 이때:
   - 사용자 호출 + 경고: *"`plans/`에 NNN 채번이 아닌 폴더(<legacyDirs>)가 있어. 새 plan을 NNN로 채번하면 활성 plan이 갈려 원래 문제가 재발해. 먼저 수동 이전(문서 루트 이동 + 폴더 `NNN_slug` 리네임 + AGENT-GUIDE 활성 plan 갱신)을 끝낸 뒤 진행할지, 그래도 진행할지 결정해줘."*
   - 사용자가 강행 결정 시 `npx @angar2/taskery plan-init <slug> --force`로 재호출.

### Step 3 — ROADMAP.md 내용 채우기

Step 2 CLI가 ROADMAP.md 골격을 이미 생성했다 (아래 형식). *현재 plan(기능 그룹) 한정* task 단계를 placeholder(`<영역명>` / `<한 task 분량 작업>`)에 채운다. *ROADMAP 작성 4룰*:
   1. ROADMAP은 *현재 plan 한정* — 다른 기능 그룹 후보는 글로벌 `.project/BACKLOG.md`. 프로젝트 전체 거시 빌드 순서는 `PROJECT.md ## 초기 빌드 로드맵`(별개).
   2. 진행 순서에 task 번호(TASK-NNN) 강제 금지 — *Stage(영역) 단위*로만 명시 (예측 불가 task 합류 시 번호 어긋남 방지).
   3. Stage 안 *작업 단위 명시* 필요 (한 task 분량 권장 — 다음 task 진행 시 메인 세션이 ROADMAP 보고 작업 범위 판단 가능).
   4. 작업 단위에 task 번호 컬럼 추가 X / *상태 컬럼만* (⏳ 대기 / 🔧 진행 중 / ✅ 완료 / ❌ 폐기) — Living document.

```markdown
# ROADMAP — <NNN_slug>

> 본 plan(기능 그룹) 한정 task 단계. Stage 단위(task 번호 강제 X), 상태 컬럼만 Living.
> 프로젝트 거시 빌드 순서는 PROJECT.md, 다음 기능 그룹 후보는 글로벌 BACKLOG.md.

## Stage 1 — <영역명>
| 작업 단위 | 상태 |
|-----------|------|
| <한 task 분량 작업> | ⏳ 대기 |
```

### Step 4 — PLAN.md 내용 채우기 (얇은 인덱스 — 하드룰)

Step 2 CLI가 PLAN.md 골격을 이미 생성했다. PLAN.md는 *얇은 인덱스*다 — 이 기능 그룹이 건드린 루트 문서 요약 + task 체크리스트만 placeholder에 채운다.

**하드룰 (중복 차단):**
- **각 항목 = 루트 문서 섹션 *링크 1줄*. 본문 복제 금지.** 기능 상세는 `.project/` 루트 문서에만 존재(단일 홈).
- `## 활성 task 버전` 류 *자기선언 라인 작성 금지* — 활성 plan의 단일 진실은 `AGENT-GUIDE.md`뿐. plan 로컬이 중복 선언하지 않는다.

```markdown
# PLAN — <NNN_slug>

> 이 plan(기능 그룹)의 얇은 인덱스. 각 항목은 루트 문서 섹션 링크 1줄 — 본문은 복제하지 않는다.

## 이 기능 그룹이 건드리는 루트 문서
- [FEATURES.md › <이 그룹 섹션>](../../FEATURES.md) — <한 줄 요약>
- [UX-UI.md › <이 그룹 섹션>](../../UX-UI.md) — <한 줄 요약>
- (DATA-MODEL / API-SPEC — task 진행이 구현 동반으로 채움)

## task 체크리스트
- [ ] <작업 단위> (ROADMAP Stage N)
```

### Step 5 — 제품 관통 문서(그룹 B) 의도 레벨 delta

`.project/` 루트 제품 관통 문서에 이 기능 그룹의 *의도*를 명시한다. **의도 레벨만 — 상세 선작성 금지.**

- **FEATURES.md / UX-UI.md (필수)**: 이 기능 그룹의 *섹션 헤더 + 의도 스텁* append. "이 기능이 무엇 / 어떤 화면" — 구현 전에도 선언 가능(그게 기능 그룹 기획의 본질). 섹션은 *기능/도메인 자기기술* — 어느 plan이 추가했는지 태그하지 않는다(기능 분류 = 제품 관통 문서 섹션 구조가 단일 진실).
  ```markdown
  ## <기능 그룹 이름>
  <의도 1~3줄: 무엇을 / 누구를 위해 / 핵심 화면·동작. 상세 스펙은 task 진행에서.>
  ```
- **DATA-MODEL.md / API-SPEC.md (선택 — 빈 헤더까지만)**: 이 그룹이 데이터/엔드포인트를 도입할 거면 *빈 섹션 헤더*만 둘 수 있다. **스키마·엔드포인트 본문 선작성 금지** — 구현 동반으로 `/task-plan` Phase 0 / `/task-dev`가 채운다(taskery anti-waterfall: TASK_DOC_RULE §1.4 / DEV_RULE §2 정합).

타입 조건부: project-init이 만들지 않은 문서(예: frontend의 DATA-MODEL)는 delta도 없음.

### Step 6 — 그룹 A 점검 (부수적 add/mod)

이 기능 그룹이 *새 정책 / 새 스택 / 새 구조*를 도입하면 해당 루트 문서(SERVICE-POLICY / TECH-STACK / ARCHITECTURE)를 수정한다. 도입 없으면 건너뜀. (그룹 A는 project-init이 작성한 정적 제품 관통 문서 — plan-init은 부수적 변경만.)

### Step 7 — `tasks/<NNN_slug>/` 디렉토리 (CLI 자동 생성됨)

Step 2 `plan-init` CLI가 이미 생성 완료 — `tasks/<NNN_slug>/` + `spec-diffs/` `screenshots/` `mockup/` 빈 폴더 + `BACKLOG.md` 빈 골격(plan별 task 후보 누적용, 글로벌 `.project/BACKLOG.md`와 별개). **추가 작업 없음** — 본문은 task 진행하며 `/add-backlog` 또는 메인 감지로 누적된다.

### Step 8 — `AGENT-GUIDE.md` 활성 plan (CLI 자동 갱신됨)

Step 2 `plan-init` CLI가 `## 활성 plan 버전` 다음 줄을 `<NNN_slug>`로 갱신 완료 (헤딩 텍스트 불변 — lib.js/스킬 의존). 결과 JSON 확인만. (수동 갱신 불요.)

### Step 9 — 결과 보고

작성된 산출물 목록 + 다음 단계 안내:
- *"`<NNN_slug>/` plan 생성 완료 — PLAN.md / ROADMAP.md + 제품 관통 문서 FEATURES/UX-UI 의도 stub 추가. AGENT-GUIDE.md 활성 plan `<NNN_slug>`로 갱신. 다음은 `/task-init`으로 첫 task 생성 (스키마/엔드포인트 상세는 task 진행에서 구현 동반)."*

**결과 commit 흐름** (GIT_RULE 정합):
- dev 직접 commit *금지* (git-guard.sh 차단). 두 가지 default 흐름:
  1. **첫 task에 묶기 (권장)**: `/project-init` 직후 본 스킬 호출이면 init 산출물과 같은 작업 브랜치(보통 TASK-001 부트스트랩 chore)에 함께 commit. 새 기능 그룹 착수면 새 task 브랜치 또는 임시 docs 브랜치에서.
  2. **임시 docs 브랜치**: `git checkout -b docs/{개발자}_plan-{NNN_slug}` 후 commit → dev에 `--no-ff` 머지. 다음 task 생성 *전*에 plan 산출물을 깔끔히 기록하고 싶을 때.

## 도구 가이드

- **Read**: PROJECT.md / `.project/` 루트 제품 관통 문서(FEATURES/UX-UI 등 delta 대상) / plan-init 반환 골격 확인
- **Bash**: `MAIN_WT` 검출 / `npx @angar2/taskery plan-init <slug>` 호출(채번+폴더+골격+AGENT-GUIDE 갱신) / 결과 JSON 파싱
- **Write/Edit**: ROADMAP.md / PLAN.md *골격 내용 채우기*(CLI가 골격 생성), 제품 관통 문서 FEATURES/UX-UI delta append
- **AskUserQuestion**: slug 확정 / legacy 게이트 confirm

## 주의사항

- **plan-init은 *제품 관통 문서 전체를 만드는 스킬이 아니다*** — 7종은 project-init 영역. 본 스킬은 plan 로컬(PLAN/ROADMAP) + 제품 관통 문서 delta(의도)만.
- **delta는 의도 레벨까지만** — FEATURES/UX-UI 의도 스텁은 두되, DATA-MODEL/API-SPEC 스키마·엔드포인트 *본문 선작성 금지*. 상세는 구현 동반(task).
- **제품 관통 문서에 plan 태그 금지** — 기능 섹션은 자기기술. 어느 plan이 만들었는지 표기하지 않는다(plan은 작업 묶음이지 영구 기능 분류 단위가 아님).
- **PLAN.md 본문 복제 금지** — 각 항목 = 루트 문서 섹션 링크 1줄. `## 활성 task 버전` 자기선언 라인 작성 X.
- **legacy 폴더 감지 시 진행 보류** — NNN 아닌 폴더 잔존 시 사용자 confirm 전 새 plan 생성 금지.
- **AGENT-GUIDE 활성 plan 갱신 *반드시*** — 값 = `NNN_slug`. 헤딩 텍스트 변경 X.
- 답 받기 전 자동 추정 진행 X. 단 PROJECT.md / 기존 루트 문서 정보로 *제안*은 OK (사용자 confirm 후).

## 상태 전이

해당 없음 (plan 레벨 — task 상태 X).
