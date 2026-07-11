# TASK_DOC_RULE

> taskery 태스크 문서(`task.md` 또는 `NNN_kebab-slug.md`) 작성 규칙.
> **이 양식 그대로 채워. 섹션 추가/삭제 금지. 변형은 hook으로 차단되지 않으나 메인이 일관성 위해 강제 준수.**

---

## 1. 양식 Spec

### 1.1 헤더 표 — 6컬럼

| 생성일 | 플랜 | 유형 | 규모 | 부모 브랜치 | 상태 |
|--------|------|------|------|-------------|------|
| 2026-05-08 | 001_mvp | feature | medium | dev | developing |

- **생성일**: ISO 형식 (YYYY-MM-DD)
- **플랜**: 어느 plan(기능 그룹) 하위인지 (예: 001_mvp, 002_compare-products) — `tasks/<NNN_slug>/` 디렉토리 명과 일치
- **유형**: `feature` / `bug` / `improvement` / `refactor` / `docs` / `chore` (git 브랜치 타입과 직결)
- **규모**:
  - `micro` — 구현 파트 1개 (단일 함수/설정 수정)
  - `small` — 구현 파트 2-3개 (단순 기능)
  - `medium` — 구현 파트 4-7개 (일반 기능 또는 새 모듈)
  - `large` — 구현 파트 8개 이상 (또는 분리 검토 권장)
- **부모 브랜치**: 이 task를 분기한 기점 브랜치 = `/task-init` 시점의 메인 워크트리 현재 브랜치 (`dev` / `dev_feat_x` / `master` 등). `/task-close`가 이 브랜치로 되병합한다. `/task-init`이 자동 기록 — 수기 입력 아님. (0.6.0 이전 문서는 이 칸이 없으며, close 시 `dev`로 폴백.)
- **상태**: 7상태 머신 (1.2 참조) — 표의 *마지막* 컬럼(부모 브랜치가 그 앞)

### 1.2 상태 set — 7상태 (-ing/-ed 페어 일관성)

```
draft → planned → developing → developed → testing → tested → closed
```

| 상태 | 시점 | 작성 주체 |
|------|------|---------|
| `draft` | task.md 빈 골격 생성 직후 | `/task-init`이 헤더에 작성 |
| `planned` | plan 완료 (사용자 "이렇게 가자" OK) | `/task-plan` 끝에 메인이 갱신 |
| `developing` | dev 시작 | `/task-dev` 호출 시 메인 |
| `developed` | dev 끝 + self-check OK (린트/타입/빌드 PASS) | `/task-dev` 끝에 메인 |
| `testing` | 격리 세션 진행 중 | `/task-test` 호출 시 메인 |
| `tested` | 격리 세션 PASS 결과 받은 후 | `/task-test` 끝에 메인 |
| `closed` | git 마무리 완료 | `/task-close` 끝에 메인 |

**FAIL/UNCERTAIN 분기** (세 갈래 — 코드 결함 / 시험문제 결함 / 주관 검수):
- `/task-test` PASS → `tested` 갱신 → `/task-close` 진행
- `/task-test` FAIL (**코드 결함**) → 메인이 격리 결과(로그/근거) 보고 → 사용자에게 *"고쳐? OK 마무리?"* 묻기 → "고쳐" 시 `developing`으로 되돌림 → `/task-dev` 재진입
- `/task-test` UNCERTAIN(**검증 불가 = 시험문제 결함**) → `[AUTO]`인데 대조할 기대값을 구성 못 한 경우. 코드는 멀쩡 → `developing` 아님. **status=`testing` 유지** + `/task-plan`을 *Test Plan 보수 모드*로 재호출(Test Plan 섹션만 보수, Requirements/Scope/Dev Plan/코드 보존) → 보수 후 `/task-test` 재실행. (되돌림용 별도 status 신설 X — 7상태 유지.)
- `/task-test` UNCERTAIN(**사람 검수**) → 정답지가 주관인 `[USER]` 항목(시각 미세 취향 / UX 느낌). `testing` 유지 + 사용자 직접 검수 → 모두 ✓면 `tested`, ✗면 `developing`(고쳐).
- `/task-dev` 중 self-check FAIL → `developing` 그대로, 메인 자체 수정 → PASS 시 `developed` 갱신

> **시험문제 결함 되돌림이 새 status를 안 만드는 이유**: 새 상태(예: `replanning`)는 -ing/-ed 페어 원칙(본 §1.2)·7상태 고정과 충돌하고 `closed-immutable.sh` 화이트리스트와도 어긋난다. 코드 미변경이라 `developing`을 거칠 이유도 없으므로 `testing`을 유지한 채 Test Plan만 보수한다.

### 1.3 섹션 구성 — 6 섹션

