# CLAUDE.md

> 이 파일은 메인 세션이 *매 세션 시작 시 자동 로드*하는 단일 진입점이다.
> 프로젝트 메타 + 검증 명령 + 룰 참조 + 스킬 9종 + 동기화 룰만 포함한다.
> 사람용 도메인 설명은 `.project/PROJECT.md`, 진입 가이드는 `.project/AGENT-GUIDE.md` 참조.

---

## 프로젝트 메타

- **이름**: <프로젝트명>
- **타입**: <frontend / backend / fullstack / cli / library / other>
- **소개 (한 줄)**: <도메인 / 비전>
- **상세**: `.project/PROJECT.md` 참조

> `/project-init` 호출 시 위 4 항목 채워짐. 변경 필요하면 직접 Edit.

---

## 메인 세션 최상위 룰

> 본 룰은 *모든 스킬 호출 / 사용자 발화 처리 / 작업 진행*에 적용. 위반 시 사용자 마찰 직결.

1. **범위 준수** — 사용자가 명시한 범위/행동만 수행. 명시 외 자체 진입 영구 금지. 예: 사용자가 *"X부터 Y까지"* 지시 → Y 끝에서 정지 + 상태 보고 + 다음 단계 명시 호출 대기.
2. **Skill 정식 발동** — task 단계는 반드시 Skill 도구로 정식 호출. 가이드 본문을 머릿속 절차로 대체 금지 (컴팩트 세션 / 시스템 리마인더 인지 상태에서도 동일).
3. **워크트리 자가 진단** — 세션 시작 시 현재 cwd가 *메인 워크트리*인지 *태스크 워크트리*인지 자가 판단 (`git rev-parse --show-toplevel` + `~/.taskery/worktrees/` 경로 비교). 태스크 워크트리면 *해당 진행중 태스크 컨텍스트*로 진입, 메인 워크트리면 *새 태스크 / 진행중 목록 인터뷰* 흐름.
4. **모호 발화 자의 해석 금지** — *"워크트리 없이"* / *"메인에서"* / *"이 자리에서 그냥"* 류로 읽히는 발화 = 코어 규칙(메인 워크트리 = dev 전용) 충돌 신호. 즉시 정지 + 규칙 한 줄 명시 + 1줄 confirm 요청. 자의 해석 후 진행 영구 금지. 사용자 의도가 *오타/모호*일 가능성을 *워크트리 사용*으로 읽는 게 자연스러움.

---

## 멀티세션 워크트리 (0.1.2+)

> 멀티세션 = 같은 프로젝트에서 *여러 메인 세션이 독립 태스크를 병렬*로 진행. git worktree로 작업 폴더 격리, dev 머지 시 직렬화.

- **메인 워크트리 = dev 전용**: 메인 워크트리는 항상 `dev` 체크아웃 상태. 모든 태스크 작업은 *예외 없이* 별도 워크트리에서 수행. 메인 워크트리 HEAD를 dev에서 떼는 어떤 작업(`git checkout <task-branch>` / `git switch <task-branch>` / `git reset` HEAD 이동 / `git rebase` HEAD 이동 등)도 영구 금지. *"잠깐만 메인에서"* / *"테스트 한 번만 메인에서"* 같은 예외 발화도 거부 — 별도 워크트리에서 처리.
- **워크트리 위치**: `~/.taskery/worktrees/<projectId>/TASK-NNN_<출처>_<슬러그>/`
  - `<projectId>`: `.taskery-manifest.json` `projectId` (8자 hex)
  - `<출처>`: `BL-NNN` / `RM-NNN` / `DR`
- **`/task-init`이 워크트리 생성** + **`/task-close`가 dev 머지 + 워크트리 자동 제거** (자동 흐름. 보존 키워드 `keep` / `브랜치 남겨` 등 발화 시 둘 다 보존).
- **메인 메타 접근**: 워크트리에서 `.project/`, `CLAUDE.md` 등 접근 시 *메인 워크트리 절대 경로* 사용:
  ```sh
  MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
  ```
