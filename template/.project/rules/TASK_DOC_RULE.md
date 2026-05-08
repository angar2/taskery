# TASK_DOC_RULE

> taskery 태스크 문서(`task.md` 또는 `NNN_kebab-slug.md`) 작성 규칙.
> **이 양식 그대로 채워. 섹션 추가/삭제 금지. 변형은 hook으로 차단되지 않으나 메인이 일관성 위해 강제 준수.**

---

## 1. 양식 Spec

### 1.1 헤더 표 — 5컬럼

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| 2026-05-08 | v1.0 | feature | medium | developing |

- **생성일**: ISO 형식 (YYYY-MM-DD)
- **플랜**: 어느 plan 버전 하위인지 (예: v1.0, v2.0, alpha) — `tasks/<vX.X>/` 디렉토리 명과 일치
- **유형**: `feature` / `bug` / `improvement` / `refactor` / `docs` / `chore` (git 브랜치 타입과 직결)
- **규모**:
  - `micro` — 구현 파트 1개 (단일 함수/설정 수정)
  - `small` — 구현 파트 2-3개 (단순 기능)
  - `medium` — 구현 파트 4-7개 (일반 기능 또는 새 모듈)
  - `large` — 구현 파트 8개 이상 (또는 분리 검토 권장)
- **상태**: 7상태 머신 (1.2 참조)

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

**FAIL/UNCERTAIN 분기**:
- `/task-test` PASS → `tested` 갱신 → `/task-close` 진행
- `/task-test` FAIL → 메인이 격리 결과(로그/근거) 보고 → 사용자에게 *"고쳐? OK 마무리?"* 묻기 → "고쳐" 시 `developing`으로 되돌림 → `/task-dev` 재진입
- `/task-test` UNCERTAIN → 메인이 결과 보고 → 사용자 판단
- `/task-dev` 중 self-check FAIL → `developing` 그대로, 메인 자체 수정 → PASS 시 `developed` 갱신

### 1.3 섹션 구성 — 6 섹션

```markdown
# TASK-NNN — <태스크 이름>

| 생성일 | 플랜 | 유형 | 규모 | 상태 |
|--------|------|------|------|------|
| ... | ... | ... | ... | ... |

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
| 단일 파일 task | `.project/tasks/<vX.X>/<NNN>_<slug>.md` (예: `001_login-feature.md`) | `/task-init` |
| 폴더 승격 task | `.project/tasks/<vX.X>/TASK-<NNN>_<slug>/task.md` | `/task-init` (규모 large 또는 사용자 명시 또는 추가 자료 다수) |
| spec-diffs (변경된 plan 문서 추적) | `.project/tasks/<vX.X>/spec-diffs/<NNN>_<slug>_spec-diff.md` (**vX.X 공통** — 단일/폴더 모두) | `/task-plan` Step 6 (Phase 0 변경 시) |
| screenshots (UI 작업 자료) | `.project/tasks/<vX.X>/screenshots/<NNN>_*.png` (**vX.X 공통**) | `/task-test` 격리 세션 또는 메인 |
| 폴더 승격 task의 추가 자료 (서브 문서, mockup 등) | `TASK-<NNN>_<slug>/` 안 자유 | 메인 / `/task-dev` |

**원칙**:
- spec-diffs / screenshots는 *vX.X 공통* — 파일명 NNN prefix로 task 식별. 폴더 승격 task도 동일 (별도 spec-diffs/screenshots 만들지 X).
- vX.X 공통 디렉토리는 `/plan-init` Step 5가 mkdir.
- 폴더 승격은 *task의 추가 자료*용 (서브 문서, mockup, 디자인 자료 등) — *spec-diffs/screenshots 위치 X*.

**closed-immutable hook 보호 범위** — task.md 본 파일만 (단일 파일 또는 폴더 승격 task.md). spec-diffs / screenshots / 폴더 승격 추가 자료는 *역사적 자료*로 자유 수정.

---

## 2. 작성 방법 — 단계별 절차

### 2.1 헤더 작성 (`/task-init`)

1. `tasks/<vX.X>/` 디렉토리 안 가장 큰 NNN+1로 task 번호 결정 (예: 기존 002까지 있으면 003)
2. kebab-slug = 태스크 이름 한국어 → 영어 kebab-case (예: "로그인 기능 추가" → `login-feature`)
3. 파일명 = `NNN_kebab-slug.md` (예: `003_login-feature.md`). 큰 작업이면 폴더 승격 (`TASK-003_login-feature/task.md`).
4. 파일 제목 작성: `# TASK-003 — 로그인 기능 추가`
5. 헤더 표 작성 (5컬럼 모두 채움):
   - 생성일: 오늘 (YYYY-MM-DD)
   - 플랜: 현재 active plan 버전 (예: v1.0)
   - 유형: 사용자/메인 합의 (feature/bug/...)
   - 규모: 사용자/메인 합의 (micro/small/medium/large)
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