```markdown
# TASK-NNN — <태스크 이름>

| 생성일 | 플랜 | 유형 | 규모 | 부모 브랜치 | 상태 |
|--------|------|------|------|-------------|------|
| ... | ... | ... | ... | ... | ... |

## Requirements
<요구사항 + 메인이 증폭/구체화한 내용>

## Scope
<영향 범위 — 어느 파일의 어느 로직 / 신규 파일 / 등>

## Dev Plan

### Phase 1 — <짧은 이름>
- 파일: ...
- 왜: ...
- 어떻게: ...
- 완료 기준: ...
- 진행: [ ]

### Phase 2 — <짧은 이름>
- ...

## Test Plan
<테스트 방법 — /task-test 격리 세션이 그대로 수행>

## Result
<진행 결과 + 테스트 결과 통합>
```

- Header 섹션은 *별도 헤딩 없이* 표 자체. 그 위 `# TASK-NNN — 이름`은 파일 제목.
- Phase는 Dev Plan 안 sub-섹션. 별도 파일 X. 진행하며 점진적으로 추가.

### 1.4 폐기된 항목

- **revision/approved 상태 단계 폐기**: 11상태 → 7상태 단순화. *대화로 OK = 다음 상태로 자동 전이*.
- **프로젝트 컬럼**: `.project/` 폴더 자체가 프로젝트라 중복.
- **우선순위 컬럼**: 단독 task 흐름에서 의미 약함. 필요해지면 PLAYBOOK §8 부활.
- **Phase 별 파일 분리**: waterfall 선제적 작성 함정. Dev Plan 안 sub-섹션으로 점진 추가.

### 1.5 task 파일 / 폴더 / 부속 자료 위치 (단일 진실 소스)

| 항목 | 위치 | 작성 주체 |
|------|------|---------|
| 단일 파일 task | `.project/tasks/<NNN_slug>/<NNN>_<slug>.md` (예: `001_login-feature.md`) | `/task-init` |
| 폴더 승격 task | `.project/tasks/<NNN_slug>/TASK-<NNN>_<slug>/task.md` | `/task-init` (*사용자 명시 시에만* — 규모 large여도 자동 승격 X) |
| spec-diffs (변경된 제품 문서(루트) 추적) | `.project/tasks/<NNN_slug>/spec-diffs/<NNN>_<slug>_spec-diff.md` (**`<NNN_slug>` 공통** — 단일/폴더 모두) | `/task-plan` Step 6 (Phase 0 변경 시) |
| screenshots (UI 작업 자료) | `.project/tasks/<NNN_slug>/screenshots/<NNN>_*.png` (**`<NNN_slug>` 공통**) | `/task-test` 격리 세션 또는 메인 |
| mockup (UX/UI HTML 목업) | `.project/tasks/<NNN_slug>/mockup/<task-doc-name>-mockup.html` (**`<NNN_slug>` 공통** — 단일/폴더 모두) | `/task-plan` Step 4.5 (UX/UI task 한정) — 단일 진실 소스 `MOCKUP_RULE.md` |
| 폴더 승격 task의 추가 자료 (서브 문서 등) | `TASK-<NNN>_<slug>/` 안 자유 | 메인 / `/task-dev` |

**원칙**:
- spec-diffs / screenshots / mockup은 *`<NNN_slug>` 공통* — 파일명 NNN prefix 또는 task 문서 파일명으로 task 식별. 폴더 승격 task도 동일 (별도 spec-diffs/screenshots/mockup 만들지 X).
- `<NNN_slug>` 공통 디렉토리는 `/plan-init`이 mkdir.
- **spec-diff = per-task 기록** — 그 task가 어느 *제품 문서(`.project/` 루트)*를 NEW/MOD/DEL 했는지의 task 산출물. 제품 문서의 *정식 변경 이력은 git*이 단일 진실이며, 별도 전역 변경 인덱스는 두지 않는다.
- 폴더 승격은 *task의 추가 자료*용 (서브 문서 / 디자인 자료 등) — *spec-diffs / screenshots / mockup 위치 X*.

**closed-immutable hook 보호 범위** — task.md 본 파일만 (단일 파일 또는 폴더 승격 task.md). spec-diffs / screenshots / mockup / 폴더 승격 추가 자료는 *역사적 자료*로 자유 수정.

---

## 2. 작성 방법 — 단계별 절차

### 2.1 헤더 작성 (`/task-init`)

1. `tasks/<NNN_slug>/` 디렉토리 안 가장 큰 NNN+1로 task 번호 결정 (예: 기존 002까지 있으면 003)
2. kebab-slug = 태스크 이름 한국어 → 영어 kebab-case (예: "로그인 기능 추가" → `login-feature`)
3. 파일명 = `NNN_kebab-slug.md` (예: `003_login-feature.md`). *사용자 명시 시* 폴더 승격 (`TASK-003_login-feature/task.md`) — 규모 large여도 자동 승격 X.
4. 파일 제목 작성: `# TASK-003 — 로그인 기능 추가`
5. 헤더 표 작성 (6컬럼 모두 채움):
   - 생성일: 오늘 (YYYY-MM-DD)
   - 플랜: 현재 active plan (예: 001_mvp — `NNN_slug` 폴더명)
   - 유형: 사용자/메인 합의 (feature/bug/...)
   - 규모: 사용자/메인 합의 (micro/small/medium/large)
   - 부모 브랜치: `/task-init`(fork) 시점의 현재 브랜치 — 코드가 자동 기록(수기 X)
   - 상태: `draft` (고정)
