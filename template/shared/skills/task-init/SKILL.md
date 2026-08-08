---
name: task-init
description: task 시작 — 워크트리 분기 + 6 섹션 빈 골격 + 헤더 6컬럼 (부모 브랜치 자동 기록 · status=draft) task.md 생성 (멀티세션 0.1.2+)
---

# /task-init

## 개요

새 task 시작 시 호출. **워크트리 분기 + task.md 빈 골격 작성**. Requirements / Scope / Dev Plan / Test Plan 본문은 다음 단계 `/task-plan`에서 채운다.

> 메인 워크트리(부모 브랜치 체크아웃 — 기본 dev)에서 호출. 서 있는 브랜치가 곧 부모가 된다. 채번·워크트리·브랜치 생성·골격 작성은 `task_init` 도구(fork)가 init 락 안에서 원자 수행한다.

## 호출 시점 + 입력

- 새 task 시작 (*"~~ 추가해줘"* / *"~~ 버그 고쳐"* / *"~~ 리팩터링"*), 백로그 진행(*"BL-003 진행하자"*), 로드맵 진행(*"Stage 2 진행하자"* / *"로드맵 다음 거 시작"*).
- 인자 = (선택) 주제 / 유형 / 출처(BL-NNN, ST-N, DR) / 규모.
- **두 분기**: ① **제안** — 직전 맥락 명확 → *"이렇게 task 만들까요?"* + confirm. ② **인터뷰** — 맥락 부족 → 한 번에 한 질문씩.
- **자동 추정 진행 X** — confirm 또는 답 받기 전 워크트리/파일 생성 금지.

## Step 1 — 메타 수집

직전 대화 정독 → 추정 가능하면 분기 1(제안), 불가하면 분기 2(인터뷰):
- Q1 *"무슨 작업? (한 줄로)"* / Q2 *"유형? (feature / bug / improvement / refactor / docs / chore)"* / Q3 *"출처? (백로그 BL-NNN / 로드맵 Stage ST-N / 직접 요구사항 DR)"* / Q4 *"규모? (micro / small / medium / large)"* / (필요 시) Q5 *"plan `<NNN_slug>` 맞나요?"*

수집 항목(모두 확정 후 진행): 주제(한국어) · 유형 · 출처 · 규모 · plan(활성 plan — `status` 도구나 AGENT-GUIDE에서). 활성 plan 부재 시 *"`/plan-init` 먼저 실행할까요?"* 안내 + 중단.

## Step 2 — 출처별 메타 + 슬러그

- **BL**: `backlog_get` 도구(또는 `npx @angar2/taskery backlog-get BL-NNN`) → `{ blId, status, type, title, slug, summary, target, taskNums }`. 항목 없으면 에러 → 보고 + 중단. **개요/대상 영역은 task.md §1 Requirements 초안 시작점**으로 기억(본문은 task-plan에서). 슬러그 = 반환 `slug` 그대로(재현성 — 별도 변환 X).
- **ST**: `$MAIN_WT/.project/plans/<활성 plan>/ROADMAP.md`에서 해당 Stage N의 작업 단위 확인 → 이번 task가 맡을 작업 단위를 사용자와 confirm. 슬러그 = 그 작업 단위 제목 → 영어 kebab-case(3 단어 이내) → confirm. (ROADMAP은 Stage 단위·별도 항목 채번 없음 — `ST-N` = Stage 번호 그대로.)
- **DR**: 사용자 발화에서 주제 그대로. 슬러그 = 한국어 제목 → 영어 kebab-case(3 단어 이내) → confirm.

**이미 `[x]` BL 재진행 케이스** — `backlog_get` 결과 `status==='checked'` & `taskNums` 비어있지 않으면: 사용자 호출 *"BL-NNN은 ${taskNums}로 이미 처리된 적 있어. 새 task로 다시 진행할까?"* → OK면 새 TASK 진행(§4 마킹은 콤마 누적) / X면 중단.

## Step 3 — 파일 vs 폴더 + confirm

- **파일 default**: 단일 `NNN_<slug>.md`. **폴더 승격은 *사용자 명시* 시에만**(*"폴더로 만들어줘"*) — 규모 large·자료 다수여도 자동 승격 X.
- spec-diffs / screenshots / mockup은 단일/폴더 무관 `.project/tasks/<NNN_slug>/{spec-diffs,screenshots,mockup}/` 공통(TASK_DOC_RULE §1.5).
- 사용자에게 브랜치 구성요소(`{타입}/{개발자}_TASK-???_{출처}_{슬러그}`, NNN은 fork가 확정) + 파일/폴더 confirm.

