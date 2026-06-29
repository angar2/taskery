---
name: task-init
description: task 시작 — 워크트리 분기 + 6 섹션 빈 골격 + 헤더 5컬럼 (status=draft) task.md 생성 (멀티세션 0.1.2+)
---

# /task-init

## 개요

새 task 시작 시 호출. **워크트리 분기 + task.md 빈 골격 작성**.

멀티세션 0.1.2+ — 본 스킬은 *작업 격리 워크트리*를 dev에서 분기 (`~/.taskery/worktrees/<projectId>/TASK-NNN_<출처>_<슬러그>/`) + 빈 골격 `task.md`를 작성한다. Requirements / Scope / Dev Plan / Test Plan 본문은 다음 단계 `/task-plan`에서 채움.

> **호출 위치**: 메인 워크트리(dev 체크아웃 상태)에서 호출. 다른 워크트리에서 호출 시 → 사용자 호출 + 중단.

## 호출 시점

- 새 task 시작 시 (사용자 발화: *"~~ 추가해줘"*, *"~~ 버그 고쳐"*, *"~~ 리팩터링"*).
- 직전 대화로 작업 맥락 명확해진 직후.
- 백로그 항목 진행 (사용자: *"BL-003 진행하자"*).
- 로드맵 항목 진행 (사용자: *"로드맵 RM-002 시작"*).

## 입력 처리

인자 = (선택) 주제 / 유형 / 출처(BL-NNN, RM-NNN, DR) / 규모. 예: `/task-init 로그인 기능` / `/task-init BL-003` / 인자 없이 호출.

두 분기:
- **분기 1 (제안)**: 직전 맥락 명확 → 메인이 *"이렇게 task 만들까요?"* 제안 + 사용자 confirm.
- **분기 2 (인터뷰)**: 직전 맥락 부족 → 한 번에 한 질문씩 인터뷰.

**자동 추정 진행 X** — 사용자 confirm 또는 답 받기 전 워크트리 생성 / 파일 생성 금지.

## 단계

### Step 1 — 사전 검증 (멀티세션 안전망)

`bin/lib.js` 유틸 활용 — 메인 워크트리 + dev 검증.

1. **메인 워크트리 검출**:
   ```sh
   MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
   ```
   - git ≥ 2.31 필요. 실패 시 *"git 버전 확인 — 2.31+ 필요"* 보고 + 중단.
2. **현재 cwd가 메인 워크트리인지 확인**:
   ```sh
   CURRENT_WT=$(git rev-parse --show-toplevel)
   [ "$CURRENT_WT" = "$MAIN_WT" ] || abort "메인 워크트리에서 호출해야 함 (현재: $CURRENT_WT)"
   ```
3. **dev 브랜치 존재 검증**:
   ```sh
   git -C "$MAIN_WT" rev-parse --verify dev || abort "dev 브랜치 부재. 사용자 결정 필요 (생성?)"
   ```
4. **메인 워크트리 = dev 검증**:
   ```sh
   CURRENT=$(git -C "$MAIN_WT" rev-parse --abbrev-ref HEAD)
   [ "$CURRENT" = "dev" ] || abort "메인 워크트리가 dev 아님 (현재: $CURRENT). taskery 정책 위배"
   ```
5. **stale 의심 감지** (`npx @angar2/taskery status`로 위임 가능):
   - 케이스 A (폴더 없는 워크트리): `git worktree prune` 제안 + 사용자 확인 후 실행
   - 케이스 B (N일↑ 미커밋 브랜치): 알림만
   - 케이스 C (워크트리 폴더 존재, N일↑ 비활성): 알림만
   - 케이스 D (rebase 잔여 상태 — 워크트리에 `.git/rebase-apply` 또는 `.git/rebase-merge` 존재): 사용자 호출 + 선택 (continue / abort)
   - N = `.taskery-manifest.json`의 `stale_days` (기본 30)

위 검증 1개라도 실패 시 → 사용자 호출 + 중단.

### Step 2 — active plan 버전 확인

1. `$MAIN_WT/.project/AGENT-GUIDE.md` Read → *활성 plan* 추출 (예: `001_mvp` — `NNN_slug` 폴더명).
2. AGENT-GUIDE.md 없거나 활성 plan 누락 시 → 사용자에게 *"활성 plan 버전이 없는데 `/plan-init` 먼저 실행할까요?"* 묻고 중단.
3. `$MAIN_WT/.project/plans/<NNN_slug>/` 디렉토리 존재 확인. 없으면 동일하게 `/plan-init` 안내 + 중단.

### Step 3 — 분기 판단 + 메타 수집

