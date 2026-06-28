---
name: task-plan
description: task 기획 채우기 — Requirements / Scope / Dev Plan / Test Plan 4 섹션 작성, draft → planned
---

# /task-plan

## 개요

`draft` 상태 task의 본문 4 섹션(Requirements / Scope / Dev Plan / Test Plan)을 채우고 status를 `planned`로 갱신. 사용자와 대화로 진행 — 인터뷰 + 증폭 + 코드 서치 + Phase 분할.

리뷰는 *대화로 OK* 자동 전이로 단순화 — 별도 리뷰 단계 없음.

## 멀티세션 메타 위치 (0.1.2+)

본 스킬은 워크트리에서 호출되는 게 default (멀티세션 — 각 워크트리 = 독립 세션). 다만 호출 위치 자유 — 메인 cwd / 서브 세션 호출 등 다른 운영 모델에서도 cwd 무관 동작. 메타(`.project/`, `CLAUDE.md`) 접근 시 **메인 워크트리 절대 경로** 우선 — *task 문서 단일 진실 소스* 유지.

```sh
MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

`.gitignore` 케이스 분기:

| 케이스 | task 문서 위치 | 제품 관통 문서 위치 | 동시 쓰기 |
|--------|--------------|----------------|----------|
| 등록 (퍼블릭 리포 default) | `$MAIN_WT/.project/tasks/<NNN_slug>/...` | `$MAIN_WT/.project/<doc>.md` (루트 평평) | `withMetaLock` (`bin/lib.js`) |
| 미등록 | `$WT_PATH/.project/tasks/<NNN_slug>/...` (워크트리 안, 머지 시 dev 반영) | `$MAIN_WT/.project/<doc>.md` (제품 문서는 여전히 단일 소스) | 단일 세션 가정 (워크트리 내부) |

본문 모든 `.project/...` 경로는 *위 분기에 따라* 적용. spec-diff / mockup / screenshots는 task 문서와 같은 위치.

## 호출 시점

- `/task-init`로 만든 빈 골격 task에 기획 채울 때.
- 기존 task 기획 다시 짜고 싶을 때 (단 status=`draft`만. `planned` 이상이면 *직접 Edit*하거나 `/task-init` 새로 만들 것 권장).
- **Test Plan 보수 재진입** (status=`testing`만): `/task-test`가 *시험문제 결함(UNCERTAIN 검증 불가)*으로 반려한 직후 — Test Plan 시나리오를 [실행 명령 + 구체적 기대값]으로 다시 작성하러 온 경우. **Test Plan 섹션만** 보수하고 Requirements / Scope / Dev Plan / 코드는 보존한다 (아래 Step 1 가드 예외 참조).

## 입력 처리

인자 = (선택) `TASK-NNN` 또는 자동 선택.

분기:
- **인자 명시**: `.project/tasks/<NNN_slug>/<NNN>_*.md` 또는 `TASK-<NNN>_*/task.md` 찾아서 진행.
- **인자 없음**: 활성 plan의 `.project/tasks/<NNN_slug>/` 안 *상태=draft인 가장 최근 task* 자동 선택 + confirm.

## 단계

### Step 1 — task 파일 + active plan 확인

1. `.project/AGENT-GUIDE.md` Read → 활성 plan 버전 확인.
2. task 파일 Read:
   - 인자 있음 → 해당 파일.
   - 인자 없음 → `ls .project/tasks/<NNN_slug>/` 결과 중 status=draft인 가장 최근 파일. 발견 시 *"TASK-<NNN> 진행할까요?"* confirm. 없으면 *"draft 상태 task가 없네요. `/task-init` 먼저 호출하세요."* + 종료.
3. 상태 검증 — 두 진입만 허용, 그 외 종료 + 안내:
   - **`draft`** → 일반 기획 (Step 2~ 전체 진행).
   - **`testing` + Test Plan 보수 모드** → `/task-test`가 *시험문제 결함*으로 반려해 되돌아온 경우에 한해 허용. 이때는 **Test Plan 섹션만 보수**(Requirements / Scope / Dev Plan 보존), Step 2~4는 건너뛰고 Step 5(Test Plan)만 수행, status는 `testing` 그대로 둔다(전이 X — 보수 후 `/task-test` 재실행).
   - **그 외(`planned` / `developing` / `developed` / `tested` / `closed`)** → 종료 + 안내. (특히 `tested` / `closed`는 보수 모드로도 진입 거부 — 우회 방지.)

### Step 2 — Requirements 인터뷰 + 증폭

1. 사용자 발화(직전 대화 + task 제목) 정독.
2. 메인이 *증폭/구체화* — 사용자가 빠뜨리기 쉬운 디테일 보충:
   - **에러 처리**: 빈 값 / 형식 오류 / 네트워크 오류 등
   - **보안 고려**: 인증/인가 / 입력 검증 / SQL/XSS 방어 등 (해당 시)
   - **엣지 케이스**: 동시 호출 / 타임아웃 / 부분 실패 등 (해당 시)
   - **UX 마이크로 디테일**: 로딩 스피너 / 비활성 버튼 / 키보드 접근성 등 (UI task 시)
3. 사용자에게 *"이렇게 이해했는데 맞아? 빠진 거 있어?"* confirm. 답 받고 합의된 최종 요구로 정리.
4. `## Requirements` 섹션 Edit:
   ```markdown
   ## Requirements

   사용자 요구:
   - <원래 발화 그대로 또는 정리>

   메인 증폭:
   - <에러 처리 / 보안 / 엣지 케이스 / UX 디테일 — 합의된 항목>

   합의:
   - <최종 합의 — 무엇을 만드는가 한두 줄 요약>
   ```

