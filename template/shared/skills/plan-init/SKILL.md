---
name: plan-init
description: plan(기능 그룹) 생성 — NNN 채번 폴더 + PLAN.md/ROADMAP.md + 제품 관통 문서(FEATURES/UX-UI) 의도 레벨 delta
---

# /plan-init

## 개요

plan(기능 그룹)마다 호출. **plan = 작업을 묶는 기능 그룹 단위** — 제품 전체 스냅샷(버전)이 아니다. 규모 가변(기능 그룹 하나가 보편, 첫 plan=MVP처럼 여러 그룹 묶음도 같은 흐름, 특례 없음).

본 스킬이 만드는 것:
- **plan 로컬(그룹 C)** — `.project/plans/<NNN_slug>/`에 `PLAN.md` + `ROADMAP.md`.
- **제품 관통 문서(그룹 B) delta — 의도 레벨만** — `.project/FEATURES.md` / `.project/UX-UI.md`에 이 기능 그룹의 *섹션 헤더 + 의도 스텁* append.

만들지 *않는* 것:
- **제품 관통 문서 전체 생성** — 7종(SERVICE-POLICY/TECH-STACK/ARCHITECTURE/DATA-MODEL/API-SPEC/FEATURES/UX-UI)은 `/project-init` 영역. plan-init은 부수적 add/mod만.
- **DATA-MODEL/API-SPEC 상세 본문** — 스키마·엔드포인트 *선기획 금지*. 구현 동반으로 task(`/task-plan` Phase 0 / `/task-dev`)가 채운다. plan-init은 빈 섹션 헤더만 둘 수 있다.

## 호출 시점 + 입력

- `/project-init` 직후 첫 plan(보통 MVP) 또는 새 기능 그룹 착수 시.
- 인자 = plan slug (예: `/plan-init compare-products`). 없으면 *"어느 기능 그룹? slug 알려줘 (예: mvp, compare-products)"*. 한국어면 영어 *의미 변환* → kebab-case(공백 불가, 3 단어 이내).
- **자투리는 plan 없이** — 단발 버그·오타·의존성 업데이트는 plan-init 없이 `/task-init`로 바로(무소속). 전역 TASK-NNN이 순서 보장.

## 생성 (CLI — 채번+폴더+골격+AGENT-GUIDE)

`plan_init` 도구로 생성한다 (MCP 도구 `plan_init` 또는 동일 `npx @angar2/taskery plan-init <slug>`). 한 번으로 코드가 원자 수행: **NNN 채번**(3자리, 최대+1) · **폴더**(`plans/<NNN_slug>/` + `tasks/<NNN_slug>/{spec-diffs,screenshots,mockup}/`) · **골격 Write**(ROADMAP/PLAN/BACKLOG, 아래 형식 placeholder) · **AGENT-GUIDE `## 활성 plan 버전` 갱신**. 성공 반환 `{ plan, nnn, planDir, tasksDir }` — 이후 단계는 이 `plan`(=`<NNN_slug>`) 사용. PROJECT.md/AGENT-GUIDE 부재 시 에러 → *"`/project-init` 먼저 호출 필요"* 안내 후 중단.

**legacy 게이트** — `plans/`에 NNN 채번 아닌 폴더(구버전 `v1.0`/`alpha` 등) 잔존 시 `{gated:true, legacyDirs}`로 멈춘다(폴더 생성 X). 사용자 호출 + 경고: *"`plans/`에 NNN 채번 아닌 폴더(<legacyDirs>)가 있어. 새 plan을 NNN로 채번하면 활성 plan이 갈려 원래 문제 재발. 수동 이전(문서 루트 이동 + `NNN_slug` 리네임 + AGENT-GUIDE 갱신) 후 진행할지, 그래도 진행할지 결정해줘."* → 강행 시 `force:true`(CLI는 `--force`)로 재호출.

> 폴더 생성·`tasks/<NNN_slug>/`·AGENT-GUIDE 갱신은 코드가 완료 — 아래는 골격 placeholder를 *내용으로 채우는* 단계(LLM 판단)다.

## ROADMAP.md 내용 채우기

*현재 plan 한정* task 단계를 placeholder에 채운다. *ROADMAP 작성 4룰*:
1. *현재 plan 한정* — 다른 기능 그룹 후보는 글로벌 `.project/BACKLOG.md`. 프로젝트 전체 거시 빌드 순서는 `PROJECT.md ## 초기 빌드 로드맵`(별개).
2. 진행 순서에 task 번호(TASK-NNN) 강제 금지 — *Stage(영역) 단위*로만 (task 합류 시 번호 어긋남 방지).
3. Stage 안 *작업 단위 명시*(한 task 분량 권장 — 다음 task 진행 시 메인이 ROADMAP 보고 범위 판단).
4. 작업 단위에 task 번호 컬럼 X / *상태 컬럼만*(⏳ 대기 / 🔧 진행 중 / ✅ 완료 / ❌ 폐기) — Living document.

