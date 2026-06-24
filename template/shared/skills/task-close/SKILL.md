---
name: task-close
description: task git 마무리 — 검증 게이트 + 커밋 순서 + 머지 락 직렬화 + dev --no-ff 병합 + 워크트리/브랜치 자동 정리, tested → closed (멀티세션 0.1.2+)
---

# /task-close

## 개요

`tested` 상태 task의 git 마무리. **호출 위치 자유** — 워크트리 cwd / 메인 워크트리 cwd / 다른 세션이 호출한 서브 세션 모두 동작 동일 (모든 git 명령이 `git -C <경로>` 형태라 cwd 무관). 사전 rebase → 충돌 해결 (3단계 에스컬레이션) → 머지 락 → 락 안 재 rebase → dev `--no-ff` 머지 → 워크트리 제거 + 작업 브랜치 자동 삭제.

**최종 게이트**: 모든 검증 명령 재실행 — 린트/타입체크/빌드 PASS여야 진행.

## 호출 시점

- `/task-test` PASS 후 + 사용자 OK.
- `/task-test` FAIL 후 사용자 *"OK 마무리"* (알려진 결함 명시 채로).

## 호출 위치 정책

- **호출 위치 자유** — 운영 모델에 따라 다양:
  - *멀티세션 병렬* (system default) — 각 워크트리에 새 메인 세션 열어 그 세션이 본 스킬 호출
  - *단일 메인 지휘* — 메인 cwd 세션 1개가 모든 task 호출 (서브 세션 X)
  - *메인이 서브 세션 호출 병렬* — 메인이 다른 세션 spawn해서 각 task 진행
- **호출 분기**:
  - 인자 명시 (`TASK-NNN`) → 해당 워크트리 컨텍스트로 진입 (`$WT_PATH = ~/.taskery/worktrees/<projectId>/TASK-NNN_<...>/`).
  - 인자 없음 → 워크트리 cwd면 *그 워크트리의 태스크* 자동 / 메인 cwd면 진행중 태스크 (status=tested) 인터뷰 + 사용자 선택.
- **cwd 무관 동작** — 본 SKILL의 모든 git 명령이 `git -C "$WT_PATH" ...` / `git -C "$MAIN_WT" ...` 형태라 어느 cwd에서 호출되든 결과 동일.
- **내부 git 명령 형태 강제** (메인 cwd 호출 시 git-guard 오판 + 변형 우회 방지):
  - 본 SKILL의 모든 git 명령은 *`git -C <경로> ...` 형태로만 발행*.
  - 셸 prefix(`cd <경로> && git ...` / `(cd <경로> && git ...)`) **영구 금지** — git-guard.sh가 변형 인식 X (catastrophic 우회 위험).
  - `--git-dir=` / `--work-tree=` 변형 **영구 금지** — 가독성 ↓, 다른 워크트리 조작 혼동.
  - 근거: stash FRICTION_LOG 2026-06-01 — 메인 cwd 세션에서 워크트리 브랜치 커밋이 git-guard에 dev 직접 커밋으로 오인 차단된 마찰.

## 입력 처리

인자 = (선택) `TASK-NNN` 또는 자동 선택.

분기:
- **인자 명시**: 해당 task.
- **인자 없음**: 워크트리에서 호출 시 *그 워크트리의 태스크* 자동 / 메인에서 호출 시 *상태=tested 가장 최근 task* 인터뷰.

## 핵심 변수

```sh
MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
WT_PATH=$(pwd)  # 워크트리 cwd 호출 시. 메인 cwd / 서브 세션 호출 시 인자 또는 인터뷰 결과로 결정
PROJECT_ID=$(jq -r '.projectId' "$MAIN_WT/.taskery-manifest.json")
BRANCH=$(git -C "$WT_PATH" rev-parse --abbrev-ref HEAD)
LOCK_TIMEOUT_MS=$(jq -r '.lock_timeout_ms // 30000' "$MAIN_WT/.taskery-manifest.json")
LOCK_FILE="$HOME/.taskery/${PROJECT_ID}.merge.lock"
```

## 단계

### Step 1 — 사전 검증

1. **메인 워크트리 검출** (위 핵심 변수).
2. **메인 워크트리 = dev 검증**:
   ```sh
   CURRENT=$(git -C "$MAIN_WT" rev-parse --abbrev-ref HEAD)
   [ "$CURRENT" = "dev" ] || abort "메인 워크트리가 dev 아님 (현재: $CURRENT). taskery 정책 위배"
   ```
