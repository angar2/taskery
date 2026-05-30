# GIT_RULE

> 이 파일은 taskery 시스템 권장 프로젝트별 git 정책이다.
> 우선순위: **이 파일** (`.project/rules/GIT_RULE.md`) → 글로벌 (`~/.claude/rules/GIT_RULE.md`) → 메인 판단.
> 프로젝트별 변형이 필요하면 `.project/rules/GIT_RULE.local.md` 생성 (npx update 미터치).

---

## 기본 원칙

- **git 작업은 메인 세션이 `/task-close` 스킬 또는 직접 수행**.
- **main, dev 직접 커밋 절대 금지**: 모든 작업은 태스크 브랜치에서 진행.
- **하나의 브랜치는 하나의 태스크만 담당**.
- **작업 브랜치는 *task-init 시점에* dev에서 분기, *task-close 시점에* dev로 병합** (멀티세션 0.1.2+).
- **dev → main 병합은 사용자가 직접 수행**.
- **수동 git 작업 시 정합성 보장 X** — taskery 명령(스킬 호출 / `npx @angar2/taskery <서브>`)으로만 운영. 수동 `git worktree add` / `branch` / `merge` 시 SSoT·락·자동 정리 흐름이 깨질 수 있음.

---

## 브랜치 구조

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 |
| `dev` | 통합 개발 (메인 워크트리 = dev 전용) |
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
| `BL-NNN` | 백로그 항목 | `/backlog-add` 스킬 (0.1.2 본 기능 직후 추가) |
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
4. dev 브랜치 병합 (--no-ff, 머지 락 직렬화)
5. 워크트리 자동 제거 + 작업 브랜치 자동 삭제 (멀티세션 0.1.2+ — §"작업 브랜치 삭제 정책" 면제 조항)
```

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
- **`--no-ff` 강제 (일반 타입)**: feature/bug/improvement/refactor 등 일반 작업 브랜치 → dev 병합 시 `git merge --no-ff {브랜치명}` 사용. fast-forward 병합 절대 금지. 머지 커밋이 없으면 작업 브랜치 삭제 후 분기 정보 영구 손실(90일 reflog GC 후 추적 불가).
- **plan/roadmap 임시 docs 브랜치 예외**: plan-init 단계의 단일 커밋(plan 신규/카피)에 한정 `--ff-only` 가능.
- **task 진행 중 ROADMAP/플랜 문서 갱신은 별도 `docs/*` 브랜치 분리 절대 금지**: 해당 task의 작업 브랜치 (`feature/*` / `improve/*` 등) 안에서 수정 + 다른 구현 커밋과 함께 `--no-ff` 머지로 dev 병합 (분기 정보 손실 방지).

---

## 작업 브랜치 삭제 정책

### 기본 (멀티세션 외 / 케이스 2 / 사용자 수동 작업)

작업 브랜치(feature/* / bug/* / improve/* / refactor/* / docs/* / chore/*)는 다음 조건 모두 만족 시에만 삭제한다:
1. dev 브랜치에 `--no-ff` 병합 완료 (머지 커밋이 dev에 기록됨)
2. 사용자 명시 승인 ("브랜치 삭제해" 등 직접 요청)

**메인 세션 룰**: 사용자 승인 없는 작업 브랜치 삭제 지시 절대 금지. 머지 후 자동 삭제 X. 사용자가 직접 요청 시에만 `git branch -d {브랜치명}` 실행. (단, plan/roadmap 임시 docs 브랜치는 단일 커밋 ff-only 머지 후 자동 삭제 가능.)

### `/task-close` 자동 삭제 면제 조항 (멀티세션 0.1.2+)

`/task-close` 마지막 단계의 *작업 브랜치 자동 삭제 + 워크트리 자동 제거*는 본 정책의 *사용자 명시 승인 룰* 면제 — 사용자가 `/task-close` 호출 자체로 *사전 승인*한 것으로 간주.

| 동작 | 명령 | 면제 사유 |
|------|------|----------|
| 워크트리 제거 | `git -C "$MAIN_WT" worktree remove "$WT_PATH"` | task 완료 후 격리 폴더 정리 필요. 사전 안전 검증 (§"멀티세션 워크트리 정책" 참조) 후 진행 |
| 작업 브랜치 삭제 | `git -C "$MAIN_WT" branch -d "$BRANCH"` | dev `--no-ff` 머지 완료 후 안전 삭제 (-D 강제 X). 머지 커밋이 dev에 박혀 분기 정보 보존 |

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
- 취소 → close 중단 (단, dev 머지는 이미 완료된 상태)

#### 안전망 출력 (브랜치 삭제 직후)

```
삭제됨: {브랜치명}
복구: git -C "$MAIN_WT" branch {브랜치명} {머지 커밋 해시}
```

#### 면제 범위 한정

본 면제는 *`/task-close` 마지막 단계 자동 흐름 한정*. 그 외 모든 destructive 명령(`git reset --hard` / `git push --force` / `git branch -D` / `git clean -fd`)은 §"금지 사항" 그대로 사용자 명시 승인 필수.

---

## 멀티세션 워크트리 정책 (0.1.2+)

### 메인 워크트리 = dev 전용

- 메인 워크트리는 항상 dev 체크아웃 상태 유지
- 모든 태스크 작업은 *별도 워크트리*에서 수행
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
| 생성 | `git -C "$MAIN_WT" worktree add "$WT_PATH" -b "$BRANCH" dev` | `/task-init` |
| 제거 | `git -C "$MAIN_WT" worktree remove "$WT_PATH"` | `/task-close` (자동 흐름 + 안전 검증) |
| stale 정리 | `git -C "$MAIN_WT" worktree prune` | `npx @angar2/taskery prune` (사용자 확인 후) |

### 메인 워크트리 절대 경로 검출

워크트리 안에서 메인 워크트리 메타(`.project/`, `CLAUDE.md`)에 접근할 때 사용:

```sh
MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

git ≥ 2.31 필요 (`--path-format=absolute` 옵션).

### SSoT 조회 (진행중 태스크)

```sh
git -C "$MAIN_WT" branch --no-merged dev --list \
  'feature/*_TASK-*' 'bug/*_TASK-*' 'improve/*_TASK-*' \
  'refactor/*_TASK-*' 'docs/*_TASK-*' 'chore/*_TASK-*'
```

`_TASK-*` 패턴 강제로 케이스 2(TASK 없는 브랜치) 자동 제외. 별도 상태 파일/락 운영 X — git 분산 락(동일 브랜치명 자동 거부) + 결정적 슬러그(백로그/로드맵 항목 제목 → kebab-case)가 race 차단 2층 안전망.

### 머지 직렬화 (head-to-head race 차단)

`/task-close` Step 6에서 `proper-lockfile` 기반 머지 락 (`~/.taskery/<projectId>.merge.lock`) 획득 후 rebase + 머지 시퀀스 실행:
- stale: manifest `lock_timeout_ms` (기본 30000ms)
- retries: 5회, 1초 간격
- 락 외 *사전 rebase* (UX용 조기 충돌 감지) → 락 안 *재 rebase*로 락 외에서 발생한 다른 세션 머지 흡수

---

## Hook 안전망 — `git-guard.sh`

`.claude/hooks/git-guard.sh`가 PreToolUse(Bash)로 다음 명령 차단:
- `main` / `dev` 직접 커밋
- `git push --force` (작업 브랜치 외 / 사용자 미승인)
- `git commit --no-verify`
- `git branch -D` (사용자 미승인)
- `git reset --hard` (사용자 미승인)

이 hook은 *catastrophic 차단 안전망*. 잘 지키면 작동 0회 (무해).

---

## 금지 사항

- 민감 정보 커밋 금지 (`.env`, API KEY, Secret Key 등)
- 여러 태스크를 하나의 브랜치에서 작업 금지
- 커밋 순서 임의 변경 금지
- 승인 없이 dev 브랜치 병합 금지
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
