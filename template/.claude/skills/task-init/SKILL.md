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

1. `$MAIN_WT/.project/AGENT-GUIDE.md` Read → *활성 plan 버전* 추출 (예: `v1.0`).
2. AGENT-GUIDE.md 없거나 활성 버전 누락 시 → 사용자에게 *"활성 plan 버전이 없는데 `/plan-init` 먼저 실행할까요?"* 묻고 중단.
3. `$MAIN_WT/.project/plans/<vX.X>/` 디렉토리 존재 확인. 없으면 동일하게 `/plan-init` 안내 + 중단.

### Step 3 — 분기 판단 + 메타 수집

직전 대화 정독:
- 작업 주제 / 유형 / 출처 / 규모 추정 가능?
  - **추정 가능** → 분기 1 (제안):
    *"직전 맥락 보니 다음 task 만들까요? 주제: <X> / 유형: <Y> / 출처: <Z> / 규모: <W> / 플랜: <vX.X>. 어떠세요?"*
    사용자 답 — *"OK"* / *"규모는 large야"* / *"유형은 bug야"* 등 부분 수정 받음.
  - **추정 불가** → 분기 2 (인터뷰): 한 번에 한 질문씩.
    - Q1: *"무슨 작업인가요? (한 줄로)"*
    - Q2: *"유형? (feature / bug / improvement / refactor / docs / chore)"*
    - Q3: *"출처? (백로그 BL-NNN / 로드맵 RM-NNN / 직접 요구사항 DR)"*
    - Q4: *"규모? (micro / small / medium / large) — 잘 모르겠으면 추정 알려드림."*
    - (필요 시) Q5: *"플랜 버전 `<vX.X>` 맞나요?"*

수집 항목 (모두 확정되어야 진행):
- 주제 (한국어 — kebab-slug 변환은 Step 4)
- 유형: `feature` / `bug` / `improvement` / `refactor` / `docs` / `chore`
- 출처: `BL-NNN` / `RM-NNN` / `DR`
- 규모: `micro` / `small` / `medium` / `large`
- 플랜 버전: 활성 버전 그대로 (Step 2에서 가져온 값)

### Step 4 — TASK 번호 결정 + 결정적 슬러그 + SSoT 안전망

#### 4.1 다음 TASK-NNN 계산

`bin/lib.js` `getNextTaskNumber(MAIN_WT)` 호출. 내부 동작:
```sh
# 진행중 (SSoT)
A=$(git -C "$MAIN_WT" branch --no-merged dev --list \
    'feature/*_TASK-*' 'bug/*_TASK-*' 'improve/*_TASK-*' \
    'refactor/*_TASK-*' 'docs/*_TASK-*' 'chore/*_TASK-*' \
    | grep -oE 'TASK-[0-9]+')
# dev 머지 히스토리
B=$(git -C "$MAIN_WT" log dev --grep='TASK-[0-9]\+' --extended-regexp --oneline \
    | grep -oE 'TASK-[0-9]+')
# 합집합 최대 + 1
MAX=$( (echo "$A"; echo "$B") | sort -uV | tail -1 | sed 's/TASK-//')
NEXT=$((MAX + 1))
```
- 3자리 zero-padded (`001`, `015`, `120`).
- 합집합 비어 있으면 `001`.

#### 4.2 메타 가져오기 (BL/RM)

- BL: `$MAIN_WT/.project/tasks/<활성버전>/BACKLOG.md` Read → `BL-NNN` 블록 파싱 → `{ status, type, title, slug, summary, target, taskNums }` (활성 버전은 `AGENT-GUIDE.md`에서 검출. `bin/lib.js`의 `parseBacklogItem(mainWtPath, blId)` 호출 권장). 개요 / 대상 영역 → task.md §1 Requirements 초안에 자동 복사 (얕은 분석이 task 문서 시작점)
- RM: `$MAIN_WT/.project/plans/<활성버전>/ROADMAP.md` Read → `RM-NNN` grep → 항목 메타 파싱
- DR: 사용자 발화에서 주제 그대로

#### 4.2.5 이미 `[x]` BL 재진행 케이스

`parseBacklogItem` 결과 `status === 'checked'`이고 `taskNums` 비어 있지 않을 때:
- 사용자 호출 + 결정: *"BL-NNN은 ${taskNums}로 이미 처리된 적 있어. 새 task로 다시 진행할까?"*
- 사용자 OK → 새 TASK-NNN 진행. §7.5 (BL 확인 마킹) 단계에서 `- TASK:` 줄에 콤마로 추가 (덮어쓰기 X)
- 사용자 X → task-init 중단