### Step 3 — Scope (코드 서치)

1. Grep / Glob / Read로 *영향 받을 파일* 탐색:
   - 키워드 검색 (관련 도메인 명, 함수명, API 경로 등)
   - 디렉토리 스캔 (`src/<관련영역>/`)
   - 인접 파일 (간접 영향 가능성)
2. `## Scope` 섹션 Edit — 3 파트:
   - **수정**: 변경될 파일 + 어느 함수/로직
   - **신규**: 새로 만들 파일 + 예상 경로/역할
   - **인접**: 간접 영향 가능 파일 (검토 대상 알림용)

```markdown
## Scope

수정:
- `src/<...>` — <함수/로직>

신규:
- `src/<...>` — <역할>

인접 (간접 영향):
- `src/<...>` — <영향 종류>
```

### Step 4 — Dev Plan (Phase 분할)

1. 규모(헤더의 micro/small/medium/large) 기준으로 Phase 수 결정:
   - **micro**: Phase 1 (단일)
   - **small**: Phase 2~3
   - **medium**: Phase 4~7
   - **large**: Phase 8+ (또는 *분리 검토 권장* — 사용자에게 task 쪼갬 제안)
2. 각 Phase = *독립 단위, 커밋 1개로 의미 있는 단위*.
3. 각 Phase 5 필드 작성:
   - **파일**: 변경 대상 (예: `src/auth/login.ts`)
   - **왜**: 이 phase의 동기/목적
   - **어떻게**: 구현 방법 1~3줄
   - **완료 기준**: 끝났다고 판단할 기준 (예: *"API endpoint 200 반환"*)
   - **진행**: `[ ]`
4. **Phase 0 (선택) — 제품 관통 문서 변경 검토**:
   - 본 task가 `.project/` 루트 제품 관통 문서(FEATURES / UX-UI / DATA-MODEL / API-SPEC / SERVICE-POLICY / TECH-STACK / ARCHITECTURE) 중 어느 것을 *수정/추가/삭제*해야 하는지 검토.
   - **DATA-MODEL / API-SPEC 상세는 여기가 채우는 주체** — plan-init은 의도/빈 헤더까지만 두고 미뤘다. 본 task가 스키마·엔드포인트를 *구현 동반*으로 확정해 본문을 채운다(선기획 금지의 귀결).
   - 변경 있음 → Phase 0에 명시 + `spec-diffs/<NNN>_<slug>_spec-diff.md` 파일 생성 (Step 6).
   - 변경 없음 → Phase 0 생략.
5. **Phase 점진 작성 OK** — 처음부터 모든 Phase 일괄 작성 금지. 지금 명확한 Phase만 작성하고 진행 중 추가 가능.

