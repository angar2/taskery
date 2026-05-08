# CLAUDE.md

> 이 파일은 메인 세션이 *매 세션 시작 시 자동 로드*하는 단일 진입점이다.
> 프로젝트 메타 + 검증 명령 + 룰 참조 + 스킬 8종 + 동기화 룰만 포함한다.
> 사람용 도메인 설명은 `.project/PROJECT.md`, 진입 가이드는 `.project/AGENT-GUIDE.md` 참조.

---

## 프로젝트 메타

- **이름**: <프로젝트명>
- **타입**: <frontend / backend / fullstack / cli / library / other>
- **소개 (한 줄)**: <도메인 / 비전>
- **상세**: `.project/PROJECT.md` 참조

> `/project-init` 호출 시 위 4 항목 채워짐. 변경 필요하면 직접 Edit.

---

## 검증 명령

> `/task-dev` self-check / `/task-test` 격리 게이트 / `/task-close` 최종 게이트 / `pre-commit-verify.sh` hook이 *모두 이 섹션을 단일 진실 소스로 참조*.
> 백틱(`...`) 안 명령 그대로 실행됨. 언어/프레임워크 따라 변경.

- 린트: `<예: npm run lint>`
- 타입체크: `<예: npm run typecheck>` (TypeScript / Flow / mypy 등 — 해당 시)
- 빌드: `<예: npm run build>`
- 단위 테스트: `<예: npm test>`

> 위 4 항목 중 *프로젝트에 해당 없는 것*은 행 자체 삭제. 빈 백틱(\`\`)은 사용 금지.

---

## 룰 문서 참조

| 룰 | 위치 | 역할 |
|----|------|------|
| TASK_DOC_RULE | `.project/rules/TASK_DOC_RULE.md` | task 문서 양식 (헤더 5컬럼 / 6 섹션 / 7 상태) |
| GIT_RULE | `.project/rules/GIT_RULE.md` (있으면) → 글로벌 `~/.claude/rules/GIT_RULE.md` (fallback) | git 정책 (브랜치 / 커밋 / 머지) |
| `*.local.md` | `.project/rules/` | (옵션) 사용자 오버라이드 — `*.local.md` suffix는 npx 미터치 |

---

## 스킬 8종 — project > plan > task 위계 + 회고

| 스킬 | 레벨 | 역할 |
|------|------|------|
| `/project-init` | project | PROJECT/AGENT-GUIDE/LINKED-REPOS/.env 골격 생성 (1회성) |
| `/plan-init` | plan | `.project/plans/<vX.X>/` 안 기획 문서 작성 |
| `/task-init` | task | task.md 빈 골격 + status=draft |
| `/task-plan` | task | Requirements/Scope/Dev Plan/Test Plan 작성 (draft → planned) |
| `/task-dev` | task | Phase 순서 구현 + self-check (planned → developed) |
| `/task-test` | task | Task tool 격리 검증 (developed → tested) |
| `/task-close` | task | 검증 명령 게이트 + 커밋 + dev 병합 (tested → closed) |
| `/refine` | meta | FRICTION_LOG 정독 + 패턴 감지 + bottoms-up 보강 제안 |

본문은 `.claude/skills/<스킬>.md` 참조.

---

## Hook 안전망 — Catastrophic 3종

| Hook | 영역 | 잡는 것 |
|------|------|--------|
| `git-guard.sh` | PreToolUse(Bash) | main/dev 직접 커밋 / `--force` / `--no-verify` / `branch -D` / `reset --hard` / `clean -fd` |
| `pre-commit-verify.sh` | PreToolUse(Bash) | `git commit` 시 위 *검증 명령* 모두 PASS 게이트. 하나라도 fail → 차단 |
| `closed-immutable.sh` | PreToolUse(Write\|Edit) | `closed` 상태 task.md 본 파일 재수정 차단 (정상 흐름은 새 task로). spec-diffs/screenshots는 자유 수정 (역사적 자료) |

**잘 지키면 hook 작동 0회 (무해). catastrophic만 차단.**

---

## 짜증 데이터

- **누적**: `.project/FRICTION_LOG.md` — 메인이 한 줄씩 추가 (사용자 발화 *"이거 짜증나"* 또는 자동 감지)
- **회고**: `/refine` 스킬 — 5 task마다 또는 사용자 호출. 반복 패턴 감지 + PLAYBOOK 부활/새 룰 제안

---

## 동기화 룰 (사용자 의무)

> taskery는 *plan/ ↔ template/ 자동 빌드 X*. 사용자가 직접 정합 유지.

- **`.project/plans/<vX.X>/` 변경 시** → 관련 task의 `spec-diffs/` 갱신 (`/task-plan` Phase 0 흐름 — 진행 중 task 있으면)
- **`CLAUDE.md` 검증 명령 변경 시** → 모든 스킬 + hook이 그대로 따름. 별도 동기화 불필요
- **룰(`*.md` in `.project/rules/`) 변경 시** → 스킬 instruction이 다음 호출부터 변경 반영
- **`*.local.md` 사용자 오버라이드** → `npx taskery update`가 미터치. 코어 룰 갱신 시 `*.bak` 백업 후 사용자 confirm

---

## 멀티리포 통신 (해당 시)

- 송신: `.project/shared/sent/<filename>.md` 작성
- 수신: 연결 리포에서 `received/`로 카피 후 정독
- 처리 완료: `sent/completed/` 또는 `received/completed/`로 이동
- 연결 리포 경로: `.project/.env` (gitignore)
- 리포 목록: `.project/LINKED-REPOS.md`

---

## 메인 세션 진입 시

1. 본 파일(`CLAUDE.md`) 정독 — 검증 명령 + 룰 위치 + 스킬 목록 파악
2. `.project/AGENT-GUIDE.md` 정독 — 활성 plan 버전 + 폴더 구조 + 작업 흐름
3. `.project/plans/<활성버전>/PLAN.md` 정독 — 기획 문서 인덱스 + 진행 상태
4. 사용자 발화 받기 → 적절한 스킬 호출 또는 직접 작업