#### 4.3 결정적 슬러그 산출

- BL/RM: BACKLOG/ROADMAP에 박힌 슬러그 그대로 사용 (`parseBacklogItem` 결과의 `slug` 필드). task-init이 별도 변환 X — 재현성 보장
- DR: 사용자 작명 또는 메시지에서 자동 산출 후 confirm
- 한국어 → 영어 kebab-case. 짧고 명확하게 (3 단어 이내 권장).
- 같은 항목이면 같은 슬러그 → 같은 브랜치명 → git이 동시 분기 자동 거부 (race 차단 1층).

#### 4.4 SSoT 안전망 (race 차단 2층)

```sh
git -C "$MAIN_WT" branch --no-merged dev --list \
  'feature/*_TASK-*' 'bug/*_TASK-*' 'improve/*_TASK-*' \
  'refactor/*_TASK-*' 'docs/*_TASK-*' 'chore/*_TASK-*' \
  | grep -E "_${SRC}_"
```
- BL-NNN/RM-NNN이 *진행중*에 있으면 → 중단 + 사용자 알림 (*"BL-003은 이미 X 세션에서 진행 중"*).
- DR은 본 안전망 검사 X (별도 ID 없음).

### Step 5 — 파일 vs 폴더 결정 + 브랜치명 산출

1. 파일 vs 폴더 분기 (기존 룰 유지):
   - **파일 default**: 단일 `NNN_<slug>.md`.
   - **폴더 승격 조건**: (a) 규모 `large`, 또는 (b) 사용자 명시 *"폴더로 만들어줘"*, 또는 (c) task에 *추가 자료* 다수 예상.
   - **spec-diffs / screenshots / mockup은 vX.X 공통** — 단일/폴더 모두 `.project/tasks/<vX.X>/{spec-diffs,screenshots,mockup}/`에 위치. (TASK_DOC_RULE §1.5)
2. 브랜치명 산출 (멀티세션 형식):
   ```
   {타입}/{개발자}_TASK-NNN_{출처}_{슬러그}
   예: feature/claude_TASK-007_BL-003_login-feature
       bug/angar2_TASK-012_DR_mobile-form-refresh
   ```
   - **타입**: feature → `feature`, bug → `bug`, improvement → `improve`, refactor → `refactor`, docs → `docs`, chore → `chore`
   - **개발자**: 메인 세션 = `claude`, 사용자 세션 = `angar2` 등
3. 사용자에게 브랜치명 + 파일/폴더 confirm.

### Step 6 — 워크트리 생성

```sh
PROJECT_ID=$(jq -r '.projectId' "$MAIN_WT/.taskery-manifest.json")
WORKTREES_ROOT="$HOME/.taskery/worktrees/$PROJECT_ID"
WT_PATH="$WORKTREES_ROOT/TASK-${NNN}_${SRC}_${SLUG}"
mkdir -p "$WORKTREES_ROOT"
git -C "$MAIN_WT" worktree add "$WT_PATH" -b "$BRANCH" dev
```

- git이 동일 브랜치명 자동 거부 (race 차단 1층).
- 동시 충돌 시 *"브랜치 이미 존재 — 다른 세션이 같은 항목 진행 중"* 보고 + 중단.

### Step 7 — task 문서 위치 결정 + 빈 골격 작성

`.gitignore` 케이스 분기 — task 문서를 *메인 워크트리에 직접 작성* vs *워크트리 안에 작성*:

```sh
git -C "$MAIN_WT" check-ignore -q "$MAIN_WT/.project/dummy"
```

| 결과 | 케이스 | 작성 위치 |
|------|--------|----------|
| exit 0 | **등록됨** (퍼블릭 리포 default) | **메인 워크트리** (`$MAIN_WT/.project/tasks/<vX.X>/`) — proper-lockfile로 안전 쓰기. 멀티세션 공유 단일 소스. dev untracked (git 자동 무시) |
| exit 1 | **미등록** | **워크트리 안** (`$WT_PATH/.project/tasks/<vX.X>/`) — 워크트리 커밋 + 머지 시 dev에 반영 |

빈 골격 형식 (TASK_DOC_RULE §1.3 참조):