```markdown
## Dev Plan

### Phase 0 — 제품 관통 문서(.project/ 루트) 변경 (선택)
- 변경 문서: <FEATURES.md / API-SPEC.md / DATA-MODEL.md / ...>
- 변경 내용: <요약>
- spec-diff: `spec-diffs/<NNN>_<slug>_spec-diff.md`
- 진행: [ ]

### Phase 1 — <짧은 이름>
- 파일: ...
- 왜: ...
- 어떻게: ...
- 완료 기준: ...
- 진행: [ ]

### Phase 2 — ...
```

### Step 4.5 — HTML 목업 프로세스 (UX/UI 구현 task 한정 — stash FRICTION_LOG #14+19 반영)

본 task가 UX/UI 구현 포함하면 *시각 영역 사전 정합* + *task-test 시각 자동 대조 정답지 확보*용 HTML 목업 생성.

#### 1. UX/UI 구현 task 판단

Step 2 Requirements 인터뷰 결과로 본 task가 *UX/UI 구현 (페이지/컴포넌트 신규 / 시각 변경 / 인터랙션 신규)* 포함 여부 판단.

- UX/UI 포함 → 2~5 진행
- 미포함 (백엔드 / CLI / 인프라 등) → 본 Step 패스, Step 5로 직진

#### 2. 목업 confirm

**예외 없이 사용자에게 발화 강제** — UX/UI 포함 판단=O이면 본 confirm 질문은 *반드시* 발화. 메인의 효용 판단(*"이 케이스는 목업 효용 낮음"* / *"SF Symbol은 HTML 재현 X"* 등)으로 confirm 단계 자체를 건너뛰는 행위 영구 금지. 효용 판단은 질문에 *곁들이는 의견*으로만 표현 가능 (생략 결정 대체 X — 목업 제작 여부는 *사용자 검수 방식 선택권*이라 *개발 자율 판단* 영역 X).

근거: stash FRICTION_LOG 2026-06-01 — UX/UI 구현 task인데 메인이 *목업 효용 낮음* 자체 판단으로 Step 4.5 confirm 자체를 생략한 마찰.

사용자에게 한 줄 질문:
*"이 task UX/UI 구현 포함되어 있어. HTML 목업 만들까? 구현 정확도 + 사용자 사전 시각 확인 + task-test 검수 기준 확보 효과."*

(효용 한계 의견 곁들이기 — 해당 시): *"단, <기술 한계 — 예: SF Symbol 아이콘은 HTML 재현 X> 영역은 목업 효용 제한적."* — 의견 표현만 가능, 생략 결정 대체 X.

- 사용자 *"OK"* → 3 진행
- 사용자 *"NO"* → 본 Step 패스 (목업 없이 진행)

#### 3. 목업 생성 + 사용자 승인

1. 메인이 HTML 목업 생성 — 정적 HTML/CSS (외부 라이브러리 X, 단일 파일 안 inline style + 필요 시 vanilla JS):
   - 시각 영역 (레이아웃 / 색상 / 간격 / 타이포 / 호버 효과)
   - 인터랙션 (가능한 범위 — 클릭 / 호버 시뮬)
2. 사용자에게 *"브라우저로 `.project/tasks/<NNN_slug>/mockup/<task-doc-name>-mockup.html` 열어 확인 후 ✓/✗ 응답"*.
3. 사용자 ✓ → 승인 완료, 4 진행. ✗ → 메인이 수정 후 재승인 요청.

#### 4. 파일 위치 / 네이밍

- 위치: `.project/tasks/<NNN_slug>/mockup/<task-doc-name>-mockup.html`
  - 예: `001_login-form.md` → `001_login-form-mockup.html`
- **task 1개 = 목업 1개**. multi-file 예외 영구 X. 복잡해도 한 파일 안 섹션 분리 (`<section id="popover">` `<section id="settings">` 등).

#### 5. Test Plan 연결

승인된 목업 = task-test의 **시각 *자동 대조* 정답지** (+ 미세 취향은 사용자 최종 사인). 사용자가 맘에 들 때까지 승인 안 하므로 목업 = 이미 사용자가 검증한 정답지 — task-test 격리 세션이 *실제 화면 캡처 → 이 목업과 자동 대조*해 객관적 깨짐을 잡는다. Step 5 Test Plan 작성 시:
- **시각 *객관* 영역(레이아웃/요소 유무/색/배치) → `[AUTO]`** (캡처-목업 대조) + 목업 경로 참조 명시.
- **시각 *미세 취향*(2px·색조·느낌) → `[USER]`** (사용자 최종 사인, 증거 캡처).
(이전의 "승인 목업 = USER 검수 기준 / 시각=전부 [USER]"는 폐기 — 사용자에게 흠 사냥을 떠넘기던 원인.)