6. 6 섹션 placeholder 작성 (Requirements / Scope / Dev Plan / Test Plan / Result는 빈 헤딩만).

### 2.2 Requirements 작성 (`/task-plan` 1단계)

1. 사용자 발화 정독 — 무엇을 원하는지 명확화.
2. 메인이 *증폭/구체화* — 사용자가 빠뜨린 디테일 보충 (예: 에러 처리, 빈 값 처리, 보안 고려).
3. 사용자 confirm — *"이렇게 이해했는데 맞아?"* 한 번 확인.
4. Requirements 섹션에 작성:
   - 사용자 원래 요구
   - 메인 증폭 디테일
   - 합의된 최종 요구

### 2.3 Scope 작성 (`/task-plan` 2단계)

1. 코드베이스 탐색 — Grep / Read / `find` 등으로 *영향 받을 파일* 찾기.
2. 관련 파일 목록 작성:
   - 수정될 파일 (어느 함수/로직)
   - 신규 파일 (예상 경로/역할)
   - 인접 파일 (간접 영향 가능성)
3. Scope 섹션에 작성 — *"이 task가 다루는 영역은 이 범위"* 정의.

### 2.4 Dev Plan 작성 (`/task-plan` 3단계)

1. 구현 파트 식별 — 규모(micro/small/medium/large)에 따라 1~8+ phase.
2. 각 phase = 독립 단위 (커밋 1개 단위로 의미 있는 단위).
3. 각 phase에 5 필드:
   - **파일**: 변경 대상 (예: `src/auth/login.ts`)
   - **왜**: 이 phase의 동기/목적
   - **어떻게**: 구현 방법 요약 (1~3줄)
   - **완료 기준**: 이 phase가 끝났다고 판단할 기준 (예: "API endpoint 응답 200 반환")
   - **진행**: `[ ]` (미완료) / `[x]` (완료)
4. **Phase 점진 추가 OK** — 처음에 medium 규모 task의 phase 4개만 작성하고, 진행 중 phase 5 추가 가능. waterfall 선제적 작성 금지.

### 2.5 Test Plan 작성 (`/task-plan` 4단계)

**본질** — Test Plan = *본 task에서 구현한 요구사항이 정상 동작하는지* 검증 시나리오. **유닛 테스트 X** (유닛 테스트는 `/task-dev` Step 6.5에서 단일 시점 실행 — 코드 정상성 영역, Test Plan과 직교).

**검증 대상**:
- 기능 동작: 사용자 입력 → 기대 결과 / API 호출 → 응답 / 데이터 처리 → 상태 변화
- UX/UI 동작: 클릭 → 결과 / 호버 → 상태 / 드래그 → 위치 변경
- UX/UI 시각: 레이아웃 / 색상 / 간격 / 호버 효과 (목업 기준)
- 백엔드 동작: 시스템 호출 → 외부 응답 / 사이드 이펙트 / 에러 처리

**시나리오 형식** — 모든 `[AUTO]` = [실행 명령/입력] + [구체적·관측 가능한 기대값] 한 쌍:

```markdown
## Test Plan

| # | 시나리오 | 분류 | 방식 | PASS 기준 (구체적 기대값) |
|---|---------|------|------|----------|
| 1 | <쪼갠 장면 한 줄: 무엇을 실행> | [AUTO] / [USER] | <카탈로그 방식> | <관측 가능한 구체값 — 출력/상태코드/조회결과/화면상태> |
| 2 | ... | ... | ... | ... |
```

- **소원 금지** — "정상 동작 / 잘 됨 / 확인한다"는 PASS 기준이 아님. 눈에 보이는 결과여야 함.
- **장면 쪼개기** — 한 덩어리 금지, 진짜 떨어질 장면 여러 개로.
- **잣대** — "고장나면 어떻게 걸리나"를 못 적는 장면 = 버린다. (이게 task-test "문 앞 검사" 자격 — 미달 시 *시험문제 결함*으로 반려됨.)

**분류 강제**:
- `[AUTO]` — 정답지(구체적 기대값)를 구성할 수 있는 영역. 격리 세션이 *실제 명령 실행 + 결과 로그* 확보 → 기대값과 일치 시만 PASS. **시각 *객관* 깨짐(레이아웃/요소 유무/색/배치)도 `[AUTO]`** (캡처-목업 대조, 목업이 정답지).
- `[USER]` — *정답지가 주관*인 영역만 (시각 미세 취향 / 색조·2px / UX 느낌). 격리 세션은 UNCERTAIN(사람 검수) 분류 + *사용자 직접 검수 항목*으로 리턴(증거 캡처 첨부). UI 인터랙션은 E2E 도구 있으면 `[AUTO]`, 없으면 `[USER]`.