직전 대화 정독:
- 작업 주제 / 유형 / 출처 / 규모 추정 가능?
  - **추정 가능** → 분기 1 (제안):
    *"직전 맥락 보니 다음 task 만들까요? 주제: <X> / 유형: <Y> / 출처: <Z> / 규모: <W> / plan: <NNN_slug>. 어떠세요?"*
    사용자 답 — *"OK"* / *"규모는 large야"* / *"유형은 bug야"* 등 부분 수정 받음.
  - **추정 불가** → 분기 2 (인터뷰): 한 번에 한 질문씩.
    - Q1: *"무슨 작업인가요? (한 줄로)"*
    - Q2: *"유형? (feature / bug / improvement / refactor / docs / chore)"*
    - Q3: *"출처? (백로그 BL-NNN / 로드맵 RM-NNN / 직접 요구사항 DR)"*
    - Q4: *"규모? (micro / small / medium / large) — 잘 모르겠으면 추정 알려드림."*
    - (필요 시) Q5: *"plan `<NNN_slug>` 맞나요?"*

수집 항목 (모두 확정되어야 진행):
- 주제 (한국어 — kebab-slug 변환은 Step 4)
- 유형: `feature` / `bug` / `improvement` / `refactor` / `docs` / `chore`
- 출처: `BL-NNN` / `RM-NNN` / `DR`
- 규모: `micro` / `small` / `medium` / `large`
- plan: 활성 plan 그대로 (Step 2에서 가져온 `NNN_slug` 값)

### Step 4 — TASK 번호 결정 + 결정적 슬러그 + SSoT 안전망

#### 4.1 TASK 번호는 Step 6 `fork`가 채번

TASK-NNN은 **여기서 미리 계산하지 않는다.** 번호 읽기와 워크트리·브랜치 생성을 분리하면 병렬 task-init이 같은 번호를 읽는 레이스(TOCTOU)가 난다. 채번은 Step 6 `npx @angar2/taskery fork`가 **init 락 안에서 생성과 한 덩어리로** 수행한다 (읽기 직후 분기까지 원자 실행 → 동시 호출은 늘어난 번호를 봄). 확정 번호(`nnn`)는 fork 반환 JSON에서 받는다.

#### 4.2 메타 가져오기 (BL/RM)

- BL: `npx @angar2/taskery backlog-get BL-NNN` → 항목 메타 JSON `{ blId, status, type, title, slug, summary, target, taskNums }` (활성 plan BACKLOG.md 파싱을 코드가 수행). 항목 없으면 exit 1 → 사용자 보고 + 중단. 개요 / 대상 영역 → task.md §1 Requirements 초안에 자동 복사 (얕은 분석이 task 문서 시작점)
- RM: `$MAIN_WT/.project/plans/<활성 plan>/ROADMAP.md` Read → `RM-NNN` grep → 항목 메타 파싱
- DR: 사용자 발화에서 주제 그대로

#### 4.2.5 이미 `[x]` BL 재진행 케이스

`backlog-get` 결과 `status === 'checked'`이고 `taskNums` 비어 있지 않을 때:
- 사용자 호출 + 결정: *"BL-NNN은 ${taskNums}로 이미 처리된 적 있어. 새 task로 다시 진행할까?"*
- 사용자 OK → 새 TASK-NNN 진행. §7.5 (BL 확인 마킹) 단계에서 `- TASK:` 줄에 콤마로 추가 (덮어쓰기 X)
- 사용자 X → task-init 중단

#### 4.3 결정적 슬러그 산출

- BL/RM: BACKLOG/ROADMAP에 박힌 슬러그 그대로 사용 (`backlog-get` 결과의 `slug` 필드). task-init이 별도 변환 X — 재현성 보장
- DR: 사용자 작명 또는 메시지에서 자동 산출 후 confirm
- 한국어 → 영어 kebab-case. 짧고 명확하게 (3 단어 이내 권장).
- 같은 항목이면 같은 슬러그 → 같은 브랜치명 → git이 동시 분기 자동 거부 (race 차단 1층).

#### 4.4 SSoT 안전망 (fork가 락 안에서 수행)

같은 출처(BL-NNN/RM-NNN)가 이미 *진행중*이면 분기를 거부하는 안전망은 **Step 6 `fork`가 init 락 안에서 권위적으로 수행**한다 (채번과 동일 임계구역 → 별도 racy 중복검사 불필요). 진행중이면 fork가 *"BL-003 이미 진행중 (…브랜치)"* 로 실패하고, 스킬은 그 메시지로 중단 + 사용자 알림. DR은 별도 ID가 없어 본 검사 제외.

### Step 5 — 파일 vs 폴더 결정 + 브랜치명 산출

