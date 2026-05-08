---
description: task 기획 채우기 — Requirements / Scope / Dev Plan / Test Plan 4 섹션 작성, draft → planned
---

# /task-plan

## 개요

`draft` 상태 task의 본문 4 섹션(Requirements / Scope / Dev Plan / Test Plan)을 채우고 status를 `planned`로 갱신. 사용자와 대화로 진행 — 인터뷰 + 증폭 + 코드 서치 + Phase 분할.

리뷰는 *대화로 OK* 자동 전이로 단순화 — 별도 리뷰 단계 없음.

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

### Step 5 — Test Plan (자유 형식 + 가이드라인)

양식 강제 X. *작업에 맞게 자유롭게* 작성. 단 가이드라인 준수 (TASK_DOC_RULE §2.5):

- **자기완결적**: `/task-test` 격리 세션이 *task.md만 보고* 수행 가능. 메인의 plan/dev 컨텍스트 없이.
- **명령/기대값 포함**: 무엇을 실행하고 무엇이 기대되는지 명확.
- **메인 가정 X**: *"잘 될 거야"* / *"문제 없을 듯"* 같은 가정 금지.

자유 형식 예 (체크리스트 / 시나리오 / 명령 나열):

```markdown
## Test Plan

1. `npm run dev` → http://localhost:3000/<경로> 접속.
2. <시나리오 1>:
   - 기대: <응답/표시>
3. <시나리오 2>:
   - 기대: ...

검증 명령:
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm test <관련 파일>` PASS
```

검증 명령은 프로젝트 루트 `CLAUDE.md`의 *검증 명령* 섹션을 참조해 그대로 인용.

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
- **Test Plan 자기완결적** — 격리 세션이 *task.md만 보고* 수행 가능해야. 메인의 plan/dev 컨텍스트 *"위 Phase에서 만든 X"* 같은 표현 금지. 코드/동작/명령만 명시.
- ***"잘 될 거야"* 가정 금지** — Test Plan에 메인 가정 작성 금지. 코드와 동작만 신뢰.
- **합의 없이 status 전환 X** — 사용자 OK 받기 전 `planned` 작성 금지. 합의가 *대화로 OK = 자동 전이* 룰의 핵심.
- **과규모(large) 시 분리 제안** — Phase 8개 초과 또는 성격 다른 기능 혼재 시 task 분리 권장. 사용자에게 *"A/B로 쪼갤까요?"* 제안.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| `draft` | `planned` |

(예외 — 합의 못 함: status 그대로 `draft` 유지. 다음 호출 시 다시 시도.)
