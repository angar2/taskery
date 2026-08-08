# taskery

AI 코딩 에이전트의 자율 개발을 위한 Task 기반의 가드레일 시스템.

---

## 해결하는 문제

- Task 단위 라이프사이클의 가이드를 제시한다.
- 메인 세션을 단독으로 운영할 때 자주 발생하는 사고를 사전 차단한다.

| 문제 | taskery 대응 |
|------|------------|
| AI 협업 작업이 매번 즉흥적이라 일관된 체계가 없음 | task 단위 라이프사이클로 작업 흐름 구조화 — 단계별 자동화 가능 |
| 작업 컨텍스트가 휘발되어 이전 결정·사유를 추적하기 어려움 | task 문서로 컨텍스트와 히스토리 기록 — 작업 중 참조 가능 |
| 에이전트가 catastrophic 사고를 일으킬 수 있음 | 필수 hook으로 차단 — 정상 흐름에는 무간섭 |
| 에이전트가 작성한 코드의 자가검증으로 인해 문제를 놓침 (confirmation bias) | 테스트 시 별도 격리 세션 호출(`/task-test`) — 메인 세션의 가정 없이 독립 검증 |
| 단일 메인 세션 운영으로 인해 task를 직렬로 진행해야 하는 병목 | 같은 프로젝트에서 여러 메인 세션이 독립 작업 폴더(worktree)로 병렬 진행 — 머지 시점에 직렬화로 정합성 유지 |
| 검수 중 한 줄만 고쳐도 전체 테스트를 다시 돌려 대기 시간이 길어짐 | 수정 구간에는 변경이 닿는 테스트만 실행 — 전체 실행은 task당 1회로 제한 |
| 테스트가 앱 화면을 띄우고 조작해 그동안 컴퓨터를 쓸 수 없음 | 화면·입력을 점유하는 테스트는 창을 띄우지 않는 실행 경로가 준비된 경우에만 자동 실행 — 없으면 사용자 승인 후 실행 |
| 프로젝트마다 개발·테스트 방식이 다른데 공통 규칙만 적용됨 | 프로젝트 전용 규칙 파일(`*.local.md`)을 각 스킬이 읽어 우선 적용 — 패키지를 갱신해도 덮어쓰지 않음 |

> catastrophic 사고 예시 — git 운영 정책 위반, 검증 우회, 완료된 task 문서 재수정 등

---

## 워크플로우

task 단위 라이프사이클은 7 상태로 구성된다.

**task 상태**

```
draft → planned → developing → developed → testing → tested → closed
```

| 상태 | 의미 |
|------|------|
| `draft` | 새 task 생성 직후 |
| `planned` | 작업 기획 완료 |
| `developing` | 구현 진행 중 |
| `developed` | 구현 완료 (자가 검증 통과) |
| `testing` | 독립 검증 진행 중 |
| `tested` | 독립 검증 완료 |
| `closed` | git 커밋 + 부모 브랜치 병합 완료 |