## Step 4 — 분기 + 골격 생성 (`task_init`) + BL 마킹

`task_init` 도구(또는 `npx @angar2/taskery fork <타입> <개발자> <출처> <슬러그> --size <규모> --title "<한국어 제목>" [--promote]`) 한 번으로 **채번 → 워크트리·브랜치 생성**(init 락 원자 — 병렬 task-init 번호 충돌·동일 출처 중복(**BL·구형 RM 한정** — `ST-N`은 Stage 하나에서 복수 task가 정상, `DR`은 ID 없음이라 둘 다 중복 검사 제외)·동일 브랜치명을 코드가 차단)에 더해 **빈 골격 task.md 자동 생성**(생성일=오늘 · plan=활성 plan · 유형 자동매핑 `improve`→`improvement` · **부모 브랜치=fork 시점 현재 브랜치 자동 기록**(dev 고정 아님) · status=draft · `.gitignore` 케이스로 위치 자동 판정)까지 수행한다.

- 반환 `{ taskNum, nnn, branch, wtPath, projectId, docPath, registered, promoted }`. 폴더 승격은 `--promote`/`promote:true`.
- 에러 시(*"… 이미 진행중"* / *"… detached HEAD"* — 부모 브랜치(현재 브랜치) 확인·SSoT를 fork가 강제) stderr 메시지 그대로 보고 + 중단.
- **BL 출처면** 직후 `backlog_mark` 도구(또는 `npx @angar2/taskery backlog-mark BL-NNN TASK-NNN`)로 `[ ]→[x]` + `- TASK:` 마크(콤마 누적, withMetaLock). ST/DR은 skip.

## Step 5 — 골격 확인 + 보고

반환 `docPath`(절대 경로)를 Read해 헤더 6컬럼 + 6 섹션 placeholder + status=draft 확인만 한다. **본문 작성 금지** — Requirements / Scope / Dev Plan / Test Plan은 *반드시* `/task-plan`에서.

> **폴백** (반환에 `docPath` 없이 `scaffoldError`만 있을 때만): TASK_DOC_RULE §1.3 형식으로 해당 위치에 직접 작성(생성일=오늘, status=draft, 단일=`<NNN>_<slug>.md` / 폴더=`TASK-<NNN>_<slug>/task.md`).

```
✅ TASK-<NNN> 생성 완료
- 워크트리: <wtPath> / 브랜치: <branch> / task 문서: <docPath>
- 헤더: <생성일> / <plan> / <유형> / <규모> / <부모 브랜치> / draft
- BL 마킹: BL-<NNN> [x] (BL 출처 시. ST/DR 생략)
- 다음: /task-plan TASK-<NNN> 으로 기획 채우기
```

## 주의사항

- **워크트리 생성 + 골격 작성만** — 본문 채우기 금지. Requirements / Scope / Dev Plan / Test Plan은 *반드시* `/task-plan`.
- **단계 경계** — 허용: ROADMAP §4 확인 / SSoT 조회 / `task_init` 호출 / 빈 골격 확인. 금지: ARCHITECTURE/API-SPEC/FEATURES 등 루트 제품 관통 문서 본문 Read · 도메인 코드 Read·Grep · 기존 task 본문 Read (그건 `/task-plan` 영역).
- **자동 추정 진행 X** — 맥락 명확해도 *제안 + OK* 후 생성.
- **상태는 `draft` 고정** · **slug 영어 kebab-case** · **헤더 6컬럼 모두 채움**(*"미정"* placeholder X — 코드가 채움. 부모 브랜치도 코드 자동 기록).
- **fork 실패(같은 브랜치명 / 같은 출처 진행중 — BL·구형 RM 한정) → 사용자 호출** + 중단(*"다른 세션이 같은 항목 진행 중"*). `ST-N`·`DR`은 중복 게이트가 없으므로 같은 Stage로 두 번째 task를 만들 때 코드가 막아주지 않는다 — 중복 진행 여부는 메인이 `status`로 확인한다.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| (없음 — 신규 생성) | `draft` |
