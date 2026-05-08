# GIT_RULE

> 이 파일은 taskery 시스템 권장 프로젝트별 git 정책이다.
> 우선순위: **이 파일** (`.project/rules/GIT_RULE.md`) → 글로벌 (`~/.claude/rules/GIT_RULE.md`) → 메인 판단.
> 프로젝트별 변형이 필요하면 `.project/rules/GIT_RULE.local.md` 생성 (npx update 미터치).

---

## 기본 원칙

- **git 작업은 메인 세션이 `/task-close` 슬래시 또는 직접 수행**: 9 에이전트 시절의 gitter 흡수.
- **main, dev 직접 커밋 절대 금지**: 모든 작업은 태스크 브랜치에서 진행.
- **하나의 브랜치는 하나의 태스크만 담당**.
- **작업 브랜치는 dev에서 분기, dev로 병합**.
- **dev → main 병합은 사용자(지크)가 직접 수행**.

---

## 브랜치 구조

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 |
| `dev` | 통합 개발 |
| `{타입}/{개발자}_{TASK-NNN}_{kebab-slug}` | 태스크 작업 브랜치 |

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

### 브랜치 예시

```
feature/claude_TASK-001_user-auth
bug/angar2_TASK-002_login-crash
refactor/gpt_TASK-003_cleanup-api
```

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

## 커밋 순서 (태스크 완료 시 — `/task-close` 슬래시)

태스크 마무리 시 메인이 아래 순서를 반드시 준수한다.

```
1. Phase별 기능 커밋 (각 Phase마다 1개)
2. 태스크 문서 커밋
3. CHANGELOG 커밋
4. dev 브랜치 병합 (--no-ff)
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
- **plan/roadmap 임시 docs 브랜치 예외**: 단일 커밋이라 `--ff-only` 가능.

---

## 작업 브랜치 삭제 정책

작업 브랜치(feature/* / bug/* / improve/* / refactor/* / docs/* / chore/*)는 다음 조건 모두 만족 시에만 삭제한다:
1. dev 브랜치에 `--no-ff` 병합 완료 (머지 커밋이 dev에 박힘)
2. 사용자 명시 승인 ("브랜치 삭제해" 등 직접 요청)

**메인 세션 룰**: 사용자 승인 없는 작업 브랜치 삭제 지시 절대 금지. 머지 후 자동 삭제 X. 사용자가 직접 요청 시에만 `git branch -d {브랜치명}` 실행. (단, plan/roadmap 임시 docs 브랜치는 단일 커밋 ff-only 머지 후 자동 삭제 가능.)

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
| 2026-05-08 | v0.2: gitter → 메인 흡수 (`/task-close` 슬래시), git-guard.sh hook 안전망 명시 추가 |
