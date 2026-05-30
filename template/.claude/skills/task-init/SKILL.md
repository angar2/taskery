---
name: task-init
description: task 시작 — 6 섹션 빈 골격 + 헤더 5컬럼 (status=draft) task.md 생성
---

# /task-init

## 개요

새 task 시작 시 호출. `.project/tasks/<vX.X>/` 안에 *빈 골격* task.md 생성. 헤더 5컬럼 채우고 6 섹션은 placeholder만. 상태는 `draft`로 작성.

본 스킬은 *생성만* 담당. Requirements / Scope / Dev Plan / Test Plan 본문은 다음 단계 `/task-plan`에서 채움.

## 호출 시점

- 새 task 시작 시 (사용자 발화: *"~~ 추가해줘"*, *"~~ 버그 고쳐"*, *"~~ 리팩터링"*).
- 직전 대화로 작업 맥락 명확해진 직후.

## 입력 처리

인자 = (선택) 주제 / 유형 / 규모 / 플랜. 예: `/task-init 로그인 기능` 또는 인자 없이 호출.

두 분기:
- **분기 1 (제안)**: 직전 맥락 명확 → 메인이 *"이렇게 task 만들까요?"* 제안 + 사용자 confirm.
- **분기 2 (인터뷰)**: 직전 맥락 부족 → 한 번에 한 질문씩 인터뷰.

**자동 추정 진행 X** — 사용자 confirm 또는 답 받기 전 파일 생성 금지.

## 단계

### Step 1 — active plan 버전 확인

1. `.project/AGENT-GUIDE.md` Read → *활성 plan 버전* 추출 (예: `v1.0`).
2. AGENT-GUIDE.md 없거나 활성 버전 누락 시 → 사용자에게 *"활성 plan 버전이 없는데 `/plan-init` 먼저 실행할까요?"* 묻고 중단.
3. `.project/plans/<vX.X>/` 디렉토리 존재 확인. 없으면 동일하게 `/plan-init` 안내 + 중단.

### Step 2 — 분기 판단 + 메타 수집

직전 대화 정독:
- 작업 주제 / 유형 / 규모 추정 가능?
  - **추정 가능** → 분기 1 (제안):
    *"직전 맥락 보니 다음 task 만들까요? 주제: <X> / 유형: <Y> / 규모: <Z> / 플랜: <vX.X>. 어떠세요?"*
    사용자 답 — *"OK"* / *"규모는 large야"* / *"유형은 bug야"* 등 부분 수정 받음.
  - **추정 불가** → 분기 2 (인터뷰): 한 번에 한 질문씩.
    - Q1: *"무슨 작업인가요? (한 줄로)"*
    - Q2: *"유형? (feature / bug / improvement / refactor / docs / chore)"*
    - Q3: *"규모? (micro / small / medium / large) — 잘 모르겠으면 추정 알려드림."*
    - (필요 시) Q4: *"플랜 버전 `<vX.X>` 맞나요?"*

수집 항목 (모두 확정되어야 진행):
- 주제 (한국어 — kebab-slug 변환은 Step 4에서)
- 유형: `feature` / `bug` / `improvement` / `refactor` / `docs` / `chore`
- 규모: `micro` / `small` / `medium` / `large`
- 플랜 버전: 활성 버전 그대로 (Step 1에서 가져온 값)

### Step 3 — TASK 번호 결정

1. `ls .project/tasks/<vX.X>/` 실행 → 디렉토리 안 파일/폴더 목록 추출.
2. 파일명 / 폴더명 패턴 검출:
   - 파일: `NNN_<slug>.md` (예: `001_login-form.md`, `012_db-migration.md`)
   - 폴더: `TASK-NNN_<slug>/` (예: `TASK-003_payment-flow/`)
3. NNN 최대값 + 1 = 새 task 번호. 빈 디렉토리면 `001`.
4. 3자리 zero-padded (`001`, `015`, `120`).

### Step 4 — 파일 vs 폴더 결정 + slug 변환

1. 파일 vs 폴더 분기:
   - **파일 default**: 단일 `NNN_<slug>.md` (예: `008_login-feature.md`).
   - **폴더 승격 조건**: (a) 규모 `large`, 또는 (b) 사용자 명시 *"폴더로 만들어줘"*, 또는 (c) task에 *추가 자료*(서브 문서 / mockup / 디자인) 다수 예상.
     → `TASK-NNN_<slug>/task.md` 생성. 추가 자료는 *task 폴더 안에 자유롭게* 위치.
   - **`spec-diffs/` + `screenshots/`는 *vX.X 공통* 사용**: 단일 파일이든 폴더 승격이든 `.project/tasks/<vX.X>/{spec-diffs,screenshots}/`에 위치 (파일명에 NNN prefix로 task 식별 — `<NNN>_<slug>_spec-diff.md`). task 폴더 안에 spec-diffs/screenshots 생성하지 않음.
   - 위 디렉토리는 `/plan-init` Step 5가 vX.X 만들 때 함께 mkdir됨. `/task-init`은 디렉토리 가정만, 직접 생성 X.