---

### Step 5 — Test Plan (실질 동작 시나리오 — stash FRICTION_LOG #14+19 / #25 반영)

#### 본질

Test Plan = *본 task에서 구현한 요구사항이 정상 동작하는지* 검증 시나리오. **유닛 테스트 X** (유닛 테스트는 task-dev Step 6.5에서 단일 시점 실행 — *코드 정상성* 영역, 본 Test Plan과 직교).

검증 대상:
- 기능 동작: 사용자 입력 → 기대 결과 / API 호출 → 응답 / 데이터 처리 → 상태 변화
- UX/UI 동작: 클릭 → 결과 / 호버 → 상태 / 드래그 → 위치 변경
- UX/UI 시각: 레이아웃 / 색상 / 간격 / 호버 효과 (목업 기준)
- 백엔드 동작: 시스템 호출 → 외부 응답 / 사이드 이펙트 / 에러 처리

#### 방식 선택 규칙 (요구사항 성격 → 필수 방식, 재량 0)

방식을 *느낌으로* 고르지 말 것. 각 요구사항을 아래 표에 *기계적으로* 대조해 필수 방식을 정한다. 여러 행에 걸리면 *다 붙인다*:

| 요구사항이 이런 거면 | 필수 테스트 방식 |
|---|---|
| 화면을 새로 그리거나 바꾼다 | 시각 (캡처-목업 대조) |
| 클릭·입력 등 상호작용 | UI 동작 (E2E 또는 사람) |
| 엔드포인트 추가·변경 | API 호출 |
| 데이터 쓰기·변경·삭제 | 데이터 상태 조회 (사이드 이펙트) |
| 순수 계산·변환 | 입출력 비교 |
| 기존 동작 영역 건드림 | 회귀 |

이렇게 고른 방식을 아래 카탈로그의 *구체적 방식*으로 옮긴다. (이 규칙은 뒤의 "요구사항 ↔ 시나리오 커버리지 점검"의 *입력* — 매핑이 방식을 정하고, 커버리지 점검이 빠진 요구사항을 잡는다. 중복 아니라 보강 관계.)

#### 실질 테스트 방식 카탈로그

각 시나리오마다 위 규칙으로 고른 방식을 아래에서 구체화. **각 방식은 *비교할 정답지*가 다르다 — 정답지 없는 검사는 무의미**:

| 방식 | 적용 영역 | 정답지 (무엇과 비교) | 누가 검사 | 설명 |
|------|----------|------|------|------|
| 수동 검수 | UI 미세 / UX 느낌 | 주관(목업·사용감) | 사람 (증거 첨부) | 정답지가 주관인 것만 — 객관 깨짐은 아래 시각 자동으로 |
| 시나리오 스크립트 실행 | 백엔드 / 통합 흐름 | 구체적 출력·종료코드 | test 자동 | end-to-end script (bash / node 등) 일련의 명령 자동 실행 |
| API/엔드포인트 호출 | 백엔드 / 외부 인터페이스 | 상태코드 + 응답 필드값 | test 자동 | 실제 호출 + 응답·상태 코드·결과 데이터 확인 |
| 입출력 비교 | 함수 / 변환 / 처리 | 구체적 기대 출력 | test 자동 | 입력 → 출력 비교 (snapshot / golden file) |
| 사이드 이펙트 확인 | DB / 파일 / 로그 | 조회 결과(행/파일/카운트) | test 자동 | 시나리오 실행 후 상태 직접 조회 |
| 시각 (캡처-목업 대조) | UI 레이아웃/색/배치 | 승인된 목업 | test 자동 (+ 미세는 사람) | 실제 화면 캡처 → 목업과 대조, 어긋남 목록 |
| 회귀 시나리오 | 기존 기능 영향 | 이전과 동일 결과 | test 자동 | 직전 동작하던 시나리오 재실행 |
| E2E 자동화 도구 | UI 동작 자동화 (도구 있을 시) | 액션 후 관측 변화 | 도구면 test, 아니면 사람 | Playwright / Cypress / XCTest UI Test 등 — 가능하면 자동화, 안 되면 수동 검수 |

