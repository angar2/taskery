---
name: project-init
description: taskery 도입 직후 1회성 — PROJECT.md / AGENT-GUIDE.md / LINKED-REPOS.md / .env 빈 골격 생성
---

# /project-init

## 개요

taskery 도입 직후 **1회성**으로 호출. 사용자 또는 동료가 새 리포에 npx로 taskery 세팅 직후 처음 부르는 스킬. `.project/` 영역의 사람용/메인용 진입 문서 골격을 만든다.

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
```

### Step 4 — `.project/AGENT-GUIDE.md` 작성

메인 세션 진입 가이드. 새 메인 세션이 부르는 *"읽고 시작"* 문서.

```markdown
# AGENT-GUIDE.md

## 활성 plan 버전
<예: v1.0 — `.project/plans/v1.0/` 참조>

## 메인이 매 세션 시작 시 읽을 것
1. `CLAUDE.md` — 프로젝트 메타 + 검증 명령 + 룰 참조
2. `.project/PROJECT.md` — 프로젝트 개요
3. `.project/plans/<활성버전>/PLAN.md` — 활성 plan 진입 (이게 9 기획 문서 인덱스)
4. `.project/AGENT-GUIDE.md` — 본 파일 (그대로)

## 작업 흐름
- task 시작: `/task-init` 또는 `/task-plan`
- task 진행: `/task-dev` → `/task-test` → `/task-close`
- 회고: `/refine` (5 task마다 또는 사용자 호출)

## 폴더 구조
- `.project/rules/` — 코어 룰 (TASK_DOC_RULE / GIT_RULE)
- `.project/plans/<vX.X>/` — 9 기획 문서
- `.project/tasks/<vX.X>/` — task 문서
- `.project/flows/` — 도메인 흐름
- `.project/shared/` — 멀티리포 메시지
- `.project/changelog/` — 월별 변경 이력
- `.project/FRICTION_LOG.md` — 짜증 데이터

## 멀티리포
<단일 리포면 "단일 리포. LINKED-REPOS.md 빈 템플릿."
멀티 리포면 "LINKED-REPOS.md 참조">
```

### Step 5 — `.project/LINKED-REPOS.md` 작성

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
- `.project/plans/` (`.gitkeep` — `/plan-init`이 `vX.X/` 하위 작성)
- `.project/tasks/` (`.gitkeep` — `/task-init`이 `vX.X/<NNN>_<slug>.md` 작성)
- `.project/shared/{sent,received}/completed/` (`.gitkeep`)
- `.project/FRICTION_LOG.md` (빈 템플릿)
- `.project/rules/{TASK_DOC_RULE,GIT_RULE}.md` (코어 룰)

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
- *"PROJECT.md / AGENT-GUIDE.md / LINKED-REPOS.md / .env 생성. (FRICTION_LOG.md / 빈 골격 폴더는 npx init이 이미 카피한 것 그대로). **빈 폴더 케이스라 git init + dev 분기까지 완료** (이미 git 리포면 건너뜀). 다음은 `/plan-init <버전명>`으로 9 기획 문서 작성."*

**결과 commit 흐름** (GIT_RULE 정합):
- dev 직접 commit *금지* (git-guard.sh 차단). 두 가지 default 흐름:
  1. **첫 task에 묶기 (권장)**: `/plan-init` 끝나고 첫 `/task-init` (보통 TASK-001 부트스트랩 chore)으로 만든 작업 브랜치에서 init 산출물(PROJECT/AGENT-GUIDE/LINKED-REPOS/.env)도 함께 commit. task-close 단계의 "태스크 문서 커밋"에 자연스럽게 묶임.
  2. **임시 docs 브랜치**: `git checkout -b docs/{개발자}_init-bootstrap` 후 commit → dev에 `--no-ff` 머지. 첫 task 생성 *전*에 init 결과를 깔끔히 박고 싶을 때.

## 도구 가이드

- **Read**: 기존 README / package.json 정독
- **Write**: 신규 .md 파일 생성
- **Bash**: `mkdir -p .project/changelog .project/flows`, `ls`, `cat package.json | head -20`
- **AskUserQuestion**: 인터뷰 분기 시 질문 라운드 (한 번에 한 질문씩)

## 주의사항

- *덮어쓰기 default 금지* — 이미 PROJECT.md 있으면 confirm.
- 인터뷰 분기에서 *자동 추정 진행 금지*. 빈 프로젝트면 사용자 답 받고 작성.
- 한 번에 너무 많은 질문 X. 사용자 답 받고 다음 질문.
- 이 스킬은 **1회성**. 두 번째 호출은 의미 X (덮어쓰기 confirm 거치게 됨).

## 상태 전이

해당 없음 (project 레벨 — task 상태 X).