**방식 선택 규칙** (요구사항 성격 → 필수 방식, 재량 0): 화면 변경→시각 / 상호작용→UI 동작 / 엔드포인트→API / 데이터 쓰기→상태 조회 / 순수 계산→입출력 / 기존 영역 건드림→회귀. 여러 개 걸리면 다 붙인다.

**방식 카탈로그** (시나리오마다 1개 이상 — 각 방식은 *비교할 정답지*가 다름):

| 방식 | 적용 영역 | 정답지 | 누가 검사 |
|------|----------|------|------|
| 수동 검수 | UI 미세 / UX 느낌 | 주관(목업·사용감) | 사람 (증거 첨부) |
| 시나리오 스크립트 실행 | 백엔드 / 통합 흐름 (end-to-end script) | 구체적 출력·종료코드 | test 자동 |
| API/엔드포인트 호출 | 백엔드 / 외부 인터페이스 | 상태코드 + 응답 필드값 | test 자동 |
| 입출력 비교 | 함수 / 변환 / 처리 | 구체적 기대 출력 (snapshot / golden) | test 자동 |
| 사이드 이펙트 확인 | DB / 파일 / 로그 | 조회 결과(행/파일/카운트) | test 자동 |
| 시각 (캡처-목업 대조) | UI 레이아웃/색/배치 | 승인된 목업 | test 자동 (+ 미세는 사람) |
| 회귀 시나리오 | 기존 기능 영향 | 이전과 동일 결과 | test 자동 |
| E2E 자동화 도구 | UI 동작 자동화 | 액션 후 관측 변화 | 도구면 test, 아니면 사람 |

**관통 규칙**: 어느 방식이든 *실제 관측 결과* == *구체적 정답지*여야 PASS. 정답지가 주관이면 사람한테(단 증거 깔고). 어느 방식도 코드 정독·grep으로 PASS 대체 금지.

**UX/UI 영역 분리** (UX/UI 구현 task 한정):

| 영역 | 분류 | 기준 |
|------|------|------|
| 동작 (클릭 / 호버 / 드래그 / 입력 → 결과) | 도구 있으면 `[AUTO]` E2E, 없으면 `[USER]` | 액션 후 관측 변화 |
| 시각 *객관* (레이아웃 / 요소 유무 / 색 / 배치 깨짐) | `[AUTO]` 캡처-목업 대조 | 승인 목업 (`mockup/<task-doc-name>-mockup.html`) — 화면 캡처 → 대조 → 어긋남 목록 |
| 시각 *미세 취향* (2px / 색조 / 호버 강도 / 느낌) | `[USER]` 체크리스트 + 목업 참조 | 사용자 최종 사인 (증거 캡처) |

**시각 영역 fix 사이클 사전 예고** — 시각 시나리오 있으면 Test Plan 끝에 *"시각 영역 항목 N개 — fix 사이클 1~2회 예상"* 명시 (사용자 기대치 사전 정렬).

**검증 / 테스트 명령 참조** — `CLAUDE.md`의 `## 검증 명령` (코드 상태: 빌드 / 린트 / 타입체크) + `## 테스트 명령` (테스트 실행: 단위 / 통합 / E2E) 두 섹션을 격리 세션이 자동 참조. Test Plan 본문에 재인용 불필요.

**가이드라인**:
- **자기완결적**: `/task-test` 격리 세션이 *task.md만 보고도* 수행 가능. 메인의 plan/dev 컨텍스트 없이.
- **명령 / 기대값 포함**: 무엇을 실행하고 무엇이 기대되는지 명확.
- **메인 가정 X**: 격리 세션이 *코드와 동작만 신뢰*. *"잘 될 거야"* 같은 가정 금지.
- **grep/Read-only 존재 확인 시나리오 = 보조용, PASS 대체 영구 금지** (stash FRICTION_LOG 2026-06-01 반영) — 구현 코드의 존재 여부를 grep/Read로 재확인하는 시나리오는 *동어반복*. PASS 카운트에서 제외, 실동작 시나리오의 *보조*로만. grep으로 실동작 검증 *대체 불가* (task-test 룰 10과 동일 강도).
- **요구사항당 end-to-end 1개 이상 강제** — Requirements 각 항목이 *사용자 관점에서 실제 작동하는지* 검증하는 end-to-end 실동작 시나리오 최소 1개 보장. 산출물 실행 → 결과 확인 형태.
- **무거운 검증 회피 영구 금지** — 부담(빌드 수 분+ / 외부 의존 / 환경 설정) 이유로 실동작 시나리오를 grep 동어반복으로 대체 X. 최소 1회는 실제 산출물로 확인. 부담은 *fix 사이클 1~2회 예상* 같은 사전 예고로 처리 (생략 사유 X).

**요구사항 ↔ 시나리오 커버리지 점검** (필수 — stash FRICTION_LOG 2026-06-01 반영):