3. **워크트리 미커밋 변경 확인**:
   ```sh
   git -C "$WT_PATH" status --porcelain
   ```
   - 결과 *있음* = 정상 흐름 (taskery 정책: `/task-dev` = *git 작업 X*). 본 변경분은 Step 6-3에서 *task-close가 자동 Phase 커밋 생성*으로 처리.
   - 결과 *없음* = 변경분 0건 → Step 2 검증만 수행 후 Step 6-3 자동 커밋 단계 스킵. **단 6-7까지 거쳐도 워크트리 브랜치가 dev보다 앞선 커밋이 0개면 Step 6-8에서 추적 마커 빈커밋 1개 생성** (`.project` gitignore + docs/분석 전용 task → 채번 보존).
   - **차단 X** — 본 단계는 *상태 인지*용. close 중단 사유 X.
4. **task 파일 + GIT_RULE 확인**:
   - task 문서 위치 분기 (`.gitignore` 케이스):
     ```sh
     git -C "$MAIN_WT" check-ignore -q "$MAIN_WT/.project/dummy"
     ```
     - exit 0 (등록됨): `$MAIN_WT/.project/tasks/<vX.X>/...` (단일 소스)
     - exit 1 (미등록): `$WT_PATH/.project/tasks/<vX.X>/...` (워크트리 안)
   - 상태 = `tested` 검증. 그 외면 종료 (단 알려진 결함 *"OK 마무리"*는 status=tested로 명시되어 있어야 함).
   - GIT_RULE Read 우선순위:
     - `$MAIN_WT/.project/rules/GIT_RULE.md` (프로젝트별 — 우선)
     - `~/.claude/rules/GIT_RULE.md` (글로벌)
     둘 다 없으면 종료 + *"GIT_RULE 누락"* 보고.

### Step 2 — 최종 검증 명령 재실행 (게이트)

`$MAIN_WT/CLAUDE.md`의 `## 검증 명령` (빌드/린트/타입체크) 만 재실행. **하나라도 FAIL이면 close 차단**.

| 명령 | 결과 |
|------|------|
| 린트 | exit 0 + 에러 0 |
| 타입체크 | exit 0 |
| 빌드 | exit 0 |

