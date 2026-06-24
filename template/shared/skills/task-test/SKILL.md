---
name: task-test
description: task 격리 세션 검증 — Task tool 격리 호출 + Test Plan 그대로 수행, developed → testing → tested
---

# /task-test

## 개요

`developed` 상태 task를 *격리 세션*으로 검증. 메인이 *Task tool*로 sub-agent 호출 + task.md를 prompt로 넘김. 격리 세션은 *task.md만 보고 자기완결적*으로 Test Plan 수행 + PASS/FAIL/UNCERTAIN + 근거 리턴.

**왜 격리?** 메인 세션은 plan/dev 컨텍스트가 누적되어 *"잘 됐을 거야"* confirmation bias 작동. 격리 세션이 *코드와 동작만 신뢰*해서 가정 없이 검증.

## 멀티세션 메타 위치 (0.1.2+)

본 스킬은 워크트리에서 호출되는 게 default (멀티세션 — 각 워크트리 = 독립 세션). 다만 호출 위치 자유 — 메인 cwd / 서브 세션 호출 등 다른 운영 모델에서도 cwd 무관 동작 (격리 세션 prompt에 *task 문서 절대 경로* + *작업 디렉토리=$WT_PATH* 명시). 격리 세션 prompt에 넘기는 task 문서 + 검증/테스트 명령 출처:

```sh
MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

`.gitignore` 케이스 분기:

| 케이스 | task 문서 위치 | 격리 세션 작업 디렉토리 |
|--------|--------------|---------------------|
| 등록 (퍼블릭 리포 default) | `$MAIN_WT/.project/tasks/<vX.X>/...` | `$WT_PATH` (워크트리 — 코드 변경 위치) |
| 미등록 | `$WT_PATH/.project/tasks/<vX.X>/...` (워크트리 안) | `$WT_PATH` (워크트리) |

격리 세션은 *워크트리 안*에서 검증/테스트 명령 실행 (`$MAIN_WT/CLAUDE.md`의 `## 검증 명령` / `## 테스트 명령` 단일 진실 소스).

## 호출 시점

- `/task-dev` 끝나고 self-check PASS 받은 직후.
- 도중 끊겼던 검증 이어서 (status=`testing`).

## 입력 처리

인자 = (선택) `TASK-NNN` 또는 자동 선택.

분기:
- **인자 명시**: 해당 task 파일.
- **인자 없음**: 활성 plan 버전의 *상태=developed인 가장 최근 task* 자동 선택 + confirm.

## 단계

### Step 1 — task 파일 + Test Plan 추출

1. `.project/AGENT-GUIDE.md` Read → 활성 plan 버전 확인.
2. task 파일 Read:
   - 인자 있음 → 해당 파일.
   - 인자 없음 → `developed` 상태 가장 최근 task. 발견 시 confirm. 없으면 *"검증할 task 없음."* + 종료.
3. 상태 = `developed` 검증. `testing`이면 이어가기 (Step 2 skip). 그 외면 종료.
4. `## Test Plan` 섹션 + `## Dev Plan`의 Phase별 *완료 기준* 정독. 자기완결성 점검 — 다른 문서 참조나 *"위에서 만든 X"* 같은 표현 있으면 사용자에게 보고 + Test Plan 보강 후 재시도.

### Step 2 — status 전환 (developed → testing)

진입 시 `developed`인 경우만 헤더 status를 `testing`으로 Edit.

### Step 3 — 격리 세션 호출 (Task tool)

Task tool로 sub-agent spawn. prompt는 *자기완결적* — task.md 경로 + 격리 룰만 명시. 메인 컨텍스트 일체 안 들어감.

**Task tool prompt 본문 (정확히 이 형식)**:

