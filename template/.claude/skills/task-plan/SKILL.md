---
name: task-plan
description: task 기획 채우기 — Requirements / Scope / Dev Plan / Test Plan 4 섹션 작성, draft → planned
---

# /task-plan

## 개요

`draft` 상태 task의 본문 4 섹션(Requirements / Scope / Dev Plan / Test Plan)을 채우고 status를 `planned`로 갱신. 사용자와 대화로 진행 — 인터뷰 + 증폭 + 코드 서치 + Phase 분할.

리뷰는 *대화로 OK* 자동 전이로 단순화 — 별도 리뷰 단계 없음.

## 멀티세션 메타 위치 (0.1.2+)

본 스킬은 워크트리에서 호출된다. 메타(`.project/`, `CLAUDE.md`) 접근 시 **메인 워크트리 절대 경로** 우선 — *task 문서 단일 진실 소스* 유지.

```sh
MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

`.gitignore` 케이스 분기:

| 케이스 | task 문서 위치 | 9 기획 문서 위치 | 동시 쓰기 |
|--------|--------------|----------------|----------|
| 등록 (퍼블릭 리포 default) | `$MAIN_WT/.project/tasks/<vX.X>/...` | `$MAIN_WT/.project/plans/<vX.X>/...` | `withMetaLock` (`bin/lib.js`) |
| 미등록 | `$WT_PATH/.project/tasks/<vX.X>/...` (워크트리 안, 머지 시 dev 반영) | `$MAIN_WT/.project/plans/<vX.X>/...` (plan 문서는 여전히 단일 소스) | 단일 세션 가정 (워크트리 내부) |

본문 모든 `.project/...` 경로는 *위 분기에 따라* 적용. spec-diff / mockup / screenshots는 task 문서와 같은 위치.

## 호출 시점

- `/task-init`로 만든 빈 골격 task에 기획 채울 때.
- 기존 task 기획 다시 짜고 싶을 때 (단 status=`draft`만. `planned` 이상이면 *직접 Edit*하거나 `/task-init` 새로 만들 것 권장).

## 입력 처리

인자 = (선택) `TASK-NNN` 또는 자동 선택.

분기:
- **인자 명시**: `.project/tasks/<vX.X>/<NNN>_*.md` 또는 `TASK-<NNN>_*/task.md` 찾아서 진행.
- **인자 없음**: 활성 plan 버전의 `.project/tasks/<vX.X>/` 안 *상태=draft인 가장 최근 task* 자동 선택 + confirm.

## 단계

### Step 1 — task 파일 + active plan 확인

1. `.project/AGENT-GUIDE.md` Read → 활성 plan 버전 확인.
2. task 파일 Read:
   - 인자 있음 → 해당 파일.
   - 인자 없음 → `ls .project/tasks/<vX.X>/` 결과 중 status=draft인 가장 최근 파일. 발견 시 *"TASK-<NNN> 진행할까요?"* confirm. 없으면 *"draft 상태 task가 없네요. `/task-init` 먼저 호출하세요."* + 종료.
3. 상태 = `draft` 검증. 다른 상태면 종료 + 안내.

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
4. **Phase 0 (선택) — plan 문서 변경 검토**:
   - 본 task가 `.project/plans/<vX.X>/` 9 기획 문서 중 어느 것을 *수정/추가/삭제*해야 하는지 검토.
   - 변경 있음 → Phase 0에 명시 + `spec-diffs/<NNN>_<slug>_spec-diff.md` 파일 생성 (Step 6).
   - 변경 없음 → Phase 0 생략.
5. **Phase 점진 작성 OK** — 처음부터 모든 Phase 일괄 작성 금지. 지금 명확한 Phase만 작성하고 진행 중 추가 가능.

```markdown
## Dev Plan

### Phase 0 — plans/<vX.X>/ 기획 문서 변경 (선택)
- 변경 문서: <FEATURES.md / API-SPEC.md / ...>
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

본 task가 UX/UI 구현 포함하면 *시각 영역 사전 정합* + *task-test 시 USER 검수 기준 확보*용 HTML 목업 생성.

#### 1. UX/UI 구현 task 판단

Step 2 Requirements 인터뷰 결과로 본 task가 *UX/UI 구현 (페이지/컴포넌트 신규 / 시각 변경 / 인터랙션 신규)* 포함 여부 판단.

- UX/UI 포함 → 2~5 진행
- 미포함 (백엔드 / CLI / 인프라 등) → 본 Step 패스, Step 5로 직진

#### 2. 목업 confirm

사용자에게 한 줄 질문:
*"이 task UX/UI 구현 포함되어 있어. HTML 목업 만들까? 구현 정확도 + 사용자 사전 시각 확인 + task-test 검수 기준 확보 효과."*

- 사용자 *"OK"* → 3 진행
- 사용자 *"NO"* → 본 Step 패스 (목업 없이 진행)

#### 3. 목업 생성 + 사용자 승인

1. 메인이 HTML 목업 생성 — 정적 HTML/CSS (외부 라이브러리 X, 단일 파일 안 inline style + 필요 시 vanilla JS):
   - 시각 영역 (레이아웃 / 색상 / 간격 / 타이포 / 호버 효과)
   - 인터랙션 (가능한 범위 — 클릭 / 호버 시뮬)
2. 사용자에게 *"브라우저로 `.project/tasks/<vX.X>/mockup/<task-doc-name>-mockup.html` 열어 확인 후 ✓/✗ 응답"*.
3. 사용자 ✓ → 승인 완료, 4 진행. ✗ → 메인이 수정 후 재승인 요청.

#### 4. 파일 위치 / 네이밍

