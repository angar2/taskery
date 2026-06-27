---
name: project-init
description: taskery 도입 직후 1회성 — 진입 문서(PROJECT/AGENT-GUIDE/…) + 제품 관통 기획 문서(그룹 A 작성 / 그룹 B 골격) 생성
---

# /project-init

## 개요

taskery 도입 직후 **1회성**으로 호출. 사용자 또는 동료가 새 리포에 npx로 taskery 세팅 직후 처음 부르는 스킬. `.project/` 영역의 사람용/메인용 진입 문서와 **제품 관통 기획 문서**(루트 평평 배치)를 만든다.

제품 관통 문서 2그룹 (`.project/` 루트):
- **그룹 A — 정적(내용까지 작성)**: SERVICE-POLICY.md / TECH-STACK.md / ARCHITECTURE.md. project-init이 인터뷰로 *작성*. (이후 plan-init은 부수적 add/mod만.)
- **그룹 B — 성장(골격→채움)**: DATA-MODEL.md / API-SPEC.md / FEATURES.md / UX-UI.md. project-init이 *빈 골격*만. 기능 그룹별 본문은 이후 plan-init(FEATURES/UX-UI 의도) + task 진행(DATA-MODEL/API-SPEC 상세)이 채움.

> **plan 로컬 문서**(PLAN.md / ROADMAP.md)는 본 스킬이 만들지 않는다 — 그건 `/plan-init`이 plan(기능 그룹) 폴더마다 생성한다.

## 호출 시점

- `npx @angar2/taskery init` 또는 `npx -p @angar2/taskery create-taskery <name>` 직후 첫 메인 세션.
- 또는 기존 리포에 taskery 사후 도입 후 첫 세션.

## 입력 처리

인자 없음. 두 분기:
- **빈 프로젝트**: 사용자에게 질문 라운드 (프로젝트명/타입/멀티리포 여부 등).
- **기존 코드 있음**: 코드베이스 분석 → 메타 추정 + 사용자 confirm.

`.project/PROJECT.md` 이미 존재 시 → 경고 + confirm. *덮어쓰기 default X*.

## 단계

### Step 1 — 환경 점검 + 분기 판단

1. `.project/PROJECT.md` 존재 확인.
   - 존재 시: 사용자에게 *"이미 있는데 덮어쓸까? (y/N)"* 묻고 N이면 종료.
2. `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `pom.xml` 등 *기존 프로젝트 마커* 확인.
   - 있음 → "기존 코드 분석" 분기.
   - 없음 → "빈 프로젝트 인터뷰" 분기.

### Step 2 — 메타 수집 (분기별)

**기존 코드 분석 분기**:
1. README.md / package.json / 디렉토리 구조 정독.
2. 프로젝트 추정값 작성 (이름 / 타입 / 도메인).
3. 사용자에게 *"이렇게 이해했는데 맞아?"* 한 번 confirm.

**빈 프로젝트 인터뷰 분기**:
1. 질문 라운드 — 한 번에 한 질문씩, 사용자 답 받고 다음:
   - Q1: 프로젝트 이름?
   - Q2: 타입? (frontend / backend / fullstack / cli / library / other)
   - Q3: 도메인/한 줄 비전?
   - Q4: 단일 리포 / 멀티 리포?
   - Q5: (멀티 리포 시) 연결 리포 목록 + 각 역할?

### Step 3 — `.project/PROJECT.md` 작성

사람용 진입 문서. 개발자가 *"이 프로젝트 뭐 하는 거야?"* 알 수 있게.

```markdown
# <프로젝트명>

## 개요
<한 줄 비전>

## 도메인
<예: 이커머스 / SaaS / 개인 블로그 등>

## 타입
<frontend / backend / fullstack / ...>

## 멀티리포 여부
<단일 / 멀티 — 멀티면 LINKED-REPOS.md 참조>

## 시작
- 의존성 설치: `<명령>`
- 개발 서버: `<명령>`
- 빌드: `<명령>`
- 테스트: `<명령>`

## 디렉토리 구조
- `src/` — 소스 코드
- `.project/` — taskery 메타 영역
- ...

## 초기 빌드 로드맵
<프로젝트 전체를 관통하는 *거시 빌드 순서* — 구현 → 배포 → 보안 등 큰 덩어리 단계.
1회성 기록(완료돼도 living 갱신 X). 기능 그룹 단위 task 순서는 plans/<NNN_slug>/ROADMAP.md, 앞으로의 후보는 글로벌 BACKLOG.md가 담당 — 셋은 역할이 안 겹친다.>