> 상태별 전이 조건과 task 문서 양식은 [TASK-DOC.md](https://github.com/angar2/taskery/blob/main/plan/TASK-DOC.md)에서 확인 가능

---

## 빠른 시작

> **요구 사항**: Node.js ≥ 18, git ≥ 2.31 (멀티세션 워크트리 기능 사용 시).

### npx

특정 프로젝트에 일회성 다운로드 방식.

```bash
# 새 프로젝트
npx -p @angar2/taskery create-taskery <project-name>

# 기존 프로젝트에 도입 (init 시 에이전트 플랫폼 선택)
cd <project-name>
npx @angar2/taskery init

# 다른 플랫폼 자산 추가 (예: 기존 설치에 Codex 추가)
npx @angar2/taskery add codex

# 최신 버전 머지 갱신
npx @angar2/taskery update

# 멀티세션 보조 명령
npx @angar2/taskery status   # 진행중 태스크 / 워크트리 / 머지 락 현황
npx @angar2/taskery prune    # stale 워크트리 / 브랜치 대화형 정리
```

### 글로벌 npm install


```bash
# 글로벌 설치
npm install -g @angar2/taskery

# 새 프로젝트
create-taskery <project-name>

# 기존 프로젝트에 도입 (init 시 에이전트 플랫폼 선택)
cd <project-name>
taskery init

# 다른 플랫폼 자산 추가 (예: 기존 설치에 Codex 추가)
taskery add codex

# 최신 버전 머지 갱신
taskery update

# 멀티세션 보조 명령
taskery status
taskery prune
```

---

## 패키지 디렉토리 구조

`taskery init` 직후 골격 (아래는 Claude Code 선택 시 예시):

```
my-app/
├─ AGENTS.md                              # AI 에이전트 진입 문서 (본문 단일 소스)
├─ CLAUDE.md                              # Claude Code용 — `@AGENTS.md` 임포트 한 줄
├─ .taskery-manifest.json                 # 패키지 업데이트 추적
├─ .gitignore
├─ .claude/
│   ├─ settings.json                      # hook 등록 (PreToolUse 매칭)
│   ├─ skills/<skill-name>/SKILL.md       # 9 skill (+ Claude 전용 run-team)
│   └─ hooks/<hook-name>.sh               # 2 hook
└─ .project/
    ├─ PROJECT.md                         # 프로젝트 개요
    ├─ LINKED-REPOS.md                    # 관계 리포지토리 정보
    ├─ GLOSSARY.md                        # 도메인 용어집 (영문/한글 표기 일관성)
    ├─ .env                               # 사용자 설정 환경변수 (관계 리포지토리 환경변수 등)
    ├─ SERVICE-POLICY.md / TECH-STACK.md / ARCHITECTURE.md   # 제품 관통 문서 — 정적 (project-init 작성)
    ├─ DATA-MODEL.md / API-SPEC.md / FEATURES.md / UX-UI.md  # 제품 관통 문서 — 성장 (골격 → plan·task가 채움)
    ├─ rules/
    │   ├─ TASKERY_RULE.md                # taskery 사용 설명서 (세션 필독)
    │   ├─ TASK_DOC_RULE.md               # task 문서 작성 규칙
    │   ├─ GIT_RULE.md                    # 로컬 깃 운영 규칙
    │   ├─ CHANGELOG_RULE.md              # CHANGELOG 작성 규칙
    │   ├─ MOCKUP_RULE.md                 # UX/UI HTML 목업 규칙
    │   ├─ DEV_RULE.local.md              # 이 프로젝트의 구현 정책 (모든 리포 필수)
    │   ├─ TEST_RULE.local.md             # 이 프로젝트의 검증 실행 경로·범위 (모든 리포 필수)
    │   └─ *.local.md                     # 사용자 오버라이드 규칙 (패키지 업데이트 대상 제외)
    ├─ plans/                             # plan(기능 그룹)별 PLAN.md / ROADMAP.md (<NNN_slug>/)
    ├─ tasks/                             # task 문서 (<NNN_slug>/BACKLOG.md / spec-diffs / screenshots / mockup 포함)
    ├─ flows/                             # 서비스 로직 플로우 정보
    ├─ changelog/                         # 수정사항 정보
    ├─ shared/                            # 관계 리포지토리 소통 메세지함
    │   ├─ sent/completed/
    │   └─ received/completed/
    └─ FRICTION_LOG.md                    # taskery 불편사항 누적 로그 (/log-friction 첫 기록 시 생성)
```

`.project/`는 플랫폼 무관 공통 자산이다. 진입 문서와 에이전트 자산 위치는 선택한 플랫폼에 따라 갈린다.

| 플랫폼 | 진입 문서 | 스킬 위치 | hook 위치 | hook 등록 |
|--------|----------|----------|----------|----------|
| Claude Code | `CLAUDE.md` (→ `AGENTS.md` 임포트) | `.claude/skills/` | `.claude/hooks/` | `.claude/settings.json` |
| Codex | `AGENTS.md` | `.agents/skills/` | `.codex/hooks/` | `.codex/config.toml` |

진입 문서 본문은 `AGENTS.md` 한 벌이다. Claude Code는 `AGENTS.md`를 자동으로 읽지 않으므로 `CLAUDE.md`가 이를 임포트한다.

> 스킬 9종과 `git-guard.sh`는 양 플랫폼 동일 자산이다. 진입 문서, hook 등록 방식, 완료 보호 hook(`closed-immutable.sh`)의 구현만 플랫폼별로 다르다. `init`에서 둘 다 선택하면 폴더가 갈려 충돌 없이 공존한다.

---

## 멀티세션 (병렬 작업)

같은 프로젝트에서 여러 메인 세션을 동시에 운영해 독립 task를 병렬로 진행한다.

- 새 task를 시작하면(`/task-init`) 작업 폴더(`~/.taskery/worktrees/<projectId>/TASK-NNN_<출처>_<슬러그>/`)와 작업 브랜치를 함께 분기한다.
- 작업 폴더에서 새 메인 세션을 열어 진행하거나, 메인 세션 1개로 모든 작업을 지휘하거나, 메인이 서브 세션을 호출해 병렬로 진행한다 — 운영 방식은 자유. 메인 워크트리(원본 폴더)는 task를 시작한 브랜치(*부모 브랜치*, 기본은 `dev`)를 그대로 유지한다.
- task 완료(`/task-close`) 시 머지 락으로 직렬화한 후 **그 부모 브랜치**에 `--no-ff` 병합한다(개인은 `dev`, 회사/로드맵은 서 있던 브랜치). 다른 세션이 먼저 머지해 충돌이 발생하면 본 세션이 단순/의미적/판단 불가 3단계로 해결을 시도한다.
- 머지 직후 작업 폴더와 작업 브랜치는 자동 정리된다(보존 키워드 사용 시 양쪽 유지). 안전망으로 복구 명령이 함께 출력된다.

요건: git ≥ 2.31. 보조 명령 `npx @angar2/taskery status` / `prune`로 진행 현황과 stale 정리를 확인한다.

---

## 백로그 메모

작업 흐름 중 발견되는 추가 기능과 버그를 *그 자리에서 짧게 적어 둔다*. 메인 세션이 사용자 발화를 받아 `/add-backlog`로 1건씩 활성 plan(기능 그룹)의 `tasks/<NNN_slug>/BACKLOG.md`에 누적한다.

- 항목 형식: 체크박스 + 식별자(BL-NNN) + 유형 + 제목 + 슬러그. 그 아래 *개요*(추정 원인 / 구상)와 *대상 영역*(관여할 파일·모듈) 2줄.
- 시작 시점: 사용자가 *"BL-NNN 진행"*이라고 말하면 `/task-init`이 그 항목 메타로 task를 분기하고 BACKLOG.md 항목을 *확인* 마킹(`[x]`)하며 `- TASK: TASK-NNN`을 함께 남긴다. *완료*가 아니라 *task로 옮겼다*는 의미만 담는다.
- 완료 추적: git 머지 히스토리와 `taskery status`. BACKLOG.md는 메모지 역할만 한다.
- 다음 기능 그룹 후보 카탈로그(글로벌 `.project/BACKLOG.md`)는 다음 plan 기획용으로 분리 관리한다.

---

## Skills

스킬은 호출 시점에 따라 4 카테고리(`project` / `plan` / `task` / `meta`)로 분류된다.

- `project` — 프로젝트 첫 도입 시 1회만 호출
- `plan` — 새 기능 그룹(작업 묶음) 시작 시 호출
- `task` — 새 task 작업 진행 단계에서 호출
- `meta` — 그 외 taskery 관리

| 스킬 | 레벨 | 역할 |
|------|------|------|
| `/project-init` | project | 프로젝트 첫 도입 시 메타 문서 + 제품 관통 기획 문서(정책/스택/구조 작성, 데이터/API/기능/UI 골격) 생성 (1회성) |
| `/plan-init` | plan | 새 기능 그룹의 PLAN.md / ROADMAP.md + 제품 관통 문서(FEATURES/UX-UI)에 기능 의도 추가 |
| `/task-init` | task | 새 task의 빈 문서 생성 |
| `/task-plan` | task | task의 요구사항·범위·개발 계획·테스트 계획 작성 |
| `/task-dev` | task | 계획에 따른 단계별 구현 + 자가 검증 |
| `/task-test` | task | 별도 격리 세션에서 독립 검증 (메인 가정 차단) |
| `/task-close` | task | 최종 검증 후 git 커밋 + 부모 브랜치 `--no-ff` 병합 |
| `/add-backlog` | meta | 사용자 발화로 plan(기능 그룹)별 `tasks/<NNN_slug>/BACKLOG.md`에 task 후보 1건씩 추가 (0.1.2+) |
| `/log-friction` | meta | 사용자 불편을 `.project/FRICTION_LOG.md`에 한 행 기록 |
| `/run-team` | meta | 여러 작업을 묶을 수 있는 단위로 task로 나눠 자동 병렬 처리 — 리더 세션이 팀원(독립 세션)에게 task를 1건씩 분배하고 흐름을 관리 (Claude 전용 · 실험 기능 전제 · 0.3.x+) |

각 스킬은 슬래시로 직접 호출하거나, 사용자 발화의 의미가 스킬의 frontmatter description과 매칭되면 메인 세션이 자동으로 발동시킨다.

> `/run-team`은 Claude의 실험적 멀티 세션 기능(agent teams)을 사용하는 Claude 전용 스킬이다. 기본 흐름이 아니라 *"이 작업들 한 번에 팀으로 진행해"* 같은 발화가 있을 때만 발동하며, 활성화에는 환경 변수(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) 설정이 필요하다. Codex 설치에는 포함되지 않는다.

`/project-init`, `/plan-init`, `/task-init` 세 스킬은 호출 시 다음 문서를 생성한다.

| 스킬 | 생성 위치 | 생성 문서 |
|------|---------|---------|
| `/project-init` | `.project/` | PROJECT.md / LINKED-REPOS.md / GLOSSARY.md / .env + 제품 관통 문서(SERVICE-POLICY / TECH-STACK / ARCHITECTURE 작성, DATA-MODEL / API-SPEC / FEATURES / UX-UI 골격 — 타입 해당분) + 리포 로컬 룰 초안(TEST_RULE.local.md / DEV_RULE.local.md) |
| `/plan-init` | `.project/plans/<NNN_slug>/` | PLAN.md / ROADMAP.md + 제품 관통 문서 FEATURES/UX-UI에 기능 그룹 의도 추가 (제품 관통 문서 전체를 한꺼번에 만들지는 않음) |
| `/task-init` | `.project/tasks/<NNN_slug>/` | `<NNN>_<slug>.md` (단일 파일) 또는 `TASK-<NNN>_<slug>/task.md` (사용자 명시 시 폴더 승격) |

> 각 스킬의 호출 시점, 입력 처리 방식, 단계별 절차, 주의사항은 [SKILLS.md](https://github.com/angar2/taskery/blob/main/plan/SKILLS.md)에서 확인 가능

---

## Hooks

| Hook | 작동 시점 | 차단 대상 |
|------|---------|---------|
| `git-guard.sh` | git 명령 실행 직전 | 주력 브랜치 직접 커밋 / `--force` / `--no-verify` / 강제 브랜치 삭제 / `reset --hard` / `clean -fd` |
| `closed-immutable.sh` | 파일 수정 직전 | 완료(`closed`)된 task.md 본 파일 재수정 (관련 spec-diff·스크린샷은 자유) |

hook은 catastrophic 사고만 차단한다. 정상 흐름에는 간섭하지 않는다. 등록 방식은 플랫폼별로 다르다 — Claude Code는 `.claude/settings.json`, Codex는 `.codex/config.toml`(최초 1회 `/hooks` 신뢰 승인 필요).

> 각 hook의 영역 분리 정신, 등록 매칭, 차단 정책, 예외 처리 절차는 [HOOKS.md](https://github.com/angar2/taskery/blob/main/plan/HOOKS.md)에서 확인 가능

---

## 워크플로우 예시

```bash
# 사용자 프로젝트 첫 셋업
cd <project-name>
npx @angar2/taskery init
```

이후 메인 세션에 진입(진입 문서 자동 정독 — 사용법 전체는 `.project/rules/TASKERY_RULE.md`)하여 다음 시퀀스로 호출한다. task 5 스킬은 호출과 동시에 상태를 전이시킨다.

```
/project-init                  # 진입 메타 문서와 디렉토리 골격 생성
/plan-init mvp                 # 첫 plan(기능 그룹) — PLAN/ROADMAP + 제품 문서에 기능 의도 추가
/task-init                     # draft : 첫 task의 빈 문서 생성
/task-plan TASK-001            # draft → planned : 요구사항·범위·개발 계획·테스트 계획 작성
/task-dev TASK-001             # planned → developed : 단계별 구현과 자체 검증
/task-test TASK-001            # developed → tested : 별도 격리 세션으로 독립 검증
/task-close TASK-001           # tested → closed : 최종 검증 후 git 커밋과 부모 브랜치 병합

# 불편 발생 시 등록
/log-friction                  # 사용자 불편 한 행 기록
```

**자동 발동 예시** — 사용자 발화 의미가 스킬 description과 매칭되면 메인이 슬래시 직접 호출 없이 다음 스킬을 자동 발동한다.

- *"로그인 기능 추가해줘"* / *"이 버그 고쳐줘"* → `/task-init` 자동 발동 (새 task 시작 의도)
- *"기획 다 됐으니 이제 구현 시작해"* → `/task-dev` 자동 발동 (planned task의 다음 단계)
- *"이 부분도 백로그에 추가해줘"* / *"나중에 할 일로 적어둬"* → `/add-backlog` 자동 발동 (백로그 추가 의도)
- *"이거 진짜 불편하다"* / *"이 부분 답답하네"* → `/log-friction` 자동 발동 (불만 발화 캐치)

**실패·불확정 분기** — `/task-test`가 FAIL 또는 UNCERTAIN을 반환하면 메인 세션이 사용자에게 판단을 묻고, 사용자의 자연어 답변에서 의도를 해석해 다음 흐름을 *자동 발동*한다(별도 슬래시 호출 없이 진행됨).

- 사용자가 재구현을 요청하면 → `testing` → `developing`으로 회귀해 `/task-dev`가 자동 발동된다.
- 사용자가 결함을 인지한 채 종결을 지시하면 → `testing` → `tested`로 진행하고 결함을 명시한 후 `/task-close`로 이행된다.
- UNCERTAIN(자동 검증이 불가능한 시나리오)은 사용자가 직접 검수한 결과를 답하면 메인 세션이 PASS/FAIL로 해석해 위 두 흐름 중 하나로 합류시킨다.
- 검증에 필요한 테스트가 화면·입력을 점유해 실행을 보류한 경우에는, 지금 실행할지 / 자리를 비울 때로 미룰지 / 창을 띄우지 않는 실행 경로를 마련할지를 사용자가 고른다. 승인 없이 임의로 실행하지 않는다.

---

## 상세 문서

spec 문서는 GitHub에서 참고할 수 있다.

- [OVERVIEW.md](https://github.com/angar2/taskery/blob/main/plan/OVERVIEW.md) — 시스템 진입 가이드와 전체 구조 개요.
- [SKILLS.md](https://github.com/angar2/taskery/blob/main/plan/SKILLS.md) — 스킬 9종의 상세 명세와 호출 흐름.
- [TASK-DOC.md](https://github.com/angar2/taskery/blob/main/plan/TASK-DOC.md) — task 문서의 작성 양식과 7 상태 머신의 동작 정의.
- [HOOKS.md](https://github.com/angar2/taskery/blob/main/plan/HOOKS.md) — catastrophic hook 2종의 정책과 예외 처리 절차.
- [DISTRIBUTION.md](https://github.com/angar2/taskery/blob/main/plan/DISTRIBUTION.md) — npx 배포 메커니즘과 자산 갱신 로직.
- [DECISIONS.md](https://github.com/angar2/taskery/blob/main/plan/DECISIONS.md) — 시스템 설계의 핵심 의사결정과 변경 이력.
- [PLAYBOOK.md](https://github.com/angar2/taskery/blob/main/plan/PLAYBOOK.md) — 향후 도입 가능한 기능 후보 목록.

---

## 라이센스

[MIT](LICENSE)