- 위치: `.project/tasks/<vX.X>/mockup/<task-doc-name>-mockup.html`
  - 예: `001_login-form.md` → `001_login-form-mockup.html`
- **task 1개 = 목업 1개**. multi-file 예외 영구 X. 복잡해도 한 파일 안 섹션 분리 (`<section id="popover">` `<section id="settings">` 등).

#### 5. Test Plan 연결

승인된 목업 = task-test의 *시각 영역 USER 검수 기준*. Step 5 Test Plan 작성 시 시각 시나리오에 `[USER]` 분류 + 목업 경로 참조 명시.

---

### Step 5 — Test Plan (실질 동작 시나리오 — stash FRICTION_LOG #14+19 / #25 반영)

#### 본질

Test Plan = *본 task에서 구현한 요구사항이 정상 동작하는지* 검증 시나리오. **유닛 테스트 X** (유닛 테스트는 task-dev Step 6.5에서 단일 시점 실행 — *코드 정상성* 영역, 본 Test Plan과 직교).

검증 대상:
- 기능 동작: 사용자 입력 → 기대 결과 / API 호출 → 응답 / 데이터 처리 → 상태 변화
- UX/UI 동작: 클릭 → 결과 / 호버 → 상태 / 드래그 → 위치 변경
- UX/UI 시각: 레이아웃 / 색상 / 간격 / 호버 효과 (목업 기준)
- 백엔드 동작: 시스템 호출 → 외부 응답 / 사이드 이펙트 / 에러 처리

#### 실질 테스트 방식 카탈로그

각 시나리오마다 아래 방식 중 적합한 1개 이상 선택:

| 방식 | 적용 영역 | 설명 |
|------|----------|------|
| 수동 검수 | UI / UX / 인터랙션 | 사용자가 실제 앱·환경에서 직접 조작·확인 |
| 시나리오 스크립트 실행 | 백엔드 / 통합 흐름 | end-to-end script (bash / node 등) 일련의 명령 자동 실행 |
| API/엔드포인트 호출 | 백엔드 / 외부 인터페이스 | 실제 호출 + 응답·상태 코드·결과 데이터 확인 |
| 입출력 비교 | 함수 / 변환 / 처리 | 입력 → 출력 비교 (snapshot / golden file) |
| 사이드 이펙트 확인 | DB / 파일 / 로그 | 시나리오 실행 후 상태 직접 조회 |
| 회귀 시나리오 | 기존 기능 영향 | 직전 동작하던 시나리오 재실행 |
| E2E 자동화 도구 | UI 자동화 (도구 있을 시) | Playwright / Cypress / XCTest UI Test 등 — 가능하면 자동화, 안 되면 수동 검수 |

#### UX/UI 영역 분리 + 검증 방식 매트릭스 (UX/UI 구현 task 한정)

| 영역 | 자동화 가능 시 | 자동화 불가 시 |
|------|---------------|---------------|
| 동작 (클릭/호버/드래그/입력 → 결과) | `[AUTO]` E2E 자동화 시나리오 스크립트 | `[USER]` 체크리스트 |
| 시각 (레이아웃/색상/간격/호버 효과 강도) | (자동 비교 의미 없음 — 픽셀 단위 변화 + 주관 판단 영역) | `[USER]` 체크리스트 + 목업 기준 참조 |

#### 시나리오 형식

```markdown
## Test Plan

| # | 시나리오 | 분류 | 방식 | PASS 기준 |
|---|---------|------|------|----------|
| 1 | <한 줄 설명> | [AUTO] / [USER] | <카탈로그 방식> | <명확한 기대값> |
| 2 | ... | ... | ... | ... |

(UX/UI task — 목업 있으면) 시각 USER 시나리오 기준: `.project/tasks/<vX.X>/mockup/<task-doc-name>-mockup.html`
```

#### 시각 영역 fix 사이클 사전 예고 (stash FRICTION_LOG #14 반영)

시각 영역 시나리오가 1개 이상 있으면 Test Plan 끝에 명시:

> 시각 영역 항목 N개 — 한 사이클로 100% 일치 보장 X. fix 사이클 1~2회 예상. ✗ 발견 시 정상 (사용자 부정 반응 누적 방지 — 기대치 사전 정렬).

#### 가이드라인 (TASK_DOC_RULE §2.5 정합)

- **자기완결적**: `/task-test` 격리 세션이 *task.md만 보고* 수행 가능. 메인의 plan/dev 컨텍스트 없이.
- **명령/기대값 포함**: 무엇을 실행하고 무엇이 기대되는지 명확.
- **메인 가정 X**: *"잘 될 거야"* / *"문제 없을 듯"* 같은 가정 금지.

#### 검증/테스트 명령 참조

`/task-test` 격리 세션은 프로젝트 루트 `CLAUDE.md`의 두 섹션을 자동 참조 — Test Plan에 재인용 불필요:
- `## 검증 명령` (코드 상태 — 빌드/린트/타입체크)
- `## 테스트 명령` (테스트 실행 — 단위/통합/E2E)

### Step 6 — spec-diff 처리 (Phase 0 변경 있을 시)

1. `.project/tasks/<vX.X>/spec-diffs/` 디렉토리 존재 확인 (없으면 `mkdir -p`).
2. `spec-diffs/<NNN>_<slug>_spec-diff.md` Write — 형식:

```markdown
# Spec Diff — TASK-<NNN> <제목>

## <plans/<vX.X>/<문서명>.md> [NEW|MOD|DEL]

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

- **Read**: task 파일 / 활성 plan 9 기획 문서 / 관련 코드 정독
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

(예외 — 합의 못 함: status 그대로 `draft` 유지. 다음 호출 시 다시 시도.)