1. 파일 vs 폴더 분기 (기존 룰 유지):
   - **파일 default**: 단일 `NNN_<slug>.md`.
   - **폴더 승격 조건**: *사용자 명시* 시에만 (*"폴더로 만들어줘"* 류). 규모 large·추가 자료 다수여도 자동 승격하지 않는다 — 기본은 항상 단일 파일. 기능 자체는 유지(사용자가 원하면 그대로 사용).
   - **spec-diffs / screenshots / mockup은 `<NNN_slug>` 공통** — 단일/폴더 모두 `.project/tasks/<NNN_slug>/{spec-diffs,screenshots,mockup}/`에 위치. (TASK_DOC_RULE §1.5)
2. 브랜치명 산출 (멀티세션 형식):
   ```
   {타입}/{개발자}_TASK-NNN_{출처}_{슬러그}
   예: feature/claude_TASK-007_BL-003_login-feature
       bug/angar2_TASK-012_DR_mobile-form-refresh
   ```
   - **타입**: feature → `feature`, bug → `bug`, improvement → `improve`, refactor → `refactor`, docs → `docs`, chore → `chore`
   - **개발자**: 메인 세션 = `claude`, 사용자 세션 = `angar2` 등
   - **NNN은 Step 6 `fork`가 확정** — confirm 시점엔 미정(`TASK-???`). 분기 전 번호 못 박기는 병렬 레이스 차단의 귀결.
3. 사용자에게 브랜치 구성요소(`{타입}/{개발자}_TASK-???_{출처}_{슬러그}`) + 파일/폴더 confirm. 확정 NNN은 fork 후 §8에서 보고.

### Step 6 — 워크트리 분기 (`fork` — 채번+생성 원자 실행)

`npx @angar2/taskery fork <타입> <개발자> <출처> <슬러그>` 한 번으로 **채번 → 워크트리·브랜치 생성**을 init 락 안에서 원자 실행한다 (Step 4.1 채번 + 본 단계 생성이 한 임계구역 → 병렬 task-init 번호 충돌 차단).

```sh
npx @angar2/taskery fork "$TYPE" "$DEV" "$SRC" "$SLUG"
# 예: npx @angar2/taskery fork feature claude BL-003 login-feature
```

- 성공 시 결과 JSON 한 줄 출력 — `{ "taskNum", "nnn", "branch", "wtPath", "projectId" }`. 이후 단계(§7 문서 / §7.5 BL 마킹 / §8 보고)는 이 반환값의 `nnn` · `branch` · `wtPath`를 사용한다.
- fork가 락 안에서 함께 수행: 채번(TOCTOU 차단) + SSoT 안전망(§4.4) + 동일 브랜치명 거부(git — 같은 항목 동시 분기 차단).
- fork 비정상 종료(exit 1) 시 stderr 메시지(*"… 이미 진행중"* / *"… 정책 위배"* 등)를 그대로 사용자에게 보고 + 중단.

### Step 7 — task 문서 위치 결정 + 빈 골격 작성

`.gitignore` 케이스 분기 — task 문서를 *메인 워크트리에 직접 작성* vs *워크트리 안에 작성*:

```sh
git -C "$MAIN_WT" check-ignore -q "$MAIN_WT/.project/dummy"
```

| 결과 | 케이스 | 작성 위치 |
|------|--------|----------|
| exit 0 | **등록됨** (퍼블릭 리포 default) | **메인 워크트리** (`$MAIN_WT/.project/tasks/<NNN_slug>/`) — proper-lockfile로 안전 쓰기. 멀티세션 공유 단일 소스. dev untracked (git 자동 무시) |
| exit 1 | **미등록** | **워크트리 안** (`$WT_PATH/.project/tasks/<NNN_slug>/`) — 워크트리 커밋 + 머지 시 dev에 반영 |

빈 골격 형식 (TASK_DOC_RULE §1.3 참조):

```markdown
# TASK-<NNN> — <한국어 제목>

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| <YYYY-MM-DD> | <NNN_slug> | <유형> | <규모> | draft |

## Requirements

(사용자 요구 + 메인 증폭 — `/task-plan`에서 채움)

## Scope

(영향 범위 — `/task-plan`에서 채움)

## Dev Plan

(Phase 1, 2, ... — `/task-plan`에서 채움)

## Test Plan

(테스트 방법 + 검증 명령 — `/task-plan`에서 채움)

## Result

(진행 + 테스트 결과 — `/task-dev`, `/task-test`에서 채움)
```

- 6 섹션 placeholder는 *빈 헤딩 + 한 줄 안내*. 구체 내용 X.
- 폴더 승격 시 `TASK-<NNN>_<slug>/task.md`로 동일 본문 작성.

### Step 7.5 — BL 출처 BACKLOG.md 확인 마킹 (BL일 때만)

§4 출처 결정에서 *BL*이 선택된 경우만 실행. RM/DR은 skip.

`npx @angar2/taskery backlog-mark BL-NNN TASK-NNN` 한 줄 (TASK-NNN = Step 6 fork 반환 `nnn`).