```markdown
# ROADMAP — <NNN_slug>

> 본 plan(기능 그룹) 한정 task 단계. Stage 단위(task 번호 강제 X), 상태 컬럼만 Living.
> 프로젝트 거시 빌드 순서는 PROJECT.md, 다음 기능 그룹 후보는 글로벌 BACKLOG.md.

## Stage 1 — <영역명>
| 작업 단위 | 상태 |
|-----------|------|
| <한 task 분량 작업> | ⏳ 대기 |
```

## PLAN.md 내용 채우기 (얇은 인덱스 — 하드룰)

PLAN.md는 *얇은 인덱스*다 — 이 기능 그룹이 건드린 루트 문서 요약 + task 체크리스트만.

**하드룰 (중복 차단):**
- **각 항목 = 루트 문서 섹션 *링크 1줄*. 본문 복제 금지.** 기능 상세는 `.project/` 루트 문서에만(단일 홈).
- `## 활성 task 버전` 류 *자기선언 라인 작성 금지* — 활성 plan 단일 진실은 `AGENT-GUIDE.md`뿐.

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

## 제품 관통 문서(그룹 B) 의도 레벨 delta

`.project/` 루트 문서에 이 기능 그룹의 *의도*를 명시한다. **의도 레벨만 — 상세 선작성 금지.**

- **FEATURES.md / UX-UI.md (필수)**: 이 기능 그룹의 *섹션 헤더 + 의도 스텁* append. "무엇 / 어떤 화면" — 구현 전에도 선언 가능(기능 그룹 기획의 본질). 섹션은 *기능/도메인 자기기술* — 어느 plan이 추가했는지 태그 X(기능 분류 = 제품 관통 문서 섹션 구조가 단일 진실).
  ```markdown
  ## <기능 그룹 이름>
  <의도 1~3줄: 무엇을 / 누구를 위해 / 핵심 화면·동작. 상세 스펙은 task 진행에서.>
  ```
- **DATA-MODEL.md / API-SPEC.md (선택 — 빈 헤더까지만)**: 데이터/엔드포인트 도입 예정이면 *빈 섹션 헤더*만. **스키마·엔드포인트 본문 선작성 금지** — 구현 동반으로 `/task-plan` Phase 0 / `/task-dev`가 채운다(anti-waterfall: TASK_DOC_RULE §1.4 / DEV_RULE §2).
- **그룹 A (SERVICE-POLICY/TECH-STACK/ARCHITECTURE)**: 이 그룹이 새 정책/스택/구조 도입 시만 수정. 도입 없으면 건너뜀.

타입 조건부: project-init이 안 만든 문서(예: frontend의 DATA-MODEL)는 delta도 없음.

## 결과 보고

작성 산출물 목록 + 다음 단계:
- *"`<NNN_slug>/` plan 생성 완료 — PLAN/ROADMAP + FEATURES/UX-UI 의도 stub. AGENT-GUIDE 활성 plan `<NNN_slug>` 갱신. 다음은 `/task-init`으로 첫 task (스키마/엔드포인트 상세는 task 진행에서 구현 동반)."*

**commit 흐름** (GIT_RULE): 현재 브랜치(= 부모)가 dev/main이면 직접 commit *금지*(git-guard 차단). default 둘:
1. **첫 task에 묶기 (권장)**: `/project-init` 직후면 init 산출물과 같은 작업 브랜치(보통 TASK-001 부트스트랩 chore)에 함께. 새 기능 그룹이면 새 task 브랜치 또는 임시 docs 브랜치.
2. **임시 docs 브랜치**: `git checkout -b docs/{개발자}_plan-{NNN_slug}` → commit → **현재 브랜치(부모) `--no-ff` 머지**(부모가 dev면 dev, dev_feat_x면 dev_feat_x).

## 주의사항

- **plan-init은 제품 관통 문서 전체를 만드는 스킬이 아니다** — 7종은 project-init 영역. 본 스킬은 plan 로컬(PLAN/ROADMAP) + 제품 관통 문서 delta(의도)만.
- **delta는 의도 레벨까지만** — DATA-MODEL/API-SPEC 스키마·엔드포인트 *본문 선작성 금지*. 상세는 구현 동반(task).
- **제품 관통 문서에 plan 태그 금지** — 기능 섹션은 자기기술.
- **PLAN.md 본문 복제 금지** — 각 항목 = 루트 문서 섹션 링크 1줄. `## 활성 task 버전` 자기선언 X.
- **legacy 폴더 감지 시 진행 보류** — 사용자 confirm 전 새 plan 생성 금지.
- 답 받기 전 자동 추정 진행 X. 단 PROJECT.md/기존 루트 문서로 *제안*은 OK(confirm 후).