2. slug 변환 — 한국어 → 영어 kebab-case:
   - 짧고 명확하게 (3 단어 이내 권장).
   - 소문자 + 하이픈만. 예: *"로그인 기능 추가"* → `login-feature`, *"모바일 사파리 폼 새로고침 버그"* → `mobile-safari-form-refresh`.
3. 사용자에게 슬러그 confirm (선택):
   *"파일명: `<NNN>_<slug>.md` 어떠세요? (수정 원하면 말씀)"*

### Step 5 — 빈 골격 작성

`# TASK-<NNN> — <한국어 제목>` + 헤더 5컬럼 + 6 섹션 placeholder. 양식은 `template/.project/rules/TASK_DOC_RULE.md` §1.3 참조.

```markdown
# TASK-<NNN> — <한국어 제목>

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| <YYYY-MM-DD> | <vX.X> | <유형> | <규모> | draft |

## Requirements

(사용자 요구 + 메인 증폭 — `/task-plan`에서 채움)

## Scope

(영향 범위 — `/task-plan`에서 채움)

## Dev Plan

(Phase 1, 2, ... — `/task-plan`에서 채움)

## Test Plan

(테스트 방법 + 검증 명령 — `/task-plan`에서 채움)

## Result

(진행 + 테스트 결과 — `/task-dev`, `/task-test`에서 채움)
```

- 6 섹션 placeholder는 *빈 헤딩 + 한 줄 안내*. 구체 내용 X.
- 폴더 승격 시 `TASK-<NNN>_<slug>/task.md`로 동일 본문 작성. spec-diffs/screenshots는 vX.X 공통(`.project/tasks/<vX.X>/{spec-diffs,screenshots}/` — `/plan-init` Step 5가 mkdir)을 그대로 사용. task 폴더 안에 spec-diffs/screenshots 별도 생성 X.

### Step 6 — 결과 보고

```
✅ TASK-<NNN> 생성 완료
- 파일: .project/tasks/<vX.X>/<NNN>_<slug>.md (또는 폴더 승격 시 경로)
- 헤더: <생성일> / <vX.X> / <유형> / <규모> / draft
- 다음: /task-plan TASK-<NNN> 으로 기획 채우기
```

## 도구 가이드

- **Read**: `.project/AGENT-GUIDE.md` (활성 버전 확인)
- **Bash**: `ls .project/tasks/<vX.X>/` (NNN 결정), `mkdir -p .project/tasks/<vX.X>/TASK-<NNN>_<slug>` (폴더 승격 시 — task 폴더 자체만, spec-diffs/screenshots는 vX.X 공통 사용)
- **Write**: 새 task.md 생성
- **AskUserQuestion**: 분기 2 인터뷰 (한 번에 한 질문)

## 주의사항

- **본문 채우기 금지** — 본 스킬은 *빈 골격 생성만*. Requirements / Scope / Dev Plan / Test Plan 본문은 *반드시* `/task-plan`에서. 미리 채우면 task 의도가 흐트러져 다음 단계 인터뷰 흐름이 깨짐.
- **단계 경계 — 허용/금지 명시 (stash FRICTION_LOG #11 반영)**:
  - **허용 (화이트리스트)**: `.project/plans/<활성버전>/ROADMAP.md` §4(다음 작업 영역) 확인 / `ls .project/tasks/<vX.X>/` (다음 NNN 결정) / 빈 골격 Write
  - **금지 (블랙리스트)**: ARCHITECTURE.md / API-SPEC.md / FEATURES.md 등 9 기획 문서 본문 Read / 도메인 코드 (Sources / src 등) Read · Grep / 기존 task 본문 Read
  - 본문 정보 수집은 *다음 단계 `/task-plan` Step 2~3*에서 수행. 본 스킬에서 미리 수집하면 단계 경계가 무너지고 다음 단계 인터뷰 흐름이 깨짐.
- **자동 추정 진행 X** — 직전 맥락 명확해도 *제안 + 사용자 OK* 거친 후 파일 생성. 맥락 부족 시 인터뷰. 빠뜨린 메타(유형/규모) 채로 작성 금지.
- **상태는 `draft` 고정** — `/task-init` 끝의 상태는 `draft` 외 작성 금지. 다음 상태(`planned`)는 `/task-plan` 끝에 갱신.
- **NNN 충돌 회피** — `ls` 결과 정확히 파싱. 파일/폴더 둘 다 검사 (폴더 승격 task의 NNN도 같은 시퀀스).
- **slug 한국어 잔존 X** — 영어 kebab-case로 변환. *"로그인-기능"* 같은 한글 슬러그 금지.
- **헤더 5컬럼 모두 채움** — *"미정"* placeholder 작성 금지. 메타 부족하면 사용자에게 묻기.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| (없음 — 신규 생성) | `draft` |