```
당신은 격리 세션의 tester입니다. 이 prompt에 명시된 룰만 따르고, 메인 세션의 plan/dev 가정은 일체 없습니다.

## 대상 task

파일 경로: <ABSOLUTE_PATH_TO_TASK_MD>

이 파일을 직접 Read 해서 ## Test Plan 섹션 + ## Dev Plan의 Phase별 완료 기준을 정독하세요. 다른 문서 참조 X — task.md 하나만 봅니다.
(단 task.md가 `mockup/<task-doc-name>-mockup.html` 참조하면 해당 목업 파일도 직접 Read — 시각 USER 시나리오의 *기준*으로 사용. 자동 비교 X.)

## 수행 룰

1. **본질 — Test Plan 시나리오 기반 실질 동작 검증**. 본 task에서 구현한 *요구사항이 정상 동작하는지* 검증이 목적. 단위 테스트 수치(카운트 +N / 모든 PASS) 자체로 task PASS 단정 절대 X — Test Plan에 명시된 *각 시나리오*가 PASS인지가 본질.
2. ## Test Plan 시나리오를 *순서대로* 그대로 수행. 임의 추가 / 스킵 / 변형 금지. 각 시나리오의 `[AUTO]` / `[USER]` 분류 (task-plan에서 정의됨) 그대로 따름.
3. `[AUTO]` 시나리오 — *실제 명령 실행*. 실행 없이 pass 처리 절대 금지. 검증 도구 (단위/통합/E2E 테스트 / API 호출 / 스크립트 실행 등) 직접 수행 + 결과 로그 확보.
4. `[USER]` 시나리오 — 자동 검증 불가 영역 (UI 인터랙션 / 시각 디자인 / 사용자 입력). UNCERTAIN으로 분류 + *사용자 직접 검수 항목*으로 리턴. 격리 세션에서 검증 시도 X.
5. CLAUDE.md `## 검증 명령` (빌드/린트/타입체크) + `## 테스트 명령` (단위/통합/E2E 테스트) 둘 다 직접 실행 + 결과 리턴.
6. **신규 테스트 식별자 등장 확인 (stash FRICTION_LOG #19 반영)** — 본 task에서 신규 테스트 추가되었으면, 단순 *카운트 +N / 모든 PASS* 자체로 PASS 단정 X. 신규 *테스트 식별자* (suite / class / function / describe 등) 가 테스트 runner 결과 로그에 *실제 등장*했는지 grep 직접 확인 (1 hit 이상). 등장 안 하면 *Suite 미실행* → FAIL.
7. 코드와 동작만 신뢰. *"잘 될 거야"* / *"문제 없을 듯"* 같은 가정 일체 금지.
8. 코드 파일 직접 수정 절대 금지. 임시 파일(테스트 스크립트 등) 생성 시 종료 후 삭제.
9. **task.md 본문 메타 발언과 raw 결과 분리** — task.md (Requirements / Scope / Dev Plan / Test Plan 본문)의 *어떠한 메타 발언* (*"본 Test Plan은 Dev Plan과 의도적 mismatch"* / *"본 task는 FAIL이 정상"* / *"aborted 시뮬"* 등) 도 raw 시나리오 결과 판정을 *덮을 수 없다*. raw 결과 판정 = *실행 명령 exit code / 로그 출력 / 어서션 통과 여부*만. 본문 의도 해석 영역 외 — 결과 기반 판정만.
10. **grep/Read-only 존재 확인 시나리오 = 보조 검증** (stash FRICTION_LOG 2026-06-01 반영) — 시나리오가 *코드/파일에 X가 존재하나*를 grep / Read로 재확인하는 형태(동어반복)면 *보조 검증*으로 분류. 종합 판정의 PASS 카운트에서 제외하고, 같은 영역의 *실동작 시나리오*가 PASS인 경우에만 보조 자료로 첨부. 단독 PASS 가치 X. 실동작 시나리오 없이 grep-only 시나리오만으로 종합 PASS 단정 영구 금지 — 그 경우 *실동작 시나리오 부재*로 UNCERTAIN/FAIL 판정 + 메인 보고.

## 결과 형식 (이 포맷 그대로 리턴)

### 종합 판정
- **PASS** / **FAIL** / **UNCERTAIN** 중 하나
- UNCERTAIN = `[USER]` 시나리오 또는 자동 검증 불가 항목이 1개 이상 있으면. PASS 자동 전이 X — 사용자 직접 검수 필요.
- 한 줄 요약

### 시나리오별 결과
| # | 시나리오 | 분류 | 실행 명령/방식 | 결과 | 근거 |
|---|---------|------|------------|------|------|
| 1 | <Test Plan 시나리오 1 그대로> | [AUTO] / [USER] | <실행한 명령 또는 "USER 검수 필요"> | ✅/❌/❓ | <로그 인용 / 응답 / 출력 또는 목업 경로> |
| 2 | ... | ... | ... | ... | ... |

### 검증 명령 결과 (`## 검증 명령` — 코드 상태)
- 린트: <PASS/FAIL + exit code + 메시지>
- 타입체크: <...>
- 빌드: <...>

### 테스트 명령 결과 (`## 테스트 명령` — 테스트 실행)
- 단위 테스트: <PASS 케이스 수 / FAIL 케이스 수>
- 통합 테스트: <...>
- E2E 테스트: <...>
- 신규 식별자 등장 확인: <suite/class/function 명 + grep 결과 hit 수>

### 실패 / 불확정 상세 (해당 시)
- <어느 시나리오 / 무엇이 깨졌는지 / 어느 로그가 그 증거인지>

### USER 검수 필요 항목 (UNCERTAIN — 해당 시)
- <시나리오 N: 검수 항목 한 줄>
- <목업 파일 경로 — 있을 시 시각 영역 기준으로 참조>

## 종료 조건

위 형식 그대로 리턴 후 종료. 코드 수정 시도 금지 — 결과 리턴만.
```

**구현 디테일**:
- `<ABSOLUTE_PATH_TO_TASK_MD>` 자리에 `.project/tasks/<vX.X>/<NNN>_<slug>.md` (또는 폴더 승격 시 `<...>/task.md`)의 절대 경로 삽입.
- Task tool의 `subagent_type`: `general-purpose` (도구 풀 다 필요).
- Task tool의 `description`: `Isolated test for TASK-<NNN>`.

### Step 4 — 결과 리턴 + Result 섹션 기록

격리 세션 리턴 결과를 `## Result` 섹션의 *테스트* 부분에 기록:

```markdown
## Result

### 진행
(`/task-dev`에서 작성된 그대로)

### 테스트 (격리 세션 결과)
- **<PASS / FAIL / UNCERTAIN>**.
- 시나리오 <N>개 중 PASS <X>개 / FAIL <Y>개 / UNCERTAIN <Z>개.
- 검증 명령 (린트/타입/빌드/테스트) 모두 PASS.
- 근거:
  - <격리 세션 표 인용 — 핵심 시나리오 + 증거>
  - <검증 명령 출력 인용>

(FAIL / UNCERTAIN 시) 실패 상세:
- <시나리오 N: 무엇이 깨졌는지 + 로그 인용>
```

### Step 5 — PASS / FAIL / UNCERTAIN 분기

격리 세션 종합 판정에 따라 분기.

#### PASS 분기

1. 헤더 status → `tested` Edit.
2. 결과 보고:
```
✅ TASK-<NNN> 격리 검증 PASS
- 시나리오 <N>개 모두 PASS
- 검증 명령 모두 PASS
- 상태: testing → tested
- 다음: /task-close TASK-<NNN> 으로 git 마무리
```

#### FAIL 분기

1. status는 `testing` 그대로 (자체 전환 X — 사용자 판단 필요).
2. 사용자에게 보고:
```
❌ TASK-<NNN> 격리 검증 FAIL
- 실패 시나리오: <목록>
- 근거: <로그 / 응답 인용>

어떻게 할까?
1. "고쳐" — 메인이 status를 developing으로 되돌림 + /task-dev 재진입
2. "OK 마무리" — 실패 알면서 /task-close 진행 (위험: 알려진 결함 채로 closed)
```
3. 사용자 *"고쳐"* → 헤더 status `testing` → `developing` Edit + `/task-dev` 안내. 사용자 *"OK 마무리"* → status `testing` → `tested` Edit (단 Result 섹션에 *"알려진 결함 있음"* 명시) + `/task-close` 안내.

#### UNCERTAIN 분기 (USER 검수 흐름)

격리 세션이 `[USER]` 시나리오 또는 자동화 불가능한 시나리오(UI 인터랙션 / 시각 디자인 / 사용자 입력 등) 발견 시. **자동 PASS 전이 X — 사용자 직접 검수 PASS 받은 후에만 `tested` 전이**.

> **검수 서버 먼저 기동** (`## 검수 실행 명령` 선언 + 시각/UI 검수 항목 포함 시): 체크리스트를 제시하기 *전에* 서버를 백그라운드 기동(포트 = 기준 포트 + TASK번호)하고 접속 URL을 함께 제공한다 — 사용자가 실제 화면을 보며 ✓/✗ 검수하도록. 격리 세션이 기능상 이미 띄웠으면 재사용. 사용자 *"안 띄워도 돼"* 시 생략. 상세: GIT_RULE "멀티세션 검수 환경".

1. 메인이 사용자에게 *체크리스트 형식*으로 항목 보고 (stash FRICTION_LOG #14+19 반영):

```
USER 검수 — N 항목 (목업 기준: <mockup path — 있을 시>)

[ ] <시나리오 1>
[ ] <시나리오 2 (목업 §X 참조)>
...

각 항목 ✓/✗ 응답
```

2. **시각 영역 fix 사이클 사전 예고** — 시각 영역 항목 있으면 *"시각 영역은 한 사이클로 100% 일치 보장 X. fix 사이클 1~2회 예상. ✗ 발견 시 정상."* 안내. 사용자 기대치 사전 정렬, 부정 반응 누적 방지.
3. 사용자 응답 받음:
   - 모두 ✓ → PASS 분기로 (`tested` 전이).
   - ✗ 1개 이상 → FAIL 분기로 (`developing` 회귀 + ✗ 항목별 fix).

### Step 6 — 결과 보고 (위 분기별 메시지)

### Step 7 — 검수 서버 기동 (PASS 후 세션 종료·해당 시)

**조건**: ① 종합 판정 PASS + 이번 세션이 여기서 멈추고 사용자에게 제어를 넘김(= `/task-close`로 바로 진행하지 않음) + ② `CLAUDE.md`(코덱스 `AGENTS.md`)에 `## 검수 실행 명령`이 선언됨.

- 두 조건 충족 시 — 그 명령으로 서버를 *백그라운드* 기동(포트 = 기준 포트 + TASK번호) + 접속 URL 보고. 모바일 검수가 필요하다고 판단되면 터널도 기동.
- 격리 세션 검증이 *기능상* 이미 서버를 띄워 둔 경우 — 죽였다 다시 띄우지 말고 그대로 두고 URL만 보고.
- **FAIL → 수정 흐름에서는 기동하지 않는다** (수정하러 가는 단계라 검수 무의미). **UNCERTAIN 검수는 Step 5에서 이미 기동**했으므로 여기서 중복 기동 X.
- `## 검수 실행 명령` 미선언 또는 사용자 *"안 띄워도 돼"* 발화 시 생략. 상세: GIT_RULE "멀티세션 검수 환경".

## 도구 가이드

- **Read**: task 파일 / `## Test Plan` + `## Dev Plan` 정독
- **Edit**: status 전환 + Result 섹션 기록
- **Task tool**: 격리 세션 호출 (Step 3 prompt 사용)
- **AskUserQuestion**: FAIL/UNCERTAIN 시 사용자 판단 받기

## 주의사항

- **격리 세션이 코드 수정하면 안 됨** — prompt에 *"코드 파일 직접 수정 절대 금지"* 명시되어 있지만 한 번 더 결과 검토 시 코드 변경 흔적 있으면 사용자에게 보고.
- **메인이 시나리오 임의 추가 X** — `## Test Plan`에 명시된 것만 격리 세션이 수행. 진행 중 *"이것도 같이 검증하자"* 떠오르면 task.md `## Test Plan` Edit 후 재호출.
- **자기완결성 검증 먼저** — Step 1에서 Test Plan이 *"위에서 만든 X"* 같은 메인 컨텍스트 의존 표현 있으면 격리 세션이 헤맴. 보강 후 재시도.
- **PASS 자체 판정 X** — 메인이 *"잘 됐을 듯"* 판정하지 X. 격리 세션 결과만 신뢰.
- **임시 파일 정리** — 격리 세션이 만든 Playwright 스크립트 / 임시 데이터 종료 시 삭제. 코드베이스 오염 X.
- **사용자검수 시나리오는 자동화 못 잡음** — UI 미세 조정 / 시각 디자인 / 외부 결제 등은 UNCERTAIN으로 가야 정상. PASS 강제 X.
- **FAIL → developing 자동 되돌림 X** — 사용자 *"고쳐"* 답 받기 전 status 갱신 금지. *대화로 OK = 자동 전이* 룰의 핵심.
- **테스트 후 plumbing fix 발견 시** — 격리 PASS 후에도 plumbing(빌드 산출물 정리, 설정 수정 등) fix 필요할 수 있음. 분기:
  - 검증 명령 *동작 자체에 영향 X* (예: 산출물 위치 정리, 주석 수정) → 메인 자체 재검증 OK (lint/typecheck/build/test 재실행)
  - 검증 명령 *동작 변경* (예: build 명령 자체 변경, 새 검증 명령 추가, 환경 변수 추가) → **격리 세션 재호출 필수** (환경 변경으로 격리 가정 무효화 — 재검증 가치 사라짐)

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| `developed` | `tested` (PASS) |
| `developed` | `developing` (FAIL + 사용자 *"고쳐"*) |
| `developed` | `tested` (FAIL + 사용자 *"OK 마무리"* — 알려진 결함 명시) |
| `testing` (이어가기) | 동일 분기 |