- **수동 git 작업 시 정합성 보장 X** — taskery 명령(스킬 / `npx @angar2/taskery <서브>`)으로만 운영.
- **CLI 보조 명령**:
  - `npx @angar2/taskery status` — 진행중 태스크 + 워크트리 + dev 머지 상태 요약
  - `npx @angar2/taskery prune` — stale 워크트리 대화형 정리

상세: `.project/rules/GIT_RULE.md` "멀티세션 워크트리 정책" 섹션.

요건: git ≥ 2.31 (`--path-format=absolute` 옵션 필요).

---

## 백로그 (0.1.2+)

> `.project/tasks/<vX.X>/BACKLOG.md` = *버전별 task 후보 누적*. 사용자 발화로 1건씩 얕은 분석(개요 / 대상 영역) 곁들여 추가.

- **`/add-backlog`**: 사용자 *"~ 백로그에 추가"* 발화 → 얕은 분석(코드 탐색 X, 추정 수준) → BL-NNN 채번 → BACKLOG.md append (`[ ]` 대기).
- **`/task-init` 연동**: 사용자 *"백로그의 BL-NNN 진행"* 발화 → 해당 항목 *확인 마킹*. `[ ]` → `[x]` + `- TASK: TASK-NNN` 추가 (다회 진행 시 콤마).
- **체크박스 의미**: `[ ]` = 미확인 (task로 옮기지 않은 메모) / `[x]` = 확인 완료 (task로 옮김). **dev 머지 완료 의미 X** — 완료 여부는 `git log dev --grep 'BL-NNN'` + 브랜치명 추적 + `taskery status`.
- **글로벌 `.project/BACKLOG.md`** (plan 기획 후보 카탈로그) 는 본 흐름 무관 — `/plan-init` 영역.

상세: `.claude/skills/add-backlog/SKILL.md`.

---

## 검증 명령

> *코드 상태 검증* (빌드 / 린트 / 타입체크). 테스트 실행은 본 섹션 X — `## 테스트 명령` 참조.
> `/task-dev` self-check / `/task-close` 최종 게이트가 *이 섹션을 단일 진실 소스로 참조*.
> 백틱(`...`) 안 명령 그대로 실행됨. 언어/프레임워크 따라 변경.

- 린트: `<예: npm run lint>`
- 타입체크: `<예: npm run typecheck>` (TypeScript / Flow / mypy 등 — 해당 시)
- 빌드: `<예: npm run build>`