Test Plan 작성 완료 후 *반드시* 점검. *"누적/리셋 안 함"* 같은 요구사항이 시나리오에서 통째로 빠지는 누락 차단용.

1. Requirements 합의 항목 전체를 *매트릭스*로 펼침.
2. 각 항목당 *최소 1개 시나리오 커버* 확인.
3. 미커버 발견 시 → 시나리오 보강 후 재점검.

형식 (Test Plan 끝에 첨부):

```markdown
### Requirements ↔ Test Plan 매트릭스

| 요구사항 | 커버 시나리오 # |
|---------|----------------|
| <Req 1 한 줄> | #1, #3 |
| <Req 2 한 줄> | #2 (end-to-end) |
| <Req 3 한 줄> | #5 |
```

### 2.6 Result 기록 (`/task-dev`, `/task-test` 끝)

1. `/task-dev` 끝에 phase별 진행 결과 기록:
   - 각 phase 완료 → `진행: [x]` 갱신
   - 변경 파일 목록 / 코드 요약 추가
2. `/task-test` 끝에 격리 세션 결과 기록:
   - PASS / FAIL / UNCERTAIN
   - 근거 (로그 인용)
   - FAIL 시 무엇이 깨졌는지

---

## 3. 가이드라인

### 3.1 일관성

- 양식 그대로 채워. 섹션 추가/삭제 금지.
- 헤더 6컬럼 모두 채움 — *"미정"* 같은 placeholder 금지 (의사결정 위임 X). 부모 브랜치는 코드 자동 기록.
- 상태 7개 외 단어 사용 금지.

### 3.2 자기완결성

- task.md 하나만 보고도 *Requirements 이해 / Scope 파악 / Dev 재현 / Test 수행* 가능해야.
- 다른 문서 참조는 *"§ARCHITECTURE.md 1.2 참조"* 식으로 명시. 묵시적 의존 X.

### 3.3 메인 가정 X

- Test Plan에 *"잘 될 거야"* / *"문제 없을 듯"* 같은 가정 금지.
- *코드와 동작만 신뢰*. 격리 세션이 가정 없이 수행 가능하게.

### 3.4 점진 작성 OK

- Phase 선제적 일괄 작성 금지. 진행하며 점진적으로 추가.
- 단 *전체 스코프*는 처음에 정의 (Scope 섹션). 스코프가 진행 중 늘어나면 *task 분리 검토*.

### 3.5 짧고 명확하게

- 각 섹션 verbose 금지. 한국어/영어 혼용 OK.
- bullet point 활용. 산문 단락 최소화.

---

## 4. 섹션별 짧은 설명 + 예시 스니펫

### 4.1 Header

**역할**: task 메타 정보. 한 눈에 *언제 / 어느 plan / 무슨 작업 / 얼마만큼 / 지금 어디*.

```markdown
# TASK-007 — 로그인 폼 유효성 검증

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| 2026-05-08 | 001_mvp | feature | small | planned |
```

### 4.2 Requirements

**역할**: 사용자 요구 + 메인 증폭. *"무엇을 만드는가"*.

```markdown
## Requirements

사용자 요구:
- 로그인 폼에 이메일/비밀번호 유효성 검증 추가

메인 증폭:
- 빈 값 / 형식 오류 / 길이 부족 케이스 모두 메시지 표시
- 검증 통과 후에만 API 호출 (네트워크 낭비 회피)
- 메시지는 i18n 대응 (한국어 / 영어 분기)

합의:
- 위 3가지 모두 적용. i18n은 기존 방식(react-i18next) 그대로 사용.
```

### 4.3 Scope

**역할**: 영향 범위. *"어느 파일 어느 로직 다루는가"*.

```markdown
## Scope

수정:
- `src/components/LoginForm.tsx` — 폼 onSubmit + 입력 onChange
- `src/utils/validation.ts` — 신규 헬퍼 (validateEmail / validatePassword)
- `src/i18n/ko.json` / `src/i18n/en.json` — 검증 메시지 키 추가

신규:
- `src/utils/validation.test.ts` — 헬퍼 단위 테스트

인접 (간접 영향 가능):
- `src/api/auth.ts` — 호출 시점 변경 (검증 통과 후)
```

### 4.4 Dev Plan

**역할**: 구현 phase 분할. *"어떻게 만드는가"*.

```markdown
## Dev Plan

### Phase 1 — validation.ts 헬퍼 작성
- 파일: `src/utils/validation.ts`
- 왜: 폼 입력 검증 로직 분리, 단위 테스트 가능 단위로
- 어떻게: validateEmail (regex) + validatePassword (길이 8+) export
- 완료 기준: validation.test.ts PASS
- 진행: [x]

### Phase 2 — LoginForm 통합
- 파일: `src/components/LoginForm.tsx`
- 왜: 폼 onSubmit/onChange에서 헬퍼 호출
- 어떻게: useState로 errors 관리, validateEmail/Password 결과 setErrors
- 완료 기준: 폼 빈 값 제출 → 메시지 표시 / 정상값 → API 호출
- 진행: [x]

### Phase 3 — i18n 메시지 추가
- 파일: `src/i18n/ko.json` / `src/i18n/en.json`
- 왜: 한국어/영어 메시지 분기
- 어떻게: validation.email.empty / validation.email.format / validation.password.short 키 추가
- 완료 기준: 언어 전환 시 메시지 따라 변경 확인
- 진행: [ ]
```

