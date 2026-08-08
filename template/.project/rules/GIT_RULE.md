# GIT_RULE

> 이 파일은 taskery 시스템 권장 프로젝트별 git 정책이다.
> 우선순위: **이 파일** (`.project/rules/GIT_RULE.md`) → 글로벌 (`~/.claude/rules/GIT_RULE.md`) → 메인 판단.
> 프로젝트별 변형이 필요하면 `.project/rules/GIT_RULE.local.md` 생성 (npx update 미터치).

---

## 기본 원칙

- **git 작업은 메인 세션이 `/task-close` 스킬 또는 직접 수행**.
- **main, dev 직접 커밋 절대 금지**: 모든 작업은 태스크 브랜치에서 진행.
- **하나의 브랜치는 하나의 태스크만 담당**.
- **작업 브랜치는 *task-init 시점의 현재 브랜치*(= 부모 브랜치)에서 분기, *task-close 시점에* 그 부모 브랜치로 병합** (멀티세션 0.1.2+ / 부모 파라미터화 0.6.0+). 부모는 `dev` 고정이 아니라 서 있는 브랜치 — 개인 기본 `dev`, 회사/로드맵 `dev_feat_x`/`master` 등. task 헤더에 기록돼 close가 그 값으로 되병합한다.
- **부모 → 상위(dev/voyager/master 등) 병합은 사용자가 직접 수행** (로컬 또는 PR). taskery는 부모까지만 병합.
- **수동 git 작업 시 정합성 보장 X** — taskery 명령(스킬 호출 / `npx @angar2/taskery <서브>`)으로만 운영. 수동 `git worktree add` / `branch` / `merge` 시 SSoT·락·자동 정리 흐름이 깨질 수 있음.

---

## 브랜치 구조

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 |
| `dev` | 통합 개발 — 개인 기본 부모 브랜치 (메인 워크트리는 *현재 부모 브랜치* 고정, dev는 그 기본값) |
| `{타입}/{개발자}_TASK-NNN_{출처}_{슬러그}` | 태스크 작업 브랜치 (멀티세션 시스템 단일 식별자) |

### 브랜치 타입

| 타입 | 태스크 유형 |
|------|-----------|
| `feature` | feature |
| `bug` | bug |
| `improve` | improvement |
| `refactor` | refactor |
| `docs` | docs |
| `chore` | chore |

### 개발자 식별자

고정 목록이 아니며 실제 작업자 이름을 사용한다.

| 작업자 | 식별자 |
|--------|--------|
| 사용자 | `angar2` |
| Claude | `claude` |
| 기타 AI | 해당 AI 이름 (예: `gpt`, `gemini`) |

### 출처 (Source — 멀티세션 0.1.2+)

| 출처 | 의미 | 채번 주체 |
|------|------|---------|
| `BL-NNN` | 백로그 항목 | `/add-backlog` 스킬 (0.1.2). plan(기능 그룹)별 `.project/tasks/<NNN_slug>/BACKLOG.md`에 누적 |
| `RM-NNN` | 로드맵 항목 | `/plan-init` (RM-NNN 채번 자동화는 후속 — 1차는 사용자 수동 명시) |
| `DR` | 직접 요구사항 (별도 ID 없음) | 사용자 발화 → `/task-init` |

### 브랜치 예시

```
feature/claude_TASK-007_BL-003_login-feature
bug/angar2_TASK-012_DR_mobile-form-refresh
refactor/claude_TASK-018_RM-002_api-cleanup
docs/claude_TASK-021_DR_readme-rewrite
```

### 케이스 2 — TASK 없는 작업 브랜치 (시스템 밖)

`TASK-NNN` 없는 작업 브랜치(`feature/claude_simple-config-fix` 등)는 *taskery 멀티세션 시스템 밖*에서 진행되는 단순/긴급 작업. SSoT 조회(`/task-init` 다음 번호 계산 / 진행중 목록)에서 자동 제외. **사용자 명시 운영 한정** — 메인 세션 자체 진입 금지.

---

## 커밋 태그