#### UX/UI 영역 분리 + 검증 방식 매트릭스 (UX/UI 구현 task 한정)

| 영역 | 분류 | 기준 |
|------|------|------|
| 동작 (클릭/호버/드래그/입력 → 결과) | 도구 있으면 `[AUTO]` E2E, 없으면 `[USER]` 체크리스트 | 액션 후 관측되는 변화 |
| 시각 *객관* (레이아웃/요소 유무/색/배치 깨짐) | `[AUTO]` 캡처-목업 대조 | 승인된 목업 (격리 세션이 화면 캡처 → 대조 → 어긋남 목록) |
| 시각 *미세 취향* (2px·색조·호버 강도·느낌) | `[USER]` 체크리스트 + 목업 참조 | 사용자 최종 사인 (증거 캡처 첨부) |

#### 시나리오 형식 — [명령/입력] + [구체적 기대값] 한 쌍 강제

**모든 `[AUTO]` 시나리오 = [실제 실행할 명령/입력] + [실제로 나올 구체적·관측 가능한 값] 한 쌍.** 이게 task-test 격리 세션이 "문 앞 검사"에서 자격을 확인하는 형태다 — 안 갖추면 검사가 시작되지 않고 *시험문제 결함*으로 반려된다(빈 권고 아님).

- **소원 금지** — "정상 동작 / 잘 됨 / 확인한다 / 문제 없음"은 PASS 기준이 아니다. 눈에 보이는 결과(출력값 / 상태코드 / 어서션 / 조회 행수 / 화면 상태)여야 한다.
- **장면 쪼개기** — "로그인 되나 봐" 한 덩어리 금지. *진짜 떨어질 장면 여러 개*로 분해.
- **잣대** — "이게 고장나면 *어떻게 걸리나*"를 못 적는 장면 = 테스트 아님 → 버린다.

예 (로그인 5회 실패 시 15분 잠금):
- ❌ `5번 실패하면 잠긴다 | 잠금이 정상 동작함`
- ✅ `틀린 비번 5회 POST → 6번째 응답코드 == 423 + body에 retry_after. 4번째는 401(미잠금).`

```markdown
## Test Plan

| # | 시나리오 | 분류 | 방식 | PASS 기준 (구체적 기대값) |
|---|---------|------|------|----------|
| 1 | <쪼갠 장면 한 줄: 무엇을 실행> | [AUTO] / [USER] | <카탈로그 방식> | <관측 가능한 구체값 — 출력/상태코드/조회결과/화면상태> |
| 2 | ... | ... | ... | ... |

(UX/UI task — 목업 있으면) 시각 시나리오 정답지: `.project/tasks/<NNN_slug>/mockup/<task-doc-name>-mockup.html`
```

#### 시각 영역 fix 사이클 사전 예고 (stash FRICTION_LOG #14 반영)

시각 영역 시나리오가 1개 이상 있으면 Test Plan 끝에 명시:

> 시각 영역 항목 N개 — 한 사이클로 100% 일치 보장 X. fix 사이클 1~2회 예상. ✗ 발견 시 정상 (사용자 부정 반응 누적 방지 — 기대치 사전 정렬).

#### 가이드라인 (TASK_DOC_RULE §2.5 정합)

- **자기완결적**: `/task-test` 격리 세션이 *task.md만 보고* 수행 가능. 메인의 plan/dev 컨텍스트 없이.
- **명령/기대값 포함**: 무엇을 실행하고 무엇이 기대되는지 명확.
- **메인 가정 X**: *"잘 될 거야"* / *"문제 없을 듯"* 같은 가정 금지.
- **grep/Read-only 존재 확인 시나리오 = 보조용, PASS 대체 영구 금지** (stash FRICTION_LOG 2026-06-01 반영) — 구현 코드의 존재 여부를 grep/Read로 재확인하는 시나리오는 *동어반복*. PASS 카운트에서 제외, 실동작 시나리오의 *보조*로만 사용. 단독 검증 가치 X — grep으로 실동작 검증을 *대체*할 수 없다(task-test 룰 10과 동일 강도).
- **요구사항당 end-to-end 1개 이상 강제** — Requirements 각 항목이 *사용자 관점에서 실제 작동하는지* 검증하는 end-to-end 실동작 시나리오 최소 1개 보장. 산출물 실행 → 결과 확인 형태.
- **무거운 검증 회피 영구 금지** — 부담(빌드 수 분+ / 외부 의존 / 환경 설정) 이유로 실동작 시나리오를 grep 동어반복으로 대체 X. 최소 1회는 실제 산출물로 확인. 부담은 *fix 사이클 1~2회 예상* 같은 사전 예고로 처리 (생략 사유 X).