### 4.5 Test Plan

**역할**: 격리 세션이 그대로 수행할 검증. *"제대로 됐는지 어떻게 확인하는가"*.

```markdown
## Test Plan

| # | 시나리오 | 분류 | 방식 | PASS 기준 |
|---|---------|------|------|----------|
| 1 | 빈 이메일 + 비밀번호 제출 | [USER] | 수동 검수 | "이메일 입력 필요" + "비밀번호 입력 필요" 표시, API 호출 X |
| 2 | 잘못된 이메일 형식 ("abc") | [USER] | 수동 검수 | "올바른 이메일 형식 아님" 표시, API 호출 X |
| 3 | 짧은 비밀번호 ("123") | [USER] | 수동 검수 | "비밀번호 8자 이상 필요" 표시, API 호출 X |
| 4 | 정상값 제출 | [USER] | 수동 검수 | API 호출 → 정상 응답 시 / 리다이렉트 |
| 5 | 한국어 ↔ 영어 전환 | [USER] | 수동 검수 | 메시지 언어 따라 변경 |
```

> 검증 명령 / 테스트 명령은 `CLAUDE.md` 두 섹션을 격리 세션이 자동 참조 — Test Plan 본문 재인용 X.

### 4.6 Result

**역할**: 진행 + 테스트 결과 통합. *"실제로 어떻게 됐는가"*.

```markdown
## Result

### 진행
- Phase 1: validation.ts 작성, validation.test.ts 12 케이스 PASS.
- Phase 2: LoginForm 통합 완료. errors state로 메시지 렌더링.
- Phase 3: i18n 키 6개 추가, 언어 전환 시나리오 확인.

### 테스트 (격리 세션 결과)
- **PASS**.
- 1~6 시나리오 모두 기대대로.
- 검증 명령 모두 PASS.
- 근거: 격리 세션 로그 — `validation.test.ts` 12/12 PASS, dev 브라우저 수동 확인 5/5 PASS.
```

---

## 5. 완성 예시 — 유형별 3개

### 예시 1: chore/micro (한 줄 픽스)

```markdown
# TASK-001 — README.md 오타 수정

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| 2026-05-08 | 001_mvp | chore | micro | closed |

## Requirements
사용자 요구:
- README.md "Instalation" 오타를 "Installation"으로 수정.

## Scope
수정:
- `README.md` — 12행 한 줄.

## Dev Plan

### Phase 1 — 오타 수정
- 파일: `README.md`
- 왜: 표기 오류
- 어떻게: 12행 "Instalation" → "Installation"
- 완료 기준: 파일 내 검색 결과 0건
- 진행: [x]

## Test Plan

| # | 시나리오 | 분류 | 방식 | PASS 기준 |
|---|---------|------|------|----------|
| 1 | README.md 안 오타 검색 | [AUTO] | 시나리오 스크립트 실행 | `grep -n "Instalation" README.md` 결과 0건 |
| 2 | README.md 안 정정 표기 검색 | [AUTO] | 시나리오 스크립트 실행 | `grep -n "Installation" README.md` 결과 1건 이상 |

## Result

### 진행
- Phase 1: 12행 sed 1회 수정.

### 테스트 (격리 세션 결과)
- **PASS**.
- `grep -n "Instalation" README.md` → 0건.
- `grep -n "Installation" README.md` → 1건 (12행).
```

---

### 예시 2: feature/medium (로그인 기능)