| 태그 | 용도 |
|------|------|
| `feat:` | feature |
| `fix:` | bug |
| `improve:` | improvement |
| `refactor:` | refactor |
| `docs:` | docs, chore |
| `test:` | 테스트 파일 (유형 무관) |

---

## 커밋 메시지 형식

```
{태그}: [TASK-{NNN}] Phase {N} - {작업 요약}

- {처리 내용 1}
- {처리 내용 2}
- 사유: {변경 이유}
```

### 예시

```
feat: [TASK-001] Phase 1 - 사용자 인증 로직 구현

- JWT 기반 인증 로직 구현
- 로그인 API 엔드포인트 추가
- 사유: 기존 세션 방식 한계로 전환
```

---

## 커밋 순서 (태스크 완료 시 — `/task-close` 스킬)

태스크 마무리 시 메인이 아래 순서를 반드시 준수한다.

```
1. Phase별 기능 커밋 (각 Phase마다 1개)
2. 태스크 문서 커밋
3. CHANGELOG 커밋
4. 부모 브랜치 병합 (--no-ff, 머지 락 직렬화)
5. 워크트리 자동 제거 + 작업 브랜치 자동 삭제 (멀티세션 0.1.2+ — §"작업 브랜치 삭제 정책" 면제 조항)
```

### Phase↔파일 매핑 규칙 (`close` 자동 커밋)

`close`가 코드 변경분을 Dev Plan Phase에 매핑해 Phase별 커밋을 자동 생성할 때 아래 규칙을 따른다 (한 파일 = 한 Phase가 성립하지 않는 정상 케이스의 blocked 반복 방지 — stash 6회·recordion 5회 마찰 반영):

- **한 파일이 여러 Phase에 걸치면 → 가장 이른 Phase 커밋에 편입** + 커밋 메시지에 `(Phase a·b 변경 포함)` 표기. 뒤 Phase가 앞 Phase의 타입·함수를 참조하므로 이른 쪽이 의존 방향과 일치한다.
- **Dev Plan에 없는 빌드 산출물**(`*.pbxproj` / `package-lock.json` 등 잠금파일 계열) **→ 마지막 Phase 커밋에 자동 편입** + `(빌드 산출물 자동 편입)` 표기. 산출물은 소스에 딸려 바뀌는 파생물이라 Phase 소속을 물을 대상이 아니다.
- **Dev Plan에 없는 일반 파일 → 자동 편입 없이 중단(blocked)** — 계획에 없던 작업일 수 있어 사람 판단으로 남긴다.
- **중간 커밋의 독립 빌드 가능성은 보장 대상이 아니다** — 다중 Phase 편입 시 어느 배치로도 중간 커밋 빌드는 성립하지 않을 수 있다(최종 트리 정상이면 충분). 이를 이유로 매핑을 수동 재배치하지 않는다.

### 태스크 문서 커밋 메시지

```
docs: [TASK-{NNN}] 태스크 문서 완료
```

### CHANGELOG 커밋 메시지

```
docs: [TASK-{NNN}] CHANGELOG 업데이트
```

### 병합 커밋

- 머지 커밋 메시지는 git 기본 메시지 사용
- `-m` 옵션으로 커밋 메시지 지정 금지
- **`--no-ff` 강제 (일반 타입)**: feature/bug/improvement/refactor 등 일반 작업 브랜치 → 부모 병합 시 `git merge --no-ff {브랜치명}` 사용. fast-forward 병합 절대 금지. 머지 커밋이 없으면 작업 브랜치 삭제 후 분기 정보 영구 손실(90일 reflog GC 후 추적 불가).
- **추적 변경 0 → 마커 빈커밋 (`--allow-empty` 금지의 유일 예외)**: 코드 변경 0 + `.project` gitignore로 작업 브랜치가 부모보다 앞선 커밋이 0개이면 `--no-ff`도 *Already up to date*가 되어 머지 커밋이 생성되지 않는다. 이 경우 `/task-close`가 추적 마커 빈커밋 1개(`--allow-empty`)를 생성해 분기·채번 정보를 보존한다 (상세: task-close Step 6-8). 그 외 빈커밋은 금지.
- **plan/roadmap 임시 docs 브랜치 예외**: plan-init 단계의 단일 커밋(plan 신규 생성 — PLAN/ROADMAP + 제품 관통 문서 delta)에 한정 `--ff-only` 가능.
- **task 진행 중 ROADMAP/플랜 문서 갱신은 별도 `docs/*` 브랜치 분리 절대 금지**: 해당 task의 작업 브랜치 (`feature/*` / `improve/*` 등) 안에서 수정 + 다른 구현 커밋과 함께 `--no-ff` 머지로 부모 병합 (분기 정보 손실 방지).