1. <예: 코어 도메인 + 데이터 모델 구현>
2. <예: 인증 / 권한>
3. <예: 배포 파이프라인 + 스테이징>
4. <예: 보안 점검 + 프로덕션>
```

> `## 초기 빌드 로드맵`은 Step 2 인터뷰에서 *거시 단계*를 1~2개 질문으로 수집해 채운다. 비어 있으면 자리표시자만 두고 사용자에게 *"전체 빌드 순서 큰 덩어리로 알려줘"* 1회 질문.

### Step 3.5 — 제품 관통 문서 그룹 A 작성 (`.project/` 루트)

정적 제품 관통 문서 3종(그룹 A)을 *인터뷰로 작성*. 프로젝트 t=0의 상위 정책/스택/구조 — "척추"만 단단히. 한 문서씩 핵심 질문 1~3개, 사용자 답 받고 작성.

**타입 조건부**: `frontend` → SERVICE-POLICY 생략 가능 / `backend` → (해당 없음, 3종 모두) / `library`·`cli` → SERVICE-POLICY 생략 가능. 무관 문서는 *생성 안 함*(빈 골격도 X).

1. **SERVICE-POLICY.md** (백엔드/풀스택 등 해당 시): 사용자 권한 / 데이터 보존 / 결제·과금 정책 등 핵심 1~3개.
2. **TECH-STACK.md**: 언어 / 프레임워크 / 주요 라이브러리 + *선택 이유*.
3. **ARCHITECTURE.md**: 시스템 구조 (단일 / 레이어드 / 마이크로서비스 / 멀티 리포 등) + 핵심 경계.

각 문서 공통 골격:

```markdown
# <SERVICE-POLICY | TECH-STACK | ARCHITECTURE> — <프로젝트명>

> 제품 관통 문서 (정적, 그룹 A). project-init이 작성, 이후 변경은 해당 정책/스택/구조를
> 새로 도입·변경하는 task에서 spec-diff와 함께 갱신.

<인터뷰 답 기반 본문>
```

### Step 3.6 — 제품 관통 문서 그룹 B 골격 (`.project/` 루트)

성장 제품 관통 문서 4종(그룹 B)을 *빈 골격*만 Write. 본문은 plan/task가 채운다 — 여기서 *선기획 금지*.

**타입 조건부**: `frontend` → DATA-MODEL / API-SPEC 생략 가능 / `backend` → UX-UI 생략 가능 / `library` → UX-UI 생략 가능. 무관 문서는 생성 안 함.

- **FEATURES.md** / **UX-UI.md** — *plan-init이 기능 그룹마다 의도 섹션 append*.
- **DATA-MODEL.md** / **API-SPEC.md** — *task 진행(task-plan Phase 0 / task-dev)이 구현 동반으로 상세 채움*. 선스펙 금지.

공통 골격 (각 문서):

```markdown
# <FEATURES | UX-UI | DATA-MODEL | API-SPEC> — <프로젝트명>

> 제품 관통 문서 (성장, 그룹 B). 기능/도메인 섹션으로 자기기술(self-describing) —
> 어느 plan이 추가했는지 태그하지 않는다(기능 분류 = 본 문서 섹션 구조가 단일 진실).
> FEATURES/UX-UI: plan-init이 기능 그룹마다 의도 섹션 추가.
> DATA-MODEL/API-SPEC: task 진행이 스키마·엔드포인트를 구현 동반으로 채움(선스펙 금지).

<!-- 기능 그룹 / 도메인 섹션이 여기 누적된다. 초기엔 비어 있음. -->
```

### Step 4 — `.project/AGENT-GUIDE.md` 작성

메인 세션 진입 가이드. 새 메인 세션이 부르는 *"읽고 시작"* 문서.