> 테스트 명령은 본 게이트에서 실행 X. `/task-test` 격리 세션이 단일 시점 (stash FRICTION_LOG #25).

> **검증 명령 실행 위치**: 워크트리(`$WT_PATH`)에서. 코드 변경은 워크트리 안에 있으므로 검증 대상도 거기.

FAIL 시:
- 사용자에게 보고 — *"검증 명령 X가 FAIL. 어떻게 할까?"*
- 분기:
  - *"고쳐"* → status `developing`으로 되돌림 + `/task-dev` 안내 + close 중단.
  - *"OK 마무리"* → 결함 명시한 채 진행 (Result 섹션에 *"검증 명령 X FAIL 알려진 결함 — 사유: ..."* 추가).

### Step 3 — 사전 rebase (락 외, UX용 조기 충돌 감지)

```sh
git -C "$WT_PATH" rebase dev
```

- 충돌 없음 → Step 6으로 (커밋 순서).
- 충돌 있음 → Step 4 (3단계 에스컬레이션).

### Step 4 — 충돌 자체 해결 (3단계 에스컬레이션)

#### 4-a. 단순 충돌 → 자동 해결

- 공백 / 의미 같은 코드 차이 / 주석 / 명백한 add-add
- 자동 해결 후 `git -C "$WT_PATH" rebase --continue`

#### 4-b. 의미적 충돌 → 자료 분석

**자료 우선순위**:

| 순위 | 자료 | 위치 |
|------|------|------|
| 1 | 태스크 문서 + plan 문서 (양쪽 정독 후 의도 종합) | 태스크: `$MAIN_WT/.project/tasks/<vX.X>/...` (등록 케이스) / `~/.taskery/worktrees/<projectId>/TASK-...` 다른 워크트리 (미등록 케이스, SSoT 조회로 경로 산출). plan: `$MAIN_WT/.project/plans/<vX.X>/` (ROADMAP / FEATURES / ARCHITECTURE / TECH-STACK 등) |
| 2 | 커밋 메시지 | `git log dev --grep` (GIT_RULE 풍부 메시지) |
| 3 | diff | 변경 코드 자체 |

- 1순위 부재 시 2/3순위 자동 fallback + 사용자에게 *자료 한계* 보고
- 태스크 문서 = 본 task의 *세부 의도* / plan 문서 = *전체 의도* (Stage 순 / 의존 그래프 / 의도된 위치 분리). 충돌 영역의 *그림 전체*는 plan 문서가 더 명확한 경우 많음 (Stage 순서로 *먼저 머지된 쪽 다음 줄에 추가* 등)
- 정독 후 *의미 의도 추출* → 충돌 해결 → `git rebase --continue`

#### 4-c. 판단 불가 → 사용자 호출

- 해결 방향 후보 제시 + 사용자 결정 후 재개.
- 사용자가 중단 결정 시: `git -C "$WT_PATH" rebase --abort` 자동 + close 중단.

### Step 5 — 태스크 문서에 충돌 해결 내역 추가 (해당 시)

충돌 해결 1건이라도 발생했으면 task 문서에 기록.

`.gitignore` 케이스 분기:

| 케이스 | 위치 | 흐름 |
|--------|------|------|
| 미등록 | `$WT_PATH/.project/tasks/<vX.X>/...` | 워크트리 안 task 문서 수정 → Step 6 Phase 커밋에 *코드 + 문서 = 한 커밋*에 포함 |
| 등록 | `$MAIN_WT/.project/tasks/<vX.X>/...` | 워크트리 안 코드만 한 커밋 + 메인 워크트리 절대 경로 task 문서를 **proper-lockfile**로 별도 수정 (`bin/lib.js` `withMetaLock` — 머지 커밋 미포함, 메인 로컬 보존) |

기록 형식 (task.md Result 섹션 안):
```markdown
### 충돌 해결 (close 직전 rebase)
- 자료 우선순위: 태스크 문서 (다른 세션 TASK-XXX) / 커밋 메시지 / diff
- 자료 한계 보고: (있으면 명시)
- 해결 방향: <한 줄 요약>
- 영향 파일: <목록>
```

### Step 6 — 머지 락 획득 + 락 안 재 rebase + 커밋 시퀀스

#### 6-1. 머지 락 획득

`bin/lib.js` `withMergeLock(projectId, fn, opts)` 호출. 내부 동작:

```js
// proper-lockfile
await lockfile.lock(LOCK_FILE, {
  stale: LOCK_TIMEOUT_MS,
  retries: { retries: 5, factor: 1, minTimeout: 1000, maxTimeout: 1000 },
});
```

재시도 모두 실패 시 → 사용자 보고 + 중단.

#### 6-2. 락 안에서 rebase 재실행

```sh
git -C "$WT_PATH" rebase dev
```

락 외 rebase 이후 *다른 세션이 dev 머지했을 수 있음* — 락 안 rebase로 흡수.
- 재충돌 발견 시 Step 4 에스컬레이션 재실행 + Step 5 문서 기록 재실행.

#### 6-3. Phase 기능 커밋 (Dev Plan 각 Phase마다 1개 — task-close가 자동 생성)

> **책임 영역**: taskery 정책상 `/task-dev` = *git 작업 X* (워크트리 코드만 수정). 본 단계가 *task-close가 uncommitted 변경분 정독 → task.md `## Dev Plan` Phase 진행 [x] 매핑 → Phase별 commit 자동 생성*하는 단일 진입점이다.

자동 생성 절차:

1. **uncommitted 변경분 정독**:
   ```sh
   git -C "$WT_PATH" status --porcelain
   git -C "$WT_PATH" diff --name-only
   ```
2. **task.md `## Dev Plan` 정독** — Phase별 `진행: [x]` + 파일 매핑 추출.
3. **Phase ↔ 변경 파일 매핑**:
   - 한 Phase가 단독 파일 영역이면 → Phase별 1 커밋.
   - 같은 파일이 여러 Phase에 걸쳐 있으면 → *단일 통합 커밋 1개*로 묶음 (Phase 번호 표기는 *Phase X+Y*).
   - 매핑 모호 / Dev Plan 본문 추적 불가 시 → 사용자 호출 + 결정 (자동 진행 X).
- 메시지 형식 (GIT_RULE.md):
  ```
  {태그}: [TASK-<NNN>] Phase <N> - <작업 요약>

  - <처리 내용 1>
  - <처리 내용 2>
  - 사유: <변경 이유>
  ```
- 태그: feature → `feat:`, bug → `fix:`, improvement → `improve:`, refactor → `refactor:`, docs/chore → `docs:`, 테스트 → `test:`

> **GIT_RULE 풍부 메시지** — 본 메시지는 *충돌 해결 자료 2순위*로 쓰인다. 의도 한 줄 압축.

> **자동 분리 로직 코드 구현**은 본 SKILL.md 영역 외 — 메인 세션이 본 절차를 따라 *수동/대화형* 진행. 향후 `bin/lib.js`에 `splitUncommittedByPhase(wtPath, taskMd)` 영역 별도 라운드.

#### 6-4. flows/ 모듈 커밋 (해당 시)

`$WT_PATH/.project/flows/<module>.md` 변경분 있으면 별도 커밋:
```
docs: [TASK-<NNN>] flows/<module>.md 갱신
```

- **`.gitignore` 미등록 케이스 한정** — 등록 케이스는 *워크트리 외부* 메인 워크트리 직접 수정 + `withMetaLock`.

#### 6-5. task 파일 status → `closed` Edit

closed-immutable.sh hook *허용* 영역 (status=closed 적용된 *후* 재수정이 차단).

- **.gitignore 등록 케이스**: 메인 워크트리 task 문서를 `withMetaLock`으로 status=`closed` 갱신.
- **.gitignore 미등록 케이스**: 워크트리 안 task 문서를 Edit.

#### 6-6. 태스크 문서 커밋 (미등록 케이스 한정)

```
docs: [TASK-<NNN>] 태스크 문서 완료
```

- 대상: `$WT_PATH/.project/tasks/<vX.X>/<NNN>_<slug>.md` (단일) 또는 `.../TASK-<NNN>_<slug>/task.md` (폴더 승격) + spec-diffs / screenshots / mockup (vX.X 공통, TASK_DOC_RULE §1.5).
- **등록 케이스**: Step 6-5에서 메인 워크트리 직접 수정으로 처리 — 별도 커밋 X (워크트리 머지에 포함 X).

#### 6-7. CHANGELOG 커밋 (해당 시)

`$MAIN_WT/.project/rules/CHANGELOG_RULE.md` 정독 후 형식 / 위치 준수.

- 위치 분기:
  - 미등록 — 워크트리 안 `$WT_PATH/.project/changelog/<YYYY-MM>.md` 갱신 + 커밋
  - 등록 — `$MAIN_WT/.project/changelog/<YYYY-MM>.md` `withMetaLock` 갱신 (커밋 X)
- 본 task에서 변경분 없으면 본 단계 *완전히 스킵* (빈 commit 금지).

#### 6-8. 추적 마커 빈커밋 (폴백 — 머지 커밋 미생성 케이스 한정)

> **조건**: 6-3 ~ 6-7을 모두 거쳤는데도 워크트리 브랜치가 dev보다 앞선 커밋이 **0개**인 경우에만 발동.
> **발생 케이스**: `.project`가 gitignore된 프로젝트에서 *코드 변경 0 + 산출물이 메인 워크트리 직접 수정 task 문서뿐*인 docs/분석 전용 task. 워크트리에 추적 가능한 변경이 없어 6-3 ~ 6-7이 전부 스킵된 상태.
> **이유**: 이대로 Step 8 `--no-ff` 머지를 하면 브랜치가 dev와 동일 커밋이라 *Already up to date* → 머지 커밋이 생성되지 않는다. 그러면 dev 히스토리에 `TASK-NNN` 흔적이 남지 않고, 이후 작업 브랜치가 자동 삭제(Step 13)되면 `getNextTaskNumber`가 진행중 브랜치·dev 머지 양쪽에서 번호를 찾지 못해 **다음 task가 같은 번호를 재사용/충돌**한다.

```sh
if [ "$(git -C "$WT_PATH" rev-list --count dev..HEAD)" -eq 0 ]; then
  git -C "$WT_PATH" commit --allow-empty \
    -m "docs: [TASK-<NNN>] 추적 마커 — 코드 0·.project gitignore (채번 보존)"
fi
```

- 마커 커밋으로 브랜치가 dev보다 1커밋 앞서게 되어, Step 8 `--no-ff` 머지가 정상 머지 커밋을 생성한다 (머지 커밋 메시지의 브랜치명에 `TASK-NNN`이 포함되어 grep 추적 가능).
- 추적 변경이 하나라도 있는 일반 task는 조건(`-eq 0`)에 걸리지 않아 발동하지 않는다 — 기존 동작 그대로.

### Step 7 — 메인 워크트리 uncommitted 검증 (머지 직전)

```sh
git -C "$MAIN_WT" status --porcelain
```

- 변경 있으면 → 사용자 호출 + 결정 (stash / 중단).
- 등록 케이스에서 task 문서 직접 수정이 *.gitignore 차단으로 status에 안 잡힘* — 정상.

### Step 8 — dev 머지

```sh
git -C "$MAIN_WT" merge --no-ff "$BRANCH"
```

- `-m` 옵션 금지 (git 기본 메시지).
- 머지 커밋 해시 캡처: `MERGE_COMMIT=$(git -C "$MAIN_WT" rev-parse HEAD)`

### Step 9 — 머지 락 해제

`withMergeLock` 콜백 종료 시 자동 release.

### Step 10 — 마찰 신호 자체 감지 (`/log-friction` 발동 후보)

본 task 진행 중 *마찰 신호* 누적 여부를 검사. 감지 시 `/log-friction` 등록을 사용자에게 제안.

검사 항목:
- 동일 단계 재호출 ≥ 2회
- 실패 반복 (검증 명령 FAIL 2회 이상 / 격리 세션 FAIL 후 재구현 반복)
- 사용자 부정 반응 발화 누적
- **충돌 해결에서 *판단 불가 (4-c)* 1회 이상** — 멀티세션 자료 한계 신호

분기:
- 감지 신호 있음 → *"이번 task에서 X 부분이 마찰이었어 보여 — `/log-friction`으로 등록할까?"* OK 시 자동 발동.
- 없음 → prompt X.

### Step 11 — worktree remove 사전 검증

```sh
git -C "$WT_PATH" status --porcelain  # unstaged
git -C "$WT_PATH" ls-files --others --exclude-standard  # 추적 X 파일
```

- 발견 시 사용자 호출 + 결정:
  - 보존 → Step 12, 13 모두 건너뜀 (브랜치도 보존 — 정합)
  - 삭제 → Step 12 진행
  - 취소 → close 중단 (dev 머지는 이미 완료)

### Step 12 — 워크트리 제거

```sh
git -C "$MAIN_WT" worktree remove "$WT_PATH"
```

### Step 13 — 브랜치 자동 삭제 / 보존

- **보존 키워드 감지** (`keep` / `--keep-branch` / `브랜치 남겨` / `브랜치 보존` / `브랜치 유지`) → 보존 + 워크트리도 보존 (Step 11~13 건너뛴 것과 정합).
- **그 외** → `git -C "$MAIN_WT" branch -d "$BRANCH"`

### Step 14 — 안전망 출력

```
삭제됨: $BRANCH
복구: git -C "$MAIN_WT" branch $BRANCH $MERGE_COMMIT
```

### Step 15 — 결과 보고

```
✅ TASK-<NNN> closed
- 작업 브랜치: <BRANCH> (삭제 / 보존)
- 워크트리: <WT_PATH> (제거 / 보존)
- 커밋: Phase <N>개 + 태스크 문서 + (CHANGELOG)
- dev 병합: --no-ff 완료 ($MERGE_COMMIT)
- 충돌 해결: <건수, 자료 한계 보고 있으면 포함>
- 상태: tested → closed
- 다음: 새 task 시작은 /task-init. 마찰 신호 감지된 경우 /log-friction 등록 제안
```

## 도구 가이드

- **Read**: GIT_RULE / task 파일 / CLAUDE.md 검증 명령 정독
- **Bash**: git 명령 (`branch`, `rebase`, `merge`, `worktree`) + 검증 명령 재실행. **유일하게 git 사용 허가된 스킬**
- **Edit / Write**: task 파일 갱신, CHANGELOG (메타 위치는 `.gitignore` 케이스에 따라)
- **bin/lib.js**: `withMergeLock` (머지 락) / `withMetaLock` (메타 파일 쓰기 락)

## 주의사항

- **사용자 명시 호출 외 자체 진입 영구 금지** (stash FRICTION_LOG #6+10/#20) — task-close는 git 영역. 사용자가 *"X부터 Y까지"* 범위 명시했는데 Y가 close 이전 단계면 close 자체 진입 영구 X.
- **검증 명령 재실행 게이트** — `/task-dev` self-check와 *별개*. 환경 변화 / 부분 작업 잡는 안전망.
- **dev 직접 커밋 절대 X** — 작업 브랜치에서만. dev에서 `git commit` 시도 시 git-guard.sh 차단. 모든 git 명령은 cwd 무관 `git -C "$WT_PATH" ...` / `git -C "$MAIN_WT" ...` 형태 강제. 셸 prefix(`cd && git`) / `--git-dir=` / `--work-tree=` 변형 영구 금지 (§호출 위치 정책).
- **`--no-ff` 강제** — 머지 커밋 없으면 분기 정보 영구 손실.
- **머지 락 직렬화** — 두 세션이 동시 머지 시도해도 한쪽씩 순차 진행. 락 외 rebase로 race 흡수 + 락 안 재 rebase로 다른 세션 머지 흡수.
- **충돌 자체 해결 3단계** — 단순 자동 / 의미적 자료 / 판단 불가 사용자. 자료 한계 발견 시 *반드시 사용자에게 보고* (1순위 자료 부재 등).
- **자료 한계 보고** — 충돌 분석 시 *2/3순위 fallback 사용했음*을 사용자에게 명시. 묵묵히 진행 X.
- **destructive 명령 사용자 승인 필수** — `git reset --hard` / `git push --force` / `git branch -D` / `git clean -fd` 사용자 명시 승인 없이 절대 실행 X. (단 `/task-close` 자동 흐름 `git branch -d` + `worktree remove`는 §"작업 브랜치 삭제 정책 — 자동 삭제 면제 조항" 면제)
- **민감 정보 staging X** — `.env` / `credentials.json` / API key 등 staging 절대 X.
- **빈 commit 금지 (예외 1건)** — CHANGELOG 변경 없으면 6-7 단계 스킵, `--allow-empty` 사용 금지. **단 Step 6-8 추적 마커 빈커밋만 예외** — 워크트리 브랜치가 dev보다 앞선 커밋이 0개일 때 채번 보존용으로 1개 허용.
- **`-m` 옵션 머지 커밋에 사용 금지** — git 기본 메시지 사용.
- **검수 서버/터널 정리는 자기 것만** — 본 task가 검수용으로 띄운 서버·터널(자기 포트 것)만 종료. `pkill -f` 류 광역 종료 금지 (다른 세션 프로세스까지 죽임). 상세: GIT_RULE "멀티세션 검수 환경".

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| `tested` | `closed` |

(검증 명령 FAIL + 사용자 *"고쳐"* → `developing`으로 되돌림. 본 스킬 자체는 거기서 중단.)

## 멀티세션 정합

- **머지 락** — `~/.taskery/<projectId>.merge.lock` 단일. 모든 세션 직렬화.
- **task 문서 단일 진실 소스** — `.gitignore` 케이스에 따라 메인 워크트리 또는 워크트리. 다른 세션의 충돌 해결 자료 정독 시 *SSoT 조회 → 워크트리 경로 산출* (미등록 케이스) 또는 *메인 워크트리 절대 경로* (등록 케이스).
- **워크트리 + 브랜치 자동 제거** — GIT_RULE.md "작업 브랜치 삭제 정책" 면제 조항 (taskery 한정). 보존 키워드 시 양쪽 보존.
- **safety net** — Step 14 복구 명령 출력. 사용자가 잘못 삭제 인지 시 즉시 복구 가능.
- **BACKLOG.md 무관** — `.project/tasks/<vX.X>/BACKLOG.md` 체크 마킹은 `/task-init` Step 7.5가 처리(`[ ]` → `[x]` + `- TASK: TASK-NNN`). `[x]` = *task로 옮김* 의미라 close 시점에 추가 마킹 X. 완료 추적은 `npx @angar2/taskery status`(진행 중이면 dev 미머지가 정상) → 목록에 없을 때만 `git log dev --grep 'BL-NNN'` 순.