```markdown
# TASK-007 — JWT 기반 로그인 기능

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| 2026-05-08 | 001_mvp | feature | medium | tested |

## Requirements
사용자 요구:
- 이메일/비밀번호 로그인 기능 추가.
- JWT 토큰으로 세션 관리.

메인 증폭:
- 비밀번호는 bcrypt 해시 비교 (DB 평문 저장 금지).
- JWT 만료 24시간, refresh token 별도 (만료 7일).
- 잘못된 자격증명 시 동일 메시지 (*"이메일 또는 비밀번호가 올바르지 않습니다"*) — enumeration 방어.
- rate limit (분당 10회) 추가.

합의:
- 위 모두 적용. refresh token은 httpOnly cookie로.

## Scope
수정:
- `src/api/auth.ts` — login 엔드포인트 추가
- `src/middleware/jwt.ts` — JWT 검증 미들웨어 (신규)
- `src/middleware/rateLimit.ts` — express-rate-limit 통합 (신규)
- `src/db/users.ts` — findByEmail 쿼리 추가
- `src/utils/password.ts` — bcrypt compare 헬퍼 (신규)

신규:
- `src/api/auth.test.ts` — 로그인 엔드포인트 통합 테스트

인접 (간접 영향):
- `src/app.ts` — 미들웨어 체인 등록
- `src/types/index.ts` — JwtPayload 타입 추가

## Dev Plan

### Phase 1 — password.ts bcrypt 헬퍼
- 파일: `src/utils/password.ts`
- 왜: 비밀번호 해시 비교 분리, 단위 테스트 가능
- 어떻게: bcrypt.compare(plain, hash) wrapper export
- 완료 기준: 단위 테스트 PASS (정상/오류 케이스)
- 진행: [x]

### Phase 2 — users.ts findByEmail
- 파일: `src/db/users.ts`
- 왜: 이메일로 사용자 조회 쿼리
- 어떻게: prisma.user.findUnique({ where: { email } })
- 완료 기준: 존재/미존재 케이스 모두 정상 동작
- 진행: [x]

### Phase 3 — jwt.ts 미들웨어
- 파일: `src/middleware/jwt.ts`
- 왜: 보호 라우트에 JWT 검증
- 어떻게: jsonwebtoken verify, payload를 req.user에 담음. 만료/무효 시 401
- 완료 기준: 유효 토큰 통과 / 무효 토큰 401 반환
- 진행: [x]

### Phase 4 — rateLimit.ts 미들웨어
- 파일: `src/middleware/rateLimit.ts`
- 왜: 무차별 시도 방어
- 어떻게: express-rate-limit (분당 10회)
- 완료 기준: 11번째 요청 429 반환
- 진행: [x]

### Phase 5 — auth.ts login 엔드포인트
- 파일: `src/api/auth.ts`
- 왜: 실제 로그인 처리
- 어떻게: email로 user 조회 → bcrypt 비교 → JWT 발급 + refresh token (httpOnly cookie)
- 완료 기준: 정상 로그인 200 + JSON { token } / 실패 401
- 진행: [x]

### Phase 6 — app.ts 미들웨어 체인
- 파일: `src/app.ts`
- 왜: jwt + rateLimit 등록
- 어떻게: app.use("/api/auth", rateLimit, authRouter); 보호 라우트에 jwt 미들웨어
- 완료 기준: 통합 테스트 PASS
- 진행: [x]

## Test Plan

| # | 시나리오 | 분류 | 방식 | PASS 기준 |
|---|---------|------|------|----------|
| 1 | 정상 로그인 | [AUTO] | API/엔드포인트 호출 | POST /api/auth/login {email, password} → 200, body {token}, Set-Cookie: refreshToken |
| 2 | 잘못된 비밀번호 | [AUTO] | API/엔드포인트 호출 | 401, body {error: "이메일 또는 비밀번호가 올바르지 않습니다"} |
| 3 | 미등록 이메일 (enumeration 방어) | [AUTO] | API/엔드포인트 호출 | 401, body 메시지 #2와 동일 |
| 4 | 빈 입력 / 형식 오류 | [AUTO] | API/엔드포인트 호출 | 400, validation 에러 |
| 5 | JWT 검증 — 유효 토큰 | [AUTO] | API/엔드포인트 호출 | GET /api/protected with Authorization → 200 |
| 6 | JWT 검증 — 만료 / 무효 | [AUTO] | API/엔드포인트 호출 | 401 |
| 7 | Rate limit (11회 연속) | [AUTO] | 시나리오 스크립트 실행 | 11번째 요청 429, 헤더 X-RateLimit-Remaining: 0 |
| 8 | Refresh token | [AUTO] | API/엔드포인트 호출 | GET /api/auth/refresh with cookie → 200, 새 token 발급 |

## Result

### 진행
- Phase 1: password.ts 작성, 단위 테스트 PASS (3 케이스).
- Phase 2: users.ts findByEmail 추가, prisma 통합 확인.
- Phase 3: jwt.ts 미들웨어 작성, 단위 테스트 PASS (4 케이스).
- Phase 4: rateLimit.ts express-rate-limit 통합, 11회 시나리오 확인.
- Phase 5: auth.ts /login 엔드포인트 완성, 정상/실패 케이스 동작.
- Phase 6: app.ts 미들웨어 체인 등록, 통합 테스트 PASS.

### 테스트 (격리 세션 결과)
- **PASS**.
- 1~8 시나리오 모두 기대대로.
- 검증 명령 모두 PASS.
- 근거:
  - `npm test src/api/auth.test.ts` → 14/14 PASS
  - 수동 시나리오 1~8 모두 기대 응답 코드/메시지 확인
  - rate limit 11번째 429 확인 (헤더 X-RateLimit-Remaining: 0)
```

---

### 예시 3: bug/small (특정 버그 픽스)

