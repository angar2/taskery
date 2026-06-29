---
name: add-backlog
description: 사용자 발화로 *plan(기능 그룹)별* tasks/<NNN_slug>/BACKLOG.md에 task 후보 1건 추가 — 얕은 분석(개요/대상 영역) + BL-NNN 채번 + withMetaLock 직렬화 (0.1.2+)
---

# /add-backlog

## 개요

`/add-backlog`는 사용자 발화를 받아 *plan(기능 그룹)별 백로그* `.project/tasks/<NNN_slug>/BACKLOG.md`에 task 후보를 1건씩 누적한다. 멀티세션 환경에서 `withMetaLock`으로 동시 쓰기 직렬화. **얕은 분석**만 — 코드 직접 탐색 X, 추정 수준. 본격 분석은 다음 단계 `/task-plan`에서.

글로벌 `.project/BACKLOG.md` (plan 기획 후보 카탈로그) 는 `/plan-init` 영역으로 본 스킬 무관.

## 호출 시점

- 사용자 명시 호출: `/add-backlog 로그인 빈 화면 떠`
- 발화 캐치: *"~ 백로그에 추가해 줘"* / *"백로그에 ~"* 등 백로그 추가 의도 발화 description 매칭으로 메인이 자동 발동

## 입력 처리

- 무인자 호출: 사용자가 *"백로그 추가"*만 말한 경우 — 어떤 항목인지 한 줄 인터뷰
- 인자 호출: 인자에 백로그 후보 주제. 1건 기본. 다건 명시 시 순차 처리

## 단계 (Step 1~6)

### Step 1 — 사전 검증

- 메인 워크트리 검출:
  ```sh
  MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
  ```
- 메인 워크트리 dev 체크아웃 검증 — 위배 시 사용자 호출 + 중단
- 활성 plan 검출 — `$MAIN_WT/.project/AGENT-GUIDE.md` `## 활성 plan 버전` 섹션 다음 비어 있지 않은 첫 줄에서 활성 plan 식별자(첫 토큰 — `NNN_slug` 폴더명) 추출
- BACKLOG.md 경로 = `$MAIN_WT/.project/tasks/<NNN_slug>/BACKLOG.md`. 부재 시 사용자 호출: *"`/plan-init` 먼저 호출해 활성 plan 디렉토리 + 빈 BACKLOG.md 생성 필요"* + 중단

### Step 2 — 백로그 항목 후보 추출

- 사용자 발화에서 1건 추출. 다건 명시 시 순차 처리 (각 1건씩 본 흐름 반복)
- 입력이 비어 있으면 사용자에게 *"어떤 항목? 한 줄로 알려줘"* 인터뷰

### Step 3 — 얕은 분석 (LLM, 코드 탐색 X)

추정 수준의 메타 산출:
- **유형** (`feature` / `bug` / `improve` / `refactor` / `docs` / `chore`) — 자동 추정, 모호 시 사용자 confirm
- **제목** — 한 줄, 간결, 한국어
- **개요** — 한 줄. bug → 원인 추정 / feature → 구상 / improve → 개선 방향
- **대상 영역** — 한 줄. 이 파일 / 모듈일 거다 — 추정 수준

> *코드 직접 탐색 금지*. 본격 분석은 다음 단계 `/task-plan`에서. 본 스킬은 *메모지 누적*만.

### Step 4 — 결정적 슬러그 산출

- 한국어 제목 → 영어 *의미 변환* → kebab-case (3 단어 이내, 음역 X)
- 예: *"로그인 페이지 빈 화면"* → `login-empty-page` / *"다크모드 토글"* → `dark-mode-toggle`

### Step 5 — BL-NNN 채번 + append (CLI)

`npx @angar2/taskery backlog-add` 한 줄로 처리한다. 채번(`BL-NNN` 최대+1) · 항목 블록 서식 · placeholder 치환 · `withMetaLock` 직렬화는 전부 코드가 보장한다 (손 파싱/Edit 불필요).

```sh
npx @angar2/taskery backlog-add \
  --type "<유형>" --title "<제목>" --slug "<슬러그>" \
  --summary "<개요>" --target "<대상 영역>"
```

- 성공 시 결과 JSON 한 줄 출력 — `{ "blNum", "blId" }`. Step 6 보고에 이 `blId`를 사용한다.
- 활성 plan BACKLOG.md 부재 / 인자 누락 시 stderr + exit 1 — 메시지 그대로 사용자에게 보고 + 중단.

### Step 6 — 결과 보고

```
✅ BL-<NNN> [<유형>] <제목> — <NNN_slug> 백로그 추가됐어.
   - 개요: <개요>
   - 대상 영역: <대상 영역>
   - 슬러그: <slug>
다음: 진행 의향이면 *"BL-<NNN> 진행"*이라고 말해. `/task-init`이 메타 그대로 받아 워크트리를 분기하고 항목을 `[x]` 확인 마킹할게.
```

## 도구 가이드

- **Bash**: 메인 워크트리 검출 / dev 체크아웃 검증 / `npx @angar2/taskery backlog-add` 호출(채번+append) / 결과 JSON 파싱
- **Read**: `$MAIN_WT/.project/AGENT-GUIDE.md` (활성 plan 검출) / 기존 BACKLOG.md 정독 (중복 / 유사 항목 사전 확인)
- **AskUserQuestion**: 유형 모호 시 confirm — 한 번에 한 질문

## 주의사항

- **얕은 분석만** — 본 스킬에서 도메인 코드 Read · Grep 금지. 본격 분석은 `/task-plan`
- **유형 자동 추정 + 모호 시 confirm** — *"메뉴 검색 개선"* 같이 feature/improve 모호 시 사용자 결정 받기
- **메인 워크트리 dev 검증 누락 X** — 위배 시 즉시 중단. 워크트리 안에서 호출돼도 메인 절대 경로의 BACKLOG.md에 쓰기
- **활성 plan 부재 시 즉시 중단** — `AGENT-GUIDE.md` 부재 / `## 활성 plan 버전` 섹션 부재 / plan 식별자 미설정(`<예: …>` 자리표시자) 모두 명확한 에러 메시지 후 사용자 호출
- **결정적 슬러그 best-effort** — LLM 비결정성 수용. race 차단 본체는 SSoT 2층(`/task-init` §4.4)이 담당. 슬러그 변형 발생 시 사용자 confirm
- **글로벌 BACKLOG.md (plan 기획 후보)** 와 혼동 X — 본 스킬은 *활성 plan(기능 그룹)별*만 다룸. 글로벌은 `/plan-init` 영역
- **자동 추정 진행 X** — 유형 / 제목 / 개요 / 대상 영역 모두 사용자 OK 또는 명백한 발화 매칭 후에만 BACKLOG.md 쓰기

## 상태 전이

해당 없음 (백로그 메모지 누적 — task 상태 X).

## 멀티세션 정합

- **위치 = 메인 워크트리 절대 경로** — 워크트리 안에서 호출돼도 메인 절대 경로의 BACKLOG.md를 단일 소스로 사용
- **`withMetaLock` 직렬화** — 두 메인 세션이 동시 `/add-backlog` 호출 시 락으로 직렬화 (proper-lockfile, stale=30s, retries=5). 한 세션 `/add-backlog` + 다른 세션 `/task-init` (BL 마킹) 동시 시도 시 락 정합
- **체크박스 의미** — `[ ]` = 미확인 (task로 옮기지 않은 메모) / `[x]` = 확인 완료 (task로 옮김). **dev 머지 완료 의미 X** — 완료 추적은 `git log dev --grep 'BL-NNN'` + 브랜치명 + `taskery status`