#### 요구사항 ↔ 시나리오 커버리지 점검 (필수 — stash FRICTION_LOG 2026-06-01 반영)

Test Plan 작성 완료 후 *반드시* 점검 단계 수행. *"누적/리셋 안 함"* 같은 요구사항이 시나리오에서 통째로 빠지는 누락 차단용.

1. Requirements 섹션 합의 항목 전체를 *매트릭스*로 펼침.
2. 각 요구사항 항목당 *최소 1개 시나리오 커버* 확인.
3. 미커버 항목 발견 시 → 시나리오 보강 후 재점검.

형식 (Test Plan 끝에 첨부):

```markdown
### Requirements ↔ Test Plan 매트릭스

| 요구사항 | 커버 시나리오 # |
|---------|----------------|
| <Req 1 한 줄> | #1, #3 |
| <Req 2 한 줄> | #2 (end-to-end) |
| <Req 3 한 줄> | #5 |
```

#### 실행 경로 확인 — "이 프로젝트에서 이 방식을 실제로 어떻게 돌리나" (필수)

방식을 골랐어도, **격리 세션이 *이 프로젝트의* DB/API/E2E에 실제로 어떻게 접근하는지 모르면 그 시나리오는 실행 불가능한 허울뿐인 명세다.** 스택마다 다르다(NestJS+TypeORM이면 그 DataSource/repository, 다른 프로젝트는 또 다름). 그래서 *모르면 묻고, 알면 재사용*:

1. 필요 방식마다 `$MAIN_WT/.project/TEST-GUIDE.md`를 Read → **이 프로젝트에 실행 경로가 적혀 있나** 확인.
2. **있으면** → 그 경로를 시나리오의 *방식* 칸에 반영(재사용). 앱은 기존 실행 명령으로 띄움.
3. **없으면** → *멈추고 사용자에게 요구*: 예) *"이 요구사항은 DB 검증이 필요한데 이 프로젝트에 실행 경로가 없다. 어떻게 검증할지 알려주거나 도구를 깔아줘."* → 사용자가 경로를 주거나 결정.
4. **확인받은 즉시 `TEST-GUIDE.md`에 기록** → 다음 task/세션부터 안 묻고 재사용. (재사용 = 기억이 아니라 *파일* — 세션/컴팩트로 사라지지 않게.)

> TEST-GUIDE는 init이 빈 골격으로 깔아둔다(`.project/TEST-GUIDE.md`). 방식별 섹션(데이터 검증 / API 호출 / UI·E2E / 시각 실행 / 기타)에 *이 프로젝트의 실제 실행 방법*을 채운다.

#### 검증/테스트 명령 참조

`/task-test` 격리 세션은 프로젝트 루트 `CLAUDE.md`의 두 섹션 + `TEST-GUIDE.md`를 자동 참조 — Test Plan에 재인용 불필요:
- `## 검증 명령` (코드 상태 — 빌드/린트/타입체크)
- `## 테스트 명령` (테스트 실행 — 단위/통합/E2E)
- `.project/TEST-GUIDE.md` (각 방식의 *이 프로젝트 실제 실행 방법*)

### Step 6 — spec-diff 처리 (Phase 0 변경 있을 시)

1. `.project/tasks/<NNN_slug>/spec-diffs/` 디렉토리 존재 확인 (없으면 `mkdir -p`).
2. `spec-diffs/<NNN>_<slug>_spec-diff.md` Write — 형식:

```markdown
# Spec Diff — TASK-<NNN> <제목>

## <.project/<문서명>.md> [NEW|MOD|DEL]

+++
+ <추가/변경 내용>
---
- <삭제 내용 (있을 시)>
```

3. 변경 없음 → Phase 0 자체 생략 + spec-diff 파일 생성 X.

### Step 7 — 사용자 합의 + 상태 전이