```markdown
# TASK-013 — 모바일 사파리에서 폼 제출 시 페이지 새로고침 발생

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| 2026-05-08 | 001_mvp | bug | small | tested |

## Requirements
사용자 보고:
- 모바일 Safari에서 검색 폼 제출 시 페이지가 새로고침됨. 다른 브라우저는 정상.

재현 환경:
- iOS 17.4 Safari
- src/components/SearchForm.tsx

기대 동작:
- 폼 제출 시 SPA navigation, 페이지 새로고침 X.

## Scope
수정:
- `src/components/SearchForm.tsx` — onSubmit 핸들러
- `src/components/SearchForm.test.tsx` — 회귀 테스트 추가

인접 (간접 영향): 없음.

## Dev Plan

### Phase 1 — preventDefault 호출 누락 픽스
- 파일: `src/components/SearchForm.tsx`
- 왜: 모바일 Safari는 form submit 기본 동작이 페이지 새로고침. 다른 브라우저(Chrome 등)는 React가 일부 케이스 자동 차단하지만 Safari는 아님
- 어떻게: onSubmit handler 첫 줄에 e.preventDefault() 추가
- 완료 기준: iOS Safari에서 폼 제출 시 새로고침 X (수동 확인)
- 진행: [x]

### Phase 2 — 회귀 테스트 추가
- 파일: `src/components/SearchForm.test.tsx`
- 왜: 같은 버그 재발 방지
- 어떻게: fireEvent.submit + expect(preventDefault) 호출 확인
- 완료 기준: 단위 테스트 PASS
- 진행: [x]

## Test Plan

| # | 시나리오 | 분류 | 방식 | PASS 기준 |
|---|---------|------|------|----------|
| 1 | iOS Safari 검색어 입력 후 검색 버튼 클릭 | [USER] | 수동 검수 | 페이지 URL의 search query만 갱신, 새로고침 X (네트워크 탭 document 요청 X) |
| 2 | 데스크톱 Chrome 동일 동작 (회귀) | [USER] | 수동 검수 | 회귀 X (기존 정상 동작 유지) |
| 3 | onSubmit handler preventDefault 회귀 테스트 | [AUTO] | 입출력 비교 | fireEvent.submit + expect(preventDefault) 호출 확인 |

## Result

### 진행
- Phase 1: SearchForm.tsx onSubmit 첫 줄 e.preventDefault() 추가. 1줄 변경.
- Phase 2: SearchForm.test.tsx에 회귀 테스트 1 케이스 추가.

### 테스트 (격리 세션 결과)
- **PASS**.
- iOS 17.4 Safari 수동 확인 — 폼 제출 시 새로고침 X.
- Chrome 수동 확인 — 회귀 없음.
- 단위 테스트 PASS.
- 검증 명령 모두 PASS.
- 근거:
  - 네트워크 탭 캡처 (document 요청 X)
  - SearchForm.test.tsx 신규 케이스 1/1 PASS
```

---

## 6. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 초안 — 5컬럼 헤더 / 7상태 / 6섹션 / 4단 layer 가이드 / 완성 예시 3개 |
| 2026-05-08 | §1.5 추가 — task 파일/폴더/부속 자료 위치 단일 진실 소스. spec-diffs/screenshots는 vX.X 공통 통일. closed-immutable hook 보호 범위는 task.md 본 파일만 (스킬 본문 간 위치 모순 통일) |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 이전 버전 비교 단락 정리 |
| 2026-05-30 | stash FRICTION_LOG 기반 정합 — §1.5 mockup 행 추가 (vX.X 공통, 단일 진실 소스 MOCKUP_RULE) + §2.5 Test Plan 본질 재정의 (실질 동작 시나리오 + `[AUTO]` / `[USER]` 분류 강제 + 카탈로그 7방식 + UX/UI 영역 분리 매트릭스 + 시각 fix 사이클 사전 예고 + 검증 / 테스트 명령 두 섹션 참조) + §4.5 / §5 완성 예시 3개 Test Plan 형식 갱신 (분류 표 + PASS 기준 명시. 기존 번호 매김 시나리오 + 검증 명령 나열은 옛 형식). (stash FRICTION_LOG #14+19 / #25 정합) |
| 2026-06-02 | 0.1.3 F5 정합 — §2.5 가이드라인 안티패턴 3종 추가 (grep/Read-only 보조용 / 요구사항당 end-to-end 1개 이상 / 무거운 검증 회피 금지) + 요구사항 ↔ 시나리오 커버리지 점검 단계 신설 (stash FRICTION_LOG 2026-06-01 Test Plan 동어반복 + 누락 마찰 반영) |
| 2026-06-27 | PLAYBOOK §13 정합 — plan = 기능 그룹. 헤더 *플랜* 컬럼 = `NNN_slug` 폴더명(예: 001_mvp). §1.5 경로 `tasks/<NNN_slug>/`, *`<NNN_slug>` 공통*으로 통일. spec-diff 정의 = *변경된 제품 문서(루트) 추적*(per-task 기록, 정식 변경 이력은 git 단일 진실) |