---

## 작업 브랜치 삭제 정책

### 기본 (멀티세션 외 / 케이스 2 / 사용자 수동 작업)

작업 브랜치(feature/* / bug/* / improve/* / refactor/* / docs/* / chore/*)는 다음 조건 모두 만족 시에만 삭제한다:
1. 부모 브랜치에 `--no-ff` 병합 완료 (머지 커밋이 부모에 기록됨)
2. 사용자 명시 승인 ("브랜치 삭제해" 등 직접 요청)

**메인 세션 룰**: 사용자 승인 없는 작업 브랜치 삭제 지시 절대 금지. 머지 후 자동 삭제 X. 사용자가 직접 요청 시에만 `git branch -d {브랜치명}` 실행. (단, plan/roadmap 임시 docs 브랜치는 단일 커밋 ff-only 머지 후 자동 삭제 가능.)

### `/task-close` 자동 삭제 면제 조항 (멀티세션 0.1.2+)

`/task-close` 마지막 단계의 *작업 브랜치 자동 삭제 + 워크트리 자동 제거*는 본 정책의 *사용자 명시 승인 룰* 면제 — 사용자가 `/task-close` 호출 자체로 *사전 승인*한 것으로 간주.

| 동작 | 명령 | 면제 사유 |
|------|------|----------|
| 워크트리 제거 | `git -C "$MAIN_WT" worktree remove "$WT_PATH"` | task 완료 후 격리 폴더 정리 필요. 사전 안전 검증 (§"멀티세션 워크트리 정책" 참조) 후 진행 |
| 작업 브랜치 삭제 | `git -C "$MAIN_WT" branch -d "$BRANCH"` | 부모 `--no-ff` 머지 완료 후 안전 삭제 (-D 강제 X). 머지 커밋이 부모에 박혀 분기 정보 보존 |

#### 보존 키워드 (양쪽 다 보존)

사용자 발화에서 다음 키워드 감지 시 **워크트리 + 브랜치 모두 보존** (Step 11~13 건너뜀):
- `keep` / `--keep-branch` / `브랜치 남겨` / `브랜치 보존` / `브랜치 유지`

#### 사전 안전 검증 (자동 흐름 차단 트리거)

`/task-close` Step 11에서 다음 조건 발견 시 *자동 흐름 차단 + 사용자 호출*:
- 워크트리 안 미커밋 변경 (`git status --porcelain` 결과 있음)
- 워크트리 안 추적 X 파일 (`git ls-files --others --exclude-standard` 결과 있음)

사용자 선택:
- 보존 → 워크트리 + 브랜치 모두 보존 (Step 12, 13 건너뜀)
- 삭제 → 정상 자동 흐름 (Step 12, 13 진행)
- 취소 → close 중단 (단, 부모 브랜치 머지는 이미 완료된 상태)

#### 안전망 출력 (브랜치 삭제 직후)

```
삭제됨: {브랜치명}
복구: git -C "$MAIN_WT" branch {브랜치명} {머지 커밋 해시}
```

#### 면제 범위 한정

본 면제는 *`/task-close` 마지막 단계 자동 흐름 한정*. 그 외 모든 destructive 명령(`git reset --hard` / `git push --force` / `git branch -D` / `git clean -fd`)은 §"금지 사항" 그대로 사용자 명시 승인 필수.

---

## 멀티세션 워크트리 정책 (0.1.2+)

### 메인 워크트리 = 부모 브랜치 고정

- 메인 워크트리는 `/task-init` 시점에 서 있던 브랜치(= 그 task의 *부모 브랜치*)를 유지. 개인 기본 `dev`, 회사/로드맵 `dev_feat_x`/`master` 등 — taskery는 현재 브랜치를 부모로 삼는다(이름 고정 X).
- 모든 태스크 작업은 *예외 없이* 별도 워크트리에서 수행
- **진행 중 태스크가 있는 동안 메인 워크트리 HEAD를 옮기는 어떤 명령도 영구 금지**: `git checkout <task-branch>` / `git switch <task-branch>` / `git reset` HEAD 이동 / `git rebase` HEAD 이동 등. close가 부모로 되병합해야 하므로 부모에 서 있어야 한다. *"잠깐만 메인에서"* / *"테스트 한 번만"* 같은 예외 발화도 거부 (별도 워크트리로 처리). (부모 브랜치 자체 전환은 진행 중 태스크가 없을 때만.)
- **모호 발화 자의 해석 금지**: *"워크트리 없이"* / *"메인에서"* / *"이 자리에서"* 류 발화 = 본 규칙 충돌 신호 → 즉시 정지 + 규칙 명시 + 1줄 confirm 요청 (자의 해석 후 진행 영구 금지). 사용자 의도가 *오타/모호*일 가능성은 *워크트리 사용*으로 읽는 게 자연스러움
- `/task-init` / `/task-close` 시작 시 검증 (위배 시 사용자 호출 + 중단)

### 워크트리 위치

```
~/.taskery/worktrees/<projectId>/TASK-NNN_<출처>_<슬러그>/
```

- `<projectId>`: `.taskery-manifest.json`의 `projectId` 필드 (8자 hex, taskery init 자동 생성)
- 부모 디렉토리는 `/task-init`이 자동 `mkdir -p`

### 워크트리 생성 / 제거

| 작업 | 명령 | 주체 |
|------|------|------|
| 생성 | `npx @angar2/taskery fork <type> <dev> <src> <slug>` (내부: init 락 + `worktree add -b`) | `/task-init` |
| 제거 | `git -C "$MAIN_WT" worktree remove "$WT_PATH"` | `/task-close` (자동 흐름 + 안전 검증) |
| stale 정리 | `git -C "$MAIN_WT" worktree prune` | `npx @angar2/taskery prune` (사용자 확인 후) |

### 워크트리 실행 환경 (의존성 — 앱 실행·검수 시)

새 워크트리에는 의존성·빌드 산출물이 없다(생태계마다 형태 상이). 이를 메인 워크트리에서 **심링크로 끌어오지 않는다.**

- 심링크는 실제 경로가 메인 워크트리를 가리켜, *파일 접근을 워크트리 내부로 제한하는 도구*(개발 서버 등)에서 로딩 실패(예: 빈 화면)를 일으킨다.
- 빌드·테스트는 이 제한을 거치지 않아 심링크로도 통과하므로 "코드는 정상인데 실행만 깨짐"으로 오진하기 쉽다.
- 해당 task에서 앱을 **실행·검수**해야 한다면 심링크 대신 워크트리 안에 의존성을 실제로 마련한다(프로젝트 고유의 설치 명령 사용). 실행·검수가 필요 없는 task는 무관하다.

### 메인 워크트리 절대 경로 검출

워크트리 안에서 메인 워크트리 메타(`.project/`, `CLAUDE.md`)에 접근할 때 사용:

```sh
MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

git ≥ 2.31 필요 (`--path-format=absolute` 옵션).

### SSoT 조회 (진행중 태스크)

```sh
git -C "$MAIN_WT" branch --list \
  'feature/*_TASK-*' 'bug/*_TASK-*' 'improve/*_TASK-*' \
  'refactor/*_TASK-*' 'docs/*_TASK-*' 'chore/*_TASK-*'
```

`_TASK-*` 패턴 강제로 케이스 2(TASK 없는 브랜치) 자동 제외. (부모 기준 `--no-merged` 미사용 — 분기 직후 브랜치는 부모와 동일 commit이라 완전 머지로 오판돼 채번이 충돌하기 때문. 브랜치 존재 자체가 SSoT. `bin/lib.js` `getActiveTasks` 참조.) 별도 상태 파일/락 운영 X — git 분산 락(동일 브랜치명 자동 거부) + 결정적 슬러그(백로그/로드맵 항목 제목 → kebab-case)가 race 차단 2층 안전망.

### 머지 직렬화 (head-to-head race 차단)

`/task-close` Step 6에서 `proper-lockfile` 기반 머지 락 (`~/.taskery/<projectId>.merge.lock`) 획득 후 rebase + 머지 시퀀스 실행:
- stale: manifest `lock_timeout_ms` (기본 30000ms)
- retries: 5회, 1초 간격
- 락 외 *사전 rebase* (UX용 조기 충돌 감지) → 락 안 *재 rebase*로 락 외에서 발생한 다른 세션 머지 흡수

### 멀티세션 검수 환경 (dev 서버 · 터널 — 검수 서버를 띄우는 프로젝트 한정)

여러 세션이 병렬로 검수용 dev 서버·터널을 띄울 때 포트·프로세스가 충돌하지 않도록 task별로 자원을 독립 소유한다. CLI·라이브러리 등 검수 서버가 없는 프로젝트는 무관.

- **포트 격리 (결정적)**: 메인 세션(부모 브랜치) = 기준 포트, task 워크트리 = 기준 포트 + TASK번호. 기준 포트는 프로젝트가 `CLAUDE.md`(코덱스는 `AGENTS.md`) `## 검수 실행 명령`에 선언한다 (멀티 프로젝트 동시 운영 시 프로젝트마다 다른 기준 포트). TASK번호는 1부터라 offset 0(기준 포트)이 메인 몫으로 항상 비어 충돌하지 않는다.
- **터널 (필수 아님)**: 모바일 검수 등 필요한 task만, 자기 포트를 가리키는 별도 프로세스로 판다 → task별 독립 URL.
- **자기 것만 정리**: `/task-close` 시 본 task가 띄운 서버·터널(자기 포트 것)만 종료한다. **`pkill -f` 같은 광역 종료 금지** — 다른 세션의 서버까지 죽이는 원인.
- **검수 기동 (자동)**: 사용자가 결과를 *눈으로 검수*하는 시점에 위 포트로 서버를 백그라운드 기동하고 접속 URL을 보고한다 (사용자가 매번 실행을 지시하지 않게). 정확한 발동 지점은 각 스킬 참조 — `/task-dev`는 세션이 거기서 끝날 때(Step 9), `/task-test`는 UNCERTAIN 검수 직전(Step 5)·PASS 후 종료 시(Step 7). FAIL→수정 흐름에서는 기동하지 않는다. 단계가 *기능상* 서버를 요구하면(E2E 등) 검수 시점과 무관하게 띄운다.
- **효과 (정직)**: 포트 충돌은 결정적으로 제거된다. 다른 세션의 종료·턴 경계 프로세스 소실은 위 규율·백그라운드 실행으로 완화되나 문서 규율이라 강제는 아니다(best-effort).

---

## Hook 안전망 — `git-guard.sh`

`.claude/hooks/git-guard.sh`가 PreToolUse(Bash)로 다음 명령 차단:
- `main` / `dev` 직접 커밋 — **5종 변형 인식** (0.1.3+): `git -C <경로>` / `git --git-dir=<경로>` / `git --git-dir <경로>` / `git --work-tree=<경로>` / `git --work-tree <경로>` 모두 인식해 *대상 경로의 브랜치*로 검사. 어느 cwd에서 호출하든 워크트리 브랜치 커밋이 dev 직접 커밋으로 오인 차단되지 않음
- `git push --force` (작업 브랜치 외 / 사용자 미승인)
- `git commit --no-verify`
- `git branch -D` (사용자 미승인)
- `git reset --hard` (사용자 미승인)
- `git clean -fd` (사용자 미승인)

**셸 prefix 금지**: `cd <경로> && git ...` / `(cd <경로> && git ...)` 형태는 hook이 정확히 인식 X (변형 우회 위험). 모든 워크트리 대상 명령은 `git -C <경로> ...` 형태로만 발행.

이 hook은 *catastrophic 차단 안전망*. 잘 지키면 작동 0회 (무해).

---

## 금지 사항

- 민감 정보 커밋 금지 (`.env`, API KEY, Secret Key 등)
- 여러 태스크를 하나의 브랜치에서 작업 금지
- 커밋 순서 임의 변경 금지
- 승인 없이 부모 브랜치 병합 금지
- **destructive 명령 사용자 승인 필수**: 다음 명령은 사용자 명시 승인 없이 절대 실행 금지:
  - `git reset --hard ...`
  - `git push --force ...`
  - `git branch -D ...`
  - `git clean -fd ...`
  → 정상 흐름에서 위 명령 사용 사유 없음. 충돌/오류 발생 시 사용자에게 보고 + 승인 요청 의무.

---

## 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-07 | `--no-ff` 강제 + 작업 브랜치 삭제 정책 + destructive 명령 사용자 승인 필수 룰 추가 |
| 2026-05-08 | git 작업은 메인 세션이 `/task-close` 스킬 또는 직접 수행으로 단일화. git-guard.sh hook 안전망 명시 추가 |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 이전 버전 비교 단락 정리 |
| 2026-05-30 | docs/* 브랜치 ff-only 예외 명시 — plan-init 단일 커밋 한정. task 진행 중 ROADMAP/플랜 갱신은 작업 브랜치 + --no-ff 명시 추가 (stash FRICTION_LOG #4 반영) |
| 2026-05-31 | 멀티세션 0.1.2 오버라이드 — 브랜치명에 출처(BL/RM/DR) 추가 / 케이스 2(TASK 없는 브랜치) 시스템 외 명시 / `/task-close` 자동 삭제 + 워크트리 제거 면제 조항 / 멀티세션 워크트리 정책 섹션 신규 (메인=dev 전용 / SSoT 조회 / 머지 락 직렬화) |
| 2026-05-31 | 0.1.2 백로그 스킬 추가 정합 — 출처 표 `BL-NNN` 채번 주체 `/backlog-add` → `/add-backlog`로 갱신 + 버전별 경로(`.project/tasks/<vX.X>/BACKLOG.md`) 명시 |
| 2026-06-02 | 0.1.3 F2·F3 정합 — §멀티세션 워크트리 정책 *메인 HEAD 떼기 금지* + *모호 발화 자의 해석 금지* / §git-guard.sh 5종 변형 인식 (-C / --git-dir / --work-tree) + 셸 prefix 금지 명시. stash FRICTION_LOG 2026-06-01 반영 |
| 2026-06-25 | 추적 변경 0(코드 0 · `.project` gitignore) close 시 마커 빈커밋으로 분기·채번 정보 보존 — `--no-ff` 머지 커밋 미생성 케이스의 `--allow-empty` 유일 예외 명시 (상세: task-close Step 6-8). FRICTION 검토 F1 반영 |
| 2026-06-28 | 워크트리 생성 메커니즘 갱신 — `git worktree add` 직접 실행 → `npx @angar2/taskery fork`(init 락 안에서 채번+분기 원자 실행). 병렬 task-init 번호 충돌(레이스) 차단 |
| 2026-06-25 | §멀티세션 워크트리 정책에 "워크트리 실행 환경" 추가 — 워크트리에 의존성 심링크 금지(개발 서버 fs 접근 제한으로 로딩 실패), 실행·검수 task는 워크트리 안에 의존성 실제 마련. FRICTION 검토 F6 반영 |
| 2026-06-25 | §멀티세션 워크트리 정책에 "멀티세션 검수 환경" 추가 — task별 dev 서버 포트 격리(메인=기준 포트, task=기준+TASK번호) + 터널 독립 + close 시 자기 것만 종료(광역 종료 금지) + 사용자 검수 시점 서버 자동 기동(task-test UNCERTAIN/PASS·task-dev 종료, FAIL 제외). FRICTION 검토 F7 반영 |