`[ ] → [x]` 체크박스 치환 + `- TASK: TASK-NNN` 마크 추가(이미 있으면 콤마 누적 `TASK-007, TASK-012`, 덮어쓰기 X)를 `withMetaLock` 안에서 코드가 원자 처리한다.

`[x]` 의미: *"이 항목은 task로 옮겼다"*. **dev 머지 완료 의미 X**. 완료 추적은 `git log dev --grep 'BL-NNN'` + 브랜치명 + `npx @angar2/taskery status`.

> §4.2.5 (이미 `[x]` BL 재진행 케이스)에서 사용자 OK 받은 경우만 본 단계 진입. 사용자 X로 중단된 경우 본 Step 7.5도 skip.

### Step 8 — 결과 보고

`<NNN>` · `<WT_PATH>` · `<BRANCH>`는 Step 6 fork 반환 JSON의 `nnn` · `wtPath` · `branch` 값으로 채운다.

```
✅ TASK-<NNN> 생성 완료
- 워크트리: <WT_PATH>
- 브랜치: <BRANCH>
- task 문서: <TASK_DOC_PATH> (메인 워크트리 / 워크트리 안 — 위 케이스에 따라)
- 헤더: <생성일> / <NNN_slug> / <유형> / <규모> / draft
- BL 마킹: BL-<NNN> [x] (BL 출처 시. RM/DR이면 생략)
- 다음: /task-plan TASK-<NNN> 으로 기획 채우기 (워크트리 폴더에서 새 세션 열어 진행 / 메인 세션 그대로 진행 / 메인이 서브 세션 spawn 등 운영 모델 자유)
```

## 도구 가이드

- **Bash**: 메인 워크트리 검출 / 사전 검증 / `npx @angar2/taskery fork` 호출(채번+워크트리·브랜치 생성) / `backlog-get`(BL 메타) · `backlog-mark`(BL 확인 마킹) 호출 / 결과 JSON 파싱
- **Read**: `$MAIN_WT/.project/AGENT-GUIDE.md` / `$MAIN_WT/.project/tasks/<활성 plan>/BACKLOG.md` / `$MAIN_WT/.project/plans/<활성 plan>/ROADMAP.md`
- **Write**: task.md 빈 골격 작성 (위치는 .gitignore 케이스에 따라)
- **AskUserQuestion**: 분기 2 인터뷰 (한 번에 한 질문)

## 주의사항

- **워크트리 생성 + task 문서 작성만 담당** — 본문 채우기 금지. Requirements / Scope / Dev Plan / Test Plan 본문은 *반드시* `/task-plan`에서.
- **단계 경계 — 허용/금지 명시 (stash FRICTION_LOG #11 반영)**:
  - **허용 (화이트리스트)**: `$MAIN_WT/.project/plans/<활성 plan>/ROADMAP.md` §4(다음 작업 영역) 확인 / SSoT 조회 / `fork` 호출(채번+분기) / 빈 골격 Write
  - **금지 (블랙리스트)**: ARCHITECTURE.md / API-SPEC.md / FEATURES.md 등 `.project/` 루트 제품 관통 문서 본문 Read / 도메인 코드 Read · Grep / 기존 task 본문 Read
  - 본문 정보 수집은 *다음 단계 `/task-plan`*에서 수행.
- **자동 추정 진행 X** — 직전 맥락 명확해도 *제안 + 사용자 OK* 거친 후 워크트리/파일 생성.
- **상태는 `draft` 고정** — `/task-init` 끝의 상태는 `draft` 외 작성 금지.
- **NNN 충돌 회피** — `fork`가 init 락 안에서 채번(진행중 ∪ dev 머지 히스토리 최대+1)과 워크트리 생성을 원자 실행 (병렬 task-init도 안전).
- **slug 한국어 잔존 X** — 영어 kebab-case로 변환.
- **헤더 5컬럼 모두 채움** — *"미정"* placeholder 작성 금지.
- **메인 워크트리 검출 실패 시 즉시 중단** — git 버전 / 정책 위배 / dev 부재 등 안전망. 묵묵히 진행 X.
- **race 발생 시 사용자 호출** — `fork` 실패(같은 브랜치명 / 같은 출처 진행중) → stderr 메시지 그대로 사용자에게 *"다른 세션이 같은 항목 진행 중"* 알림 + 중단.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| (없음 — 신규 생성) | `draft` |

## 멀티세션 정합

- **다른 세션 진행중 태스크** = SSoT (git branch --no-merged) 단일 진실 소스
- **워크트리 정리**: 본 스킬은 *생성*만. 제거는 `/task-close` 또는 `npx @angar2/taskery prune`
- **머지 락**: 본 스킬은 머지 안 함 — 락 불필요
- **충돌 자체 해결**: 본 스킬 영역 X — `/task-close`에서 처리