1. 작성된 4 섹션 보여주기 — *"이렇게 가자?"* 합의 요청.
2. 사용자 *"OK"* / *"수정해줘"* 응답:
   - **OK** → Step 8 진행.
   - **수정 요청** → 해당 섹션 수정 후 다시 합의. 한도 없이 반복 OK (반복 잦으면 task 분리/규모 재조정 검토).
3. 합의 완료 후 헤더 status → `planned`로 Edit.

### Step 8 — 결과 보고

```
✅ TASK-<NNN> 기획 완료
- Requirements / Scope / Dev Plan / Test Plan 작성
- 상태: draft → planned
- Phase 수: <N>개 (규모: <X>)
- spec-diff: <있음 / 없음>
- 다음: /task-dev TASK-<NNN> 으로 구현 진입
```

## 도구 가이드

- **Read**: task 파일 / `.project/` 루트 제품 관통 문서 / 관련 코드 정독
- **Grep / Glob**: Scope 코드 서치 (관련 함수/파일 탐색)
- **Edit**: task 파일 4 섹션 채우기 + status 전환
- **Write**: spec-diff 파일 (Phase 0 변경 시)
- **AskUserQuestion**: Requirements 증폭 confirm / 합의 단계 / Phase 분할 검토

## 주의사항

- **본문 영역만 작성** — 헤더 5컬럼 중 *상태*만 갱신(`draft` → `planned`). 생성일/플랜/유형/규모는 `/task-init`에서 작성된 값 유지. 단 Step 4에서 *규모가 명백히 잘못 추정*된 게 드러나면 사용자 confirm 후 갱신 OK (예: medium 추정했는데 Phase 8개 나옴 → large 갱신 + 분리 검토).
- **Phase 선제적 일괄 작성 금지** — small task에 medium 분량 Phase 작성하는 함정 회피. 명확한 것만 작성하고 진행 중 추가.
- **Test Plan = 실질 동작 시나리오 (유닛 테스트 X)** — Test Plan은 *요구사항이 정상 동작하는지* 검증. 유닛 테스트는 task-dev Step 6.5에서 단일 시점 실행 (코드 정상성 영역, Test Plan과 직교).
- **Test Plan 자기완결적** — 격리 세션이 *task.md만 보고* 수행 가능해야. 메인의 plan/dev 컨텍스트 *"위 Phase에서 만든 X"* 같은 표현 금지. 코드/동작/명령만 명시.
- ***"잘 될 거야"* 가정 금지** — Test Plan에 메인 가정 작성 금지. 코드와 동작만 신뢰.
- **합의 없이 status 전환 X** — 사용자 OK 받기 전 `planned` 작성 금지. 합의가 *대화로 OK = 자동 전이* 룰의 핵심.
- **과규모(large) 시 분리 제안** — Phase 8개 초과 또는 성격 다른 기능 혼재 시 task 분리 권장. 사용자에게 *"A/B로 쪼갤까요?"* 제안.
- **UX/UI task — 목업 프로세스 누락 X** — UX/UI 구현 task는 Step 4.5 목업 confirm 필수. 사용자 *NO* 응답이면 패스, *OK*면 생성 + 승인. 목업 누락 시 task-test 시각 USER 시나리오 기준 부재.
- **디자인 산출 정독 의무 (stash FRICTION_LOG #14+19 / #12 일반화)** — task에 디자인 산출 (HTML 목업 / Figma / 디자인 파일) 있으면 메인이 *직접 Read* 후 Test Plan 작성. sub-agent 위임 금지 (요약만 받아 시각 정합 깨짐).
- **모호 발화 confirm 룰 (stash FRICTION_LOG #21+22 반영)** — 사용자 발화가 복수 매칭 가능할 때 자율 추정 금지. 메인 *자체 안 1개* + *"X 의미 맞아?"* 한 줄 confirm. 옵션 4개 늘어놓기 금지.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| `draft` | `planned` |
| `testing` (Test Plan 보수 모드) | `testing` (유지 — Test Plan만 보수 후 `/task-test` 재실행) |

(예외 — 합의 못 함: status 그대로 `draft` 유지. 다음 호출 시 다시 시도.)
(Test Plan 보수 모드: `/task-test`가 *시험문제 결함*으로 반려한 경우만 — Step 1 가드 참조. Requirements/Scope/Dev Plan/코드 보존, status 전이 X.)