> 위 항목 중 *프로젝트에 해당 없는 것*은 행 자체 삭제. 빈 백틱(\`\`)은 사용 금지.

---

## 테스트 명령

> *테스트 실행* (단위 / 통합 / E2E 등). 코드 상태 검증은 `## 검증 명령` 참조.
> `/task-dev` 구현 후 테스트 + `/task-test` 격리 세션이 *이 섹션을 단일 진실 소스로 참조*.
> 백틱(`...`) 안 명령 그대로 실행됨. 언어/프레임워크 따라 변경.

- 단위 테스트: `<예: npm test>`
- 통합 테스트: `<예: npm run test:integration>` (있을 시)
- E2E 테스트: `<예: npx playwright test>` (있을 시)

> 위 항목 중 *프로젝트에 해당 없는 것*은 행 자체 삭제. 빈 백틱(\`\`)은 사용 금지.

---

## 룰 문서 참조

| 룰 | 위치 | 역할 |
|----|------|------|
| TASK_DOC_RULE | `.project/rules/TASK_DOC_RULE.md` | task 문서 양식 (헤더 5컬럼 / 6 섹션 / 7 상태) |
| GIT_RULE | `.project/rules/GIT_RULE.md` (있으면) → 글로벌 `~/.claude/rules/GIT_RULE.md` (fallback) | git 정책 (브랜치 / 커밋 / 머지) |
| CHANGELOG_RULE | `.project/rules/CHANGELOG_RULE.md` | CHANGELOG 작성 정책 (위치 / 형식 / 필수 필드) |
| MOCKUP_RULE | `.project/rules/MOCKUP_RULE.md` | UX/UI task의 HTML 목업 위치 / 형식 / 네이밍 |
| `*.local.md` | `.project/rules/` | (옵션) 사용자 오버라이드 — `*.local.md` suffix는 npx 미터치 |

---

## 스킬 9종 — project > plan > task 위계 + 회고

| 스킬 | 레벨 | 역할 |
|------|------|------|
| `/project-init` | project | PROJECT/AGENT-GUIDE/LINKED-REPOS/.env 골격 생성 (1회성) |
| `/plan-init` | plan | `.project/plans/<vX.X>/` 안 기획 문서 작성 |
| `/task-init` | task | task.md 빈 골격 + status=draft |
| `/task-plan` | task | Requirements/Scope/Dev Plan/Test Plan 작성 (draft → planned) |
| `/task-dev` | task | Phase 순서 구현 + self-check (planned → developed) |
| `/task-test` | task | Task tool 격리 검증 (developed → tested) |
| `/task-close` | task | 검증 명령 게이트 + 커밋 + dev 병합 (tested → closed) |
| `/add-backlog` | meta | 사용자 발화로 버전별 BACKLOG.md에 항목 1건 추가 (얕은 분석 + BL-NNN 채번 — 0.1.2+) |
| `/log-friction` | meta | FRICTION_LOG.md에 사용자 불편 한 행 기록 |

본문은 `.claude/skills/<스킬>/SKILL.md` 참조.

---

## Hook 안전망 — Catastrophic 2종

| Hook | 영역 | 잡는 것 |
|------|------|--------|
| `git-guard.sh` | PreToolUse(Bash) | main/dev 직접 커밋 / `--force` / `--no-verify` / `branch -D` / `reset --hard` / `clean -fd` |
| `closed-immutable.sh` | PreToolUse(Write\|Edit) | `closed` 상태 task.md 본 파일 재수정 차단 (정상 흐름은 새 task로). spec-diffs / screenshots / mockup은 자유 수정 (역사적 자료) |

**잘 지키면 hook 작동 0회 (무해). catastrophic만 차단.**

> 이전 `pre-commit-verify.sh` hook은 폐기 — task-close Step 2 게이트 + git-guard 안전망으로 충분 (redundant 검증 사이클 제거). 폐기 사유는 [plan/HOOKS.md](../plan/HOOKS.md) §5 참조.

---

## 불편 데이터

- **누적**: `.project/FRICTION_LOG.md` — 메인이 한 줄씩 추가 (사용자 불만 발화 캐치 또는 사용자 명시)
- **등록**: `/log-friction` 스킬 — 사용자 명시 호출 / 불만 발화 캐치 / task-close 직후 마찰 신호 자체 감지 시 한 행 기록

---

## 동기화 룰 (사용자 의무)

> taskery는 *plan/ ↔ template/ 자동 빌드 X*. 사용자가 직접 정합 유지.

- **`.project/plans/<vX.X>/` 변경 시** → 관련 task의 `spec-diffs/` 갱신 (`/task-plan` Phase 0 흐름 — 진행 중 task 있으면)
- **`CLAUDE.md` 검증 명령 변경 시** → 모든 스킬 + hook이 그대로 따름. 별도 동기화 불필요
- **룰(`*.md` in `.project/rules/`) 변경 시** → 스킬 instruction이 다음 호출부터 변경 반영
- **`*.local.md` 사용자 오버라이드** → `npx @angar2/taskery update`가 미터치. 코어 룰 갱신 시 `*.bak` 백업 후 사용자 confirm

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