```markdown
# AGENT-GUIDE.md

## 활성 plan 버전   <!-- 값 = NNN_slug 폴더명(버전 아님). 헤딩 텍스트는 lib.js/스킬이 의존하므로 변경 X -->
<예: 001_mvp — `.project/plans/001_mvp/` 참조>

## 메인이 매 세션 시작 시 읽을 것
1. `CLAUDE.md` — 프로젝트 메타 + 검증 명령 + 룰 참조
2. `.project/PROJECT.md` — 프로젝트 개요 + 초기 빌드 로드맵
3. `.project/` 루트 제품 관통 문서 — SERVICE-POLICY / TECH-STACK / ARCHITECTURE / DATA-MODEL / API-SPEC / FEATURES / UX-UI (해당 시. 기능 분류 단일 진실)
4. `.project/plans/<활성 plan>/PLAN.md` — 활성 plan(기능 그룹) 인덱스 (이 그룹이 건드린 루트 문서 요약 + task 체크리스트)
5. `.project/GLOSSARY.md` — 도메인 용어집 (영문/한글 표기 일관성 단일 진실 소스)
6. `.project/tasks/<활성 plan>/BACKLOG.md` — 현재 plan 진행 중 누적된 후속 task 후보 (사용자 발화 *"이건 다음 task로"* / task-close 직후 메인 감지로 추가)
7. `.project/AGENT-GUIDE.md` — 본 파일 (그대로)

## 작업 흐름
- task 시작: `/task-init` 또는 `/task-plan`
- task 진행: `/task-dev` → `/task-test` → `/task-close`
- 불편 등록: `/log-friction` (사용자 호출 / 발화 캐치 / task-close 자체 감지)

## 폴더 구조
- `.project/rules/` — 코어 룰 (TASK_DOC_RULE / GIT_RULE / CHANGELOG_RULE / MOCKUP_RULE)
- `.project/*.md` (루트) — 제품 관통 문서 (SERVICE-POLICY / TECH-STACK / ARCHITECTURE / DATA-MODEL / API-SPEC / FEATURES / UX-UI)
- `.project/plans/<NNN_slug>/` — plan(기능 그룹) 로컬: PLAN.md / ROADMAP.md
- `.project/tasks/<NNN_slug>/` — task 문서
- `.project/flows/` — 도메인 흐름
- `.project/shared/` — 멀티리포 메시지
- `.project/changelog/` — 월별 변경 이력
- `.project/FRICTION_LOG.md` — 불편 데이터

## 멀티리포
<단일 리포면 "단일 리포. LINKED-REPOS.md 빈 템플릿."
멀티 리포면 "LINKED-REPOS.md 참조">
```

### Step 4.5 — `.project/GLOSSARY.md` 작성 (도메인 용어집)

stash FRICTION_LOG #3 반영 — 프로젝트 도메인 용어를 *영문/한글 표기 일관성* 단일 진실 소스로 모음. 코드 메서드명·변수명 / 대화·문서 한글 표기 통일.

```markdown
# GLOSSARY — <프로젝트명>

> 본 프로젝트에서 사용하는 도메인 용어집. 코드 식별자 / 문서 / 대화 모두 본 표 기준.
> 새 용어 추가 시 영문 알파벳 순 정렬 유지.

| 영문 | 한글 | 정의 | 출처 |
|------|------|------|------|
| | | | |

## 운용 룰

- 영문 알파벳 순 정렬
- 출처: 본 용어가 도입된 제품 문서/task 경로 (예: `.project/FEATURES.md`)
- 동의어 / 변형 표기 발견 시 본 표 기준으로 정합
```

빈 표만 작성. 본문은 plan/task 진행하면서 사용자가 채움.

### Step 5 — `.project/LINKED-REPOS.md` 작성

멀티리포 구성 명세. 단일 리포면 빈 템플릿만, 멀티 리포면 연결 리포 목록까지.

```markdown
# LINKED-REPOS.md

## 멀티리포 여부
<단일 / 멀티>

## 연결 리포 목록
<단일 리포면 "해당 없음">
<멀티 리포면 표로 정리>

| 리포명 | 역할 | 경로 (.env 변수명) |
|--------|------|------|
| ... | ... | ... |

## 세션 간 통신
- 송신: `.project/shared/sent/<filename>.md` 작성
- 수신: `.project/shared/received/<filename>.md` 정독
- 처리 완료: `sent/completed/` 또는 `received/completed/`로 이동
```

### Step 6 — `.project/.env` 빈 템플릿

```bash
# 멀티리포 환경 변수 (gitignore 대상)
# 예시:
# REPO_FRONTEND_PATH=/Users/.../my-app-frontend
# REPO_BACKEND_PATH=/Users/.../my-app-backend
```

### Step 7 — `.project/` 빈 골격 점검

`npx @angar2/taskery init`이 이미 다음 빈 골격 폴더 생성:
- `.project/changelog/` (`.gitkeep`)
- `.project/flows/` (`.gitkeep`)
- `.project/plans/` (`.gitkeep` — `/plan-init`이 `NNN_slug/` 하위 작성)
- `.project/tasks/` (`.gitkeep` — `/task-init`이 `NNN_slug/TASK-<NNN>_<slug>.md` 작성)
- `.project/shared/{sent,received}/completed/` (`.gitkeep`)
- `.project/FRICTION_LOG.md` (빈 템플릿)
- `.project/rules/{TASK_DOC_RULE,GIT_RULE,CHANGELOG_RULE,MOCKUP_RULE}.md` (코어 룰)

→ `/project-init`은 폴더 생성 X. 누락 시(`init` 안 거치고 수동 셋업한 경우)에만 `mkdir -p` 실행.

```bash
# 누락 시에만:
mkdir -p .project/{changelog,flows,plans,tasks}
mkdir -p .project/shared/sent/completed .project/shared/received/completed
```

`.project/FRICTION_LOG.md`도 `init`이 카피한 빈 템플릿 그대로 사용. **이미 있으면 덮어쓰기 X** — 사용자 데이터 보호.

### Step 7.5 — git 초기화 + 첫 ref 분기 (빈 폴더 케이스)

`git status`가 *fatal: not a git repository* 에러면 빈 폴더 진입 케이스. 다음 4단계 실행:

```bash
git status 2>&1 | head -1
# "fatal: not a git repository" 면 미초기화
```

미초기화 시:

```bash
git init
git commit --allow-empty -m "chore: root commit"   # ref 생성용 (commit 0 상태에선 branch 만들어도 ref 안 박힘)
git symbolic-ref --short HEAD                       # 현재 default branch 확인 (예: main 또는 master)
git branch dev                                       # 같은 sha에 dev 분기
git branch -a                                        # main(또는 master) + dev 둘 다 떠야 함
```

이렇게 하지 않으면 첫 task `git checkout -b feature/...`까지는 동작하지만 **dev 브랜치 ref 자체가 없어서** `--no-ff` 머지 시점에 막힘. 사용자가 수동 `git branch dev <root-sha>` 매핑 필요.

이미 git 초기화된 리포면 (status 정상) 이 step 건너뜀.

> root commit이 빈 commit으로 박히는 게 싫으면 생략 가능. 단 그러면 첫 task chore commit이 박히기 *전엔* dev/main ref 못 만듦 → 첫 머지 직전에 사용자/메인이 명시 매핑 필요.

### Step 8 — 결과 보고

작성된 파일 목록 + 다음 단계 안내:
- *"PROJECT.md(초기 빌드 로드맵 포함) / AGENT-GUIDE.md / LINKED-REPOS.md / GLOSSARY.md / .env + 제품 관통 문서(그룹 A 작성: SERVICE-POLICY·TECH-STACK·ARCHITECTURE / 그룹 B 골격: DATA-MODEL·API-SPEC·FEATURES·UX-UI, 타입 해당분) 생성. (FRICTION_LOG.md / 빈 골격 폴더는 npx init이 이미 카피한 것 그대로). **빈 폴더 케이스라 git init + dev 분기까지 완료** (이미 git 리포면 건너뜀). 다음은 `/plan-init <기능그룹>`으로 첫 plan(MVP면 여러 기능 그룹을 묶은 큰 plan) 작성."*

**결과 commit 흐름** (GIT_RULE 정합):
- dev 직접 commit *금지* (git-guard.sh 차단). 두 가지 default 흐름:
  1. **첫 task에 묶기 (권장)**: `/plan-init` 끝나고 첫 `/task-init` (보통 TASK-001 부트스트랩 chore)으로 만든 작업 브랜치에서 init 산출물(PROJECT/AGENT-GUIDE/LINKED-REPOS/.env)도 함께 commit. task-close 단계의 "태스크 문서 커밋"에 자연스럽게 묶임.
  2. **임시 docs 브랜치**: `git checkout -b docs/{개발자}_init-bootstrap` 후 commit → dev에 `--no-ff` 머지. 첫 task 생성 *전*에 init 결과를 깔끔히 기록하고 싶을 때.

## 도구 가이드

- **Read**: 기존 README / package.json 정독
- **Write**: 신규 .md 파일 생성 (진입 문서 + 제품 관통 문서 그룹 A/B)
- **Bash**: `mkdir -p .project/changelog .project/flows`, `ls`, `cat package.json | head -20`
- **AskUserQuestion**: 인터뷰 분기 시 질문 라운드 — 메타 + 초기 빌드 로드맵 + 그룹 A(정책/스택/구조) 핵심 질문 (한 번에 한 질문씩)

## 주의사항

- *덮어쓰기 default 금지* — 이미 PROJECT.md 있으면 confirm.
- 인터뷰 분기에서 *자동 추정 진행 금지*. 빈 프로젝트면 사용자 답 받고 작성.
- 한 번에 너무 많은 질문 X. 사용자 답 받고 다음 질문.
- **그룹 A는 "척추"만** — 상위 정책/스택/구조에 한정. 세부까지 파고들어 t=0 과부담 만들지 말 것.
- **그룹 B는 골격만** — DATA-MODEL/API-SPEC 스키마·엔드포인트 *선작성 금지*(선기획 함정). 본문은 task 진행이 구현 동반으로 채운다.
- **타입 조건부 생략** — frontend → SERVICE-POLICY/DATA-MODEL/API-SPEC 생략 가능, backend → UX-UI 생략 가능. 무관 문서는 골격조차 만들지 않는다.
- 이 스킬은 **1회성**. 두 번째 호출은 의미 X (덮어쓰기 confirm 거치게 됨).

## 상태 전이

해당 없음 (project 레벨 — task 상태 X).