양식 강제 X — *작업에 맞게 자유롭게* 채움. 다만 가이드라인 따름:

- **자기완결적**: `/task-test` 격리 세션이 *task.md만 보고도* 수행 가능. 메인의 plan/dev 컨텍스트 없이.
- **명령/기대값 포함**: 무엇을 실행하고 무엇이 기대되는지 명확.
- **메인 가정 X**: 격리 세션이 *코드와 동작만 신뢰*. *"잘 될 거야"* 같은 가정 금지.

자유 형식 (체크리스트 / 시나리오 / 명령 나열 등):

```markdown
## Test Plan

1. `npm run dev` 실행 → 로그인 페이지(/login) 접속.
2. 빈 값 제출 → 에러 메시지 *"이메일 입력 필요"* 표시 확인.
3. 잘못된 이메일 형식 → *"올바른 이메일 형식이 아닙니다"* 확인.
4. DB에 미등록 계정 → 401 + *"계정 없음"* 확인.
5. 정상 로그인 → 홈(/)으로 리다이렉트 + 세션 쿠키 확인.

검증 명령:
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run build` PASS
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
- 헤더 5컬럼 모두 채움 — *"미정"* 같은 placeholder 금지 (의사결정 위임 X).
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
| 2026-05-08 | v1.0 | feature | small | planned |
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

1. `npm run dev` 실행 → http://localhost:3000/login 접속.
2. 빈 이메일 + 비밀번호 제출:
   - 기대: *"이메일 입력 필요"* + *"비밀번호 입력 필요"* 표시. API 호출 X.
3. 잘못된 이메일 형식 (예: "abc"):
   - 기대: *"올바른 이메일 형식 아님"* 표시. API 호출 X.
4. 짧은 비밀번호 (예: "123"):
   - 기대: *"비밀번호 8자 이상 필요"* 표시. API 호출 X.
5. 정상값 제출:
   - 기대: API 호출 → 정상 응답 시 / 리다이렉트.
6. 한국어 ↔ 영어 전환:
   - 기대: 메시지 언어 따라 변경.

검증 명령:
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm test src/utils/validation.test.ts` PASS
```

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
| 2026-05-08 | v1.0 | chore | micro | closed |

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
- `grep -n "Instalation" README.md` → 결과 0행.
- `grep -n "Installation" README.md` → 1행 이상.

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
| 2026-05-08 | v1.0 | feature | medium | tested |

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

1. `npm run dev` 실행 → API 서버 :3000.
2. 정상 로그인:
   - POST /api/auth/login { email: "test@x.com", password: "Password123!" }
   - 기대: 200, body { token: "eyJ..." }, Set-Cookie: refreshToken=...
3. 잘못된 비밀번호:
   - POST /api/auth/login { email: "test@x.com", password: "wrong" }
   - 기대: 401, body { error: "이메일 또는 비밀번호가 올바르지 않습니다" }
4. 미등록 이메일:
   - 기대: 401, **동일 메시지** (enumeration 방어)
5. 빈 입력 / 형식 오류:
   - 기대: 400, validation 에러
6. JWT 검증:
   - GET /api/protected with Authorization: Bearer <token>
   - 기대: 200 (유효 토큰) / 401 (만료, 무효)
7. Rate limit:
   - 11회 연속 요청
   - 기대: 11번째 요청 429
8. Refresh token:
   - GET /api/auth/refresh with cookie
   - 기대: 200, 새 token 발급

검증 명령:
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm test src/api/auth.test.ts` PASS

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
| 2026-05-08 | v1.0 | bug | small | tested |

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

1. `npm run dev` 실행 → iOS Safari로 http://localhost:3000/search 접속.
2. 검색어 입력 후 검색 버튼 클릭:
   - 기대: 페이지 URL의 search query만 갱신, 새로고침 X (네트워크 탭에서 document 요청 X 확인).
3. 데스크톱 Chrome 동일 동작:
   - 기대: 회귀 X (기존 정상 동작 유지).
4. 단위 테스트:
   - `npm test src/components/SearchForm.test.tsx` PASS.

검증 명령:
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run build` PASS

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
