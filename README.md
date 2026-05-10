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
| `closed` | git 커밋 + dev 병합 완료 |

> 상태별 전이 조건과 task 문서 양식은 [TASK-DOC.md](https://github.com/angar2/taskery/blob/main/plan/TASK-DOC.md)에서 확인 가능

---

## 빠른 시작

> **요구 사항**: Node.js ≥ 18.

### npx

특정 프로젝트에 일회성 다운로드 방식.

```bash
# 새 프로젝트
npx -p @angar2/taskery create-taskery <project-name>

# 기존 프로젝트에 도입
cd <project-name>
npx @angar2/taskery init

# 최신 버전 머지 갱신
npx @angar2/taskery update
```

### 글로벌 npm install


```bash
# 글로벌 설치
npm install -g @angar2/taskery

# 새 프로젝트
create-taskery <project-name>

# 기존 프로젝트에 도입
cd <project-name>
taskery init

# 최신 버전 머지 갱신
taskery update
```

---

## 패키지 디렉토리 구조

`taskery init` 직후 골격:

```
my-app/
├─ CLAUDE.md                              # AI 에이전트 진입 문서
├─ .taskery-manifest.json                 # 패키지 업데이트 추적
├─ .gitignore
├─ .claude/
│   ├─ settings.json                      # hook 등록 (PreToolUse 매칭)
│   ├─ skills/<skil-name>/SKILL.md        # 8 skill
│   └─ hooks/<hook-name>.sh               # 3 hook
└─ .project/
    ├─ PROJECT.md                         # 프로젝트 개요
    ├─ AGENT-GUIDE.md                     # AI 에이전트 가이드
    ├─ LINKED-REPOS.md                    # 관계 리포지토리 정보
    ├─ .env                               # 사용자 설정 환경변수 (관계 리포지토리 환경변수 등)
    ├─ rules/
    │   ├─ TASK_DOC_RULE.md               # task 문서 작성 규칙
    │   ├─ GIT_RULE.md                    # 로컬 깃 운영 규칙
    │   └─ *.local.md                     # 사용자 오버라이드 규칙 (패키지 업데이트 대상 제외)
    ├─ plans/                             # plan 문서
    ├─ tasks/                             # task 문서
    ├─ flows/                             # 서비스 로직 플로우 정보
    ├─ changelog/                         # 수정사항 정보
    ├─ shared/                            # 관계 리포지토리 소통 메세지함
    │   ├─ sent/completed/
    │   └─ received/completed/
    └─ FRICTION_LOG.md                    # taskery 불편사항 누적 로그
```

---

## Skills

스킬은 호출 시점에 따라 4 카테고리(`project` / `plan` / `task` / `meta`)로 분류된다.

- `project` — 프로젝트 첫 도입 시 1회만 호출
- `plan` — 새 기획 버전 시작 시 호출
- `task` — 새 task 작업 진행 단계에서 호출
- `meta` — 그 외 taskery 관리

| 스킬 | 레벨 | 역할 |
|------|------|------|
| `/project-init` | project | 프로젝트 첫 도입 시 메타 문서와 디렉토리 골격 생성 (1회성) |
| `/plan-init` | plan | 새 기획 버전의 기획 문서 작성 |
| `/task-init` | task | 새 task의 빈 문서 생성 |
| `/task-plan` | task | task의 요구사항·범위·개발 계획·테스트 계획 작성 |
| `/task-dev` | task | 계획에 따른 단계별 구현 + 자가 검증 |
| `/task-test` | task | 별도 격리 세션에서 독립 검증 (메인 가정 차단) |
| `/task-close` | task | 최종 검증 후 git 커밋 + dev 브랜치 `--no-ff` 병합 |
| `/refine` | meta | 누적된 불편 기록 분석 + 반복 패턴과 보강 후보 제안 |

각 스킬은 슬래시로 직접 호출하거나, 사용자 발화의 의미가 스킬의 frontmatter description과 매칭되면 메인 세션이 자동으로 발동시킨다.

> 각 스킬의 호출 시점, 입력 처리 방식, 단계별 절차, 주의사항은 [plan/SKILLS.md](https://github.com/angar2/taskery/blob/main/plan/SKILLS.md)에서 확인 가능

---

## Hooks

| Hook | 작동 시점 | 차단 대상 |
|------|---------|---------|
| `git-guard.sh` | git 명령 실행 직전 | 주력 브랜치 직접 커밋 / `--force` / `--no-verify` / 강제 브랜치 삭제 / `reset --hard` / `clean -fd` |
| `pre-commit-verify.sh` | `git commit` 실행 직전 | 검증 명령(린트·타입체크·빌드·테스트) 통과 실패 commit |
| `closed-immutable.sh` | 파일 수정 직전 | 완료(`closed`)된 task.md 본 파일 재수정 (관련 spec-diff·스크린샷은 자유) |

hook은 catastrophic 사고만 차단한다. 정상 흐름에는 간섭하지 않는다.

---

## 워크플로우 예시

```bash
# 사용자 프로젝트 첫 셋업
cd <project-name>
npx @angar2/taskery init
```

이후 메인 세션에 진입(`CLAUDE.md` 자동 정독)하여 다음 시퀀스로 호출한다. task 5 스킬은 호출과 동시에 상태를 전이시킨다.

```
/project-init                  # 진입 메타 문서와 디렉토리 골격 생성
/plan-init v1.0                # v1.0 기획 문서 작성
/task-init                     # — → draft : 첫 task의 빈 문서 생성
/task-plan TASK-001            # draft → planned : 요구사항·범위·개발 계획·테스트 계획 작성
/task-dev TASK-001             # planned → developed : 단계별 구현과 자체 검증
/task-test TASK-001            # developed → tested : 별도 격리 세션으로 독립 검증
/task-close TASK-001           # tested → closed : 최종 검증 후 git 커밋과 dev 병합

# 5 task 후 회고
/refine                        # 불편 기록 분석과 보강 후보 제안
```

**실패·불확정 분기** — `/task-test`가 FAIL 또는 UNCERTAIN을 반환하면 메인 세션이 사용자에게 판단을 묻고, 사용자의 자연어 답변에서 의도를 해석해 다음 흐름을 *자동 발동*한다(별도 슬래시 호출 없이 진행됨).

- 사용자가 재구현을 요청하면 → `testing` → `developing`으로 회귀해 `/task-dev`가 자동 발동된다.
- 사용자가 결함을 인지한 채 종결을 지시하면 → `testing` → `tested`로 진행하고 결함을 명시한 후 `/task-close`로 이행된다.
- UNCERTAIN(자동 검증이 불가능한 시나리오)은 사용자가 직접 검수한 결과를 답하면 메인 세션이 PASS/FAIL로 해석해 위 두 흐름 중 하나로 합류시킨다.

---

## 상세 문서

본 리포 spec 문서는 npm 패키지에 포함되지 않는다. GitHub에서 참고할 수 있다.

- [plan/OVERVIEW.md](https://github.com/angar2/taskery/blob/main/plan/OVERVIEW.md) — 시스템 진입 가이드와 전체 구조 개요.
- [plan/SKILLS.md](https://github.com/angar2/taskery/blob/main/plan/SKILLS.md) — 스킬 8종의 상세 명세와 호출 흐름.
- [plan/TASK-DOC.md](https://github.com/angar2/taskery/blob/main/plan/TASK-DOC.md) — task 문서의 작성 양식과 7 상태 머신의 동작 정의.
- [plan/HOOKS.md](https://github.com/angar2/taskery/blob/main/plan/HOOKS.md) — catastrophic hook 3종의 정책과 예외 처리 절차.
- [plan/DISTRIBUTION.md](https://github.com/angar2/taskery/blob/main/plan/DISTRIBUTION.md) — npx 배포 메커니즘과 자산 갱신 로직.
- [plan/DECISIONS.md](https://github.com/angar2/taskery/blob/main/plan/DECISIONS.md) — 시스템 설계의 핵심 의사결정과 변경 이력.
- [plan/PLAYBOOK.md](https://github.com/angar2/taskery/blob/main/plan/PLAYBOOK.md) — 향후 도입 가능한 기능 후보 목록.

---

## 라이센스

[MIT](LICENSE)