```markdown
# TASK-<NNN> — <한국어 제목>

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| <YYYY-MM-DD> | <vX.X> | <유형> | <규모> | draft |

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

`bin/lib.js`의 `markBacklogChecked(mainWtPath, blId, taskNum)` 호출.

내부 흐름 (`withMetaLock` 안에서 원자성 보장):
1. 첫 줄 패턴 `- [ ] **BL-NNN**` → `- [x] **BL-NNN**`로 4번째 글자(체크박스) 치환
2. 같은 BL 블록 끝 (다음 `- ` 헤드 또는 파일 끝 직전, 빈 줄 건너뛴 위치) 에 `  - TASK: TASK-NNN` 한 줄 append
3. 이미 `  - TASK:` 줄 있으면 → 콤마로 추가 (`TASK-007, TASK-012`. 덮어쓰기 X)

`[x]` 의미: *"이 항목은 task로 옮겼다"*. **dev 머지 완료 의미 X**. 완료 추적은 `git log dev --grep 'BL-NNN'` + 브랜치명 + `npx @angar2/taskery status`.

> §4.2.5 (이미 `[x]` BL 재진행 케이스)에서 사용자 OK 받은 경우만 본 단계 진입. 사용자 X로 중단된 경우 본 Step 7.5도 skip.

### Step 8 — 결과 보고

```
✅ TASK-<NNN> 생성 완료
- 워크트리: <WT_PATH>
- 브랜치: <BRANCH>
- task 문서: <TASK_DOC_PATH> (메인 워크트리 / 워크트리 안 — 위 케이스에 따라)
- 헤더: <생성일> / <vX.X> / <유형> / <규모> / draft
- BL 마킹: BL-<NNN> [x] (BL 출처 시. RM/DR이면 생략)
- 다음: 워크트리 폴더에서 새 세션 열기 → /task-plan TASK-<NNN> 으로 기획 채우기
```

## 도구 가이드

- **Bash**: 메인 워크트리 검출 / 사전 검증 / `git worktree add` / SSoT 조회 / TASK-NNN 계산
- **Read**: `$MAIN_WT/.project/AGENT-GUIDE.md` / `$MAIN_WT/.project/tasks/<활성버전>/BACKLOG.md` / `$MAIN_WT/.project/plans/<활성버전>/ROADMAP.md`
- **Write**: task.md 빈 골격 작성 (위치는 .gitignore 케이스에 따라)
- **AskUserQuestion**: 분기 2 인터뷰 (한 번에 한 질문)

## 주의사항

- **워크트리 생성 + task 문서 작성만 담당** — 본문 채우기 금지. Requirements / Scope / Dev Plan / Test Plan 본문은 *반드시* `/task-plan`에서.
- **단계 경계 — 허용/금지 명시 (stash FRICTION_LOG #11 반영)**:
  - **허용 (화이트리스트)**: `$MAIN_WT/.project/plans/<활성버전>/ROADMAP.md` §4(다음 작업 영역) 확인 / SSoT 조회 / TASK-NNN 계산 / 빈 골격 Write
  - **금지 (블랙리스트)**: ARCHITECTURE.md / API-SPEC.md / FEATURES.md 등 9 기획 문서 본문 Read / 도메인 코드 Read · Grep / 기존 task 본문 Read
  - 본문 정보 수집은 *다음 단계 `/task-plan`*에서 수행.
- **자동 추정 진행 X** — 직전 맥락 명확해도 *제안 + 사용자 OK* 거친 후 워크트리/파일 생성.
- **상태는 `draft` 고정** — `/task-init` 끝의 상태는 `draft` 외 작성 금지.
- **NNN 충돌 회피** — SSoT 조회로 진행중 + dev 머지 히스토리 합집합 확인.
- **slug 한국어 잔존 X** — 영어 kebab-case로 변환.
- **헤더 5컬럼 모두 채움** — *"미정"* placeholder 작성 금지.
- **메인 워크트리 검출 실패 시 즉시 중단** — git 버전 / 정책 위배 / dev 부재 등 안전망. 묵묵히 진행 X.
- **race 발생 시 사용자 호출** — `git worktree add` 실패(같은 브랜치명) → SSoT 재조회 + 사용자에게 *"X 세션이 같은 항목 진행 중"* 알림.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| (없음 — 신규 생성) | `draft` |

## 멀티세션 정합

- **다른 세션 진행중 태스크** = SSoT (git branch --no-merged) 단일 진실 소스
- **워크트리 정리**: 본 스킬은 *생성*만. 제거는 `/task-close` 또는 `npx @angar2/taskery prune`
- **머지 락**: 본 스킬은 머지 안 함 — 락 불필요
- **충돌 자체 해결**: 본 스킬 영역 X — `/task-close`에서 처리
