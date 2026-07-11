---
name: add-backlog
description: 사용자 발화로 *plan(기능 그룹)별* tasks/<NNN_slug>/BACKLOG.md에 task 후보 1건 추가 — 얕은 분석(개요/대상 영역) + BL-NNN 채번 + withMetaLock 직렬화 (0.1.2+)
---

# /add-backlog

사용자 발화를 받아 *활성 plan별 백로그* `.project/tasks/<NNN_slug>/BACKLOG.md`에 task 후보를 1건씩 누적한다. **얕은 분석**만 — 코드 직접 탐색 X, 추정 수준. 본격 분석은 다음 단계 `/task-plan`.

## 호출 시점

- 명시 호출: `/add-backlog 로그인 빈 화면 떠`
- 발화 캐치: *"~ 백로그에 추가해 줘"* 등 백로그 추가 의도 발화
- 무인자 호출 시 *"어떤 항목? 한 줄로 알려줘"* 인터뷰. 다건 명시 시 1건씩 순차 처리.

## 판단 (LLM, 코드 탐색 X)

발화에서 후보 1건을 뽑아 추정 수준의 메타를 산출한다:

- **유형** (`feature` / `bug` / `improve` / `refactor` / `docs` / `chore`) — 자동 추정, *모호 시 사용자 confirm* (예: *"메뉴 검색 개선"* = feature/improve 모호)
- **제목** — 한 줄, 간결, 한국어
- **개요** — 한 줄. bug → 원인 추정 / feature → 구상 / improve → 개선 방향
- **대상 영역** — 한 줄. 추정 수준 (이 파일 / 모듈일 거다)
- **슬러그** — 한국어 제목 → 영어 *의미 변환* → kebab-case (3 단어 이내, 음역 X). 예: *"로그인 빈 화면"* → `login-empty-page`

> *코드 직접 탐색 금지*. 본 스킬은 *메모지 누적*만. 자동 추정 진행 X — 메타는 사용자 OK 또는 명백한 발화 매칭 후에만 추가.

## 추가 + 보고

`backlog_add` 도구로 추가한다 (MCP 도구 `backlog_add` 또는 동일 `npx @angar2/taskery backlog-add --type <t> --title <제목> --slug <slug> --summary <개요> --target <대상영역>`). 채번(BL-NNN)·서식·placeholder 치환·`withMetaLock` 직렬화·메인 워크트리 위치는 코드가 보장한다. 활성 plan BACKLOG.md 부재 시 도구가 에러를 반환한다 → *"`/plan-init` 먼저 호출해 활성 plan 디렉토리 + BACKLOG.md 생성 필요"* 안내 후 중단.

성공 반환 `{ blNum, blId }`로 보고한다:

```
✅ BL-<NNN> [<유형>] <제목> — <NNN_slug> 백로그 추가됐어.
   - 개요: <개요>
   - 대상 영역: <대상 영역>
   - 슬러그: <slug>
다음: 진행 의향이면 *"BL-<NNN> 진행"*이라고 말해. `/task-init`이 메타 그대로 받아 워크트리를 분기하고 항목을 `[x]` 확인 마킹할게.
```

## 주의사항

- **얕은 분석만** — 도메인 코드 Read · Grep 금지. 본격 분석은 `/task-plan`.
- **글로벌 `.project/BACKLOG.md`(plan 기획 후보)와 혼동 X** — 본 스킬은 *활성 plan별*만. 글로벌은 `/plan-init` 영역.
- **체크박스 의미** — `[ ]` = 미확인(메모) / `[x]` = 확인(task로 옮김). 부모 머지·완료 여부와 무관 — 완료 추적은 `taskery status` + 부모 머지커밋.
