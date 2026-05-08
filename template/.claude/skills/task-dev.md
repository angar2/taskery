---
description: task 구현 — Dev Plan Phase 순서대로 코드 작성 + self-check 게이트, planned → developing → developed
---

# /task-dev

## 개요

`planned` 상태 task의 Dev Plan을 Phase 순서대로 구현. 각 Phase 완료 시 체크박스 갱신 + Result 섹션에 진행 기록. 모든 Phase 완료 + self-check (린트/타입/빌드/단위테스트) PASS 시 status를 `developed`로 박음.

self-check 명령은 프로젝트 루트 `CLAUDE.md`의 *검증 명령* 섹션 참조 — 단일 진실 소스.

## 호출 시점

- `/task-plan` 끝나고 기획 합의된 직후.
- 도중 끊겼던 task 이어서 구현 (status=`developing`).
- `/task-test` FAIL 후 사용자 *"고쳐"* 응답 → status가 `developing`으로 되돌아온 경우 재진입.

## 입력 처리

인자 = (선택) `TASK-NNN` 또는 자동 선택.

분기:
- **인자 명시**: 해당 task 파일 진행.
- **인자 없음**: 활성 plan 버전의 *상태=planned 또는 developing인 가장 최근 task* 자동 선택 + confirm.

## 단계

### Step 1 — task 파일 + 검증 명령 확인

1. `.project/AGENT-GUIDE.md` Read → 활성 plan 버전 확인.
2. task 파일 Read:
   - 인자 있음 → 해당 파일.
   - 인자 없음 → `ls .project/tasks/<vX.X>/` 결과 중 status=`planned` 또는 `developing`인 가장 최근 파일. 발견 시 *"TASK-<NNN> 진행할까요?"* confirm. 없으면 *"진행할 task 없음. `/task-plan` 먼저 호출."* + 종료.
3. 상태 검증:
   - `planned` → 신규 진행 (Step 2 status 전환).
   - `developing` → 이어가기 (Step 2 skip — 이미 developing).
   - 그 외 → 종료 + 안내.
4. 프로젝트 루트 `CLAUDE.md` Read → *검증 명령* 섹션의 린트/타입체크/빌드/테스트 명령 추출. 이 명령들이 self-check 게이트의 단일 진실 소스.

### Step 2 — status 전환 (planned → developing)

진입 시 `planned`인 경우만 헤더 status를 `developing`으로 Edit.

### Step 3 — Phase 순서대로 구현

1. Dev Plan의 Phase 1부터 순서대로 진행. 순서 건너뛰기 X.
2. 각 Phase:
   - **파일 / 왜 / 어떻게 / 완료 기준** 정독.
   - 코드 작성 (Edit / Write).
   - 주요 로직 체크포인트마다 *로그 심기* (예: `console.log` / `print` / `logger.info`) — 디버깅 + `/task-test` 격리 세션이 흐름 추적 가능하게.
   - 완료 기준 충족 확인. 미충족이면 같은 Phase 내 추가 작업.
   - Phase의 `진행: [ ]` → `진행: [x]` Edit.
3. 계획 외 변경 필요 시 사용자에게 먼저 확인 — *"이 Phase에서 X도 같이 손대야 하는데 OK?"*. 합의 없이 스코프 확장 X.

### Step 4 — Phase 0 처리 (있을 시)

Dev Plan에 Phase 0(plan 문서 변경)이 있으면:
1. `.project/plans/<vX.X>/<문서>.md` Edit.
2. `.project/tasks/<vX.X>/spec-diffs/<NNN>_<slug>_spec-diff.md` 이미 `/task-plan`에서 만들어졌으면 그대로. 없으면 작성 (TASK_DOC_RULE §spec-diff 형식 참조).
3. Phase 0 `진행: [x]` Edit.

### Step 5 — flows/ 업데이트 (해당 시)

도메인/비즈니스 흐름이 변경된 경우:
1. `.project/flows/<module>.md` 확인.
2. 없으면 신규 Write (모듈 단위 흐름 문서). 있으면 해당 항목 Edit.
3. 변경 없는 단순 버그 수정 / 스타일 / 설정 변경 → flows/ 업데이트 X.

| 상황 | flows/ 업데이트 |
|------|-------------|
| 신규 기능 추가 | 필요 |
| 기존 기능 로직 변경 (함수명/플로우 변경) | 필요 |
| 단순 버그 수정 (로직 변경 없음) | 불필요 |
| 스타일/포맷/설정 변경 | 불필요 |

### Step 6 — self-check 게이트

Step 1에서 추출한 검증 명령을 *전부* 실행. 모두 PASS여야 `developed`로 전이 가능.

| 명령 | PASS 기준 |
|------|---------|
| 린트 (예: `npm run lint`) | exit 0 + 에러 0 |
| 타입체크 (예: `npm run typecheck`) | exit 0 |
| 빌드 (예: `npm run build`) | exit 0 |
| 단위 테스트 (예: `npm test <범위>`) | 모든 케이스 PASS |

**FAIL 시**:
1. 메인이 자체 수정 시도 — 에러 메시지 분석 + 코드 수정 + 재실행.
2. 같은 종류 fail이 3회 반복되면 사용자에게 보고 + 판단 요청 (*"이 에러가 풀리지 않아. 추가 정보 필요"*).
3. 수정 + 재PASS 시까지 status `developing` 유지. PASS 못 받으면 `developed` 전환 X.

### Step 7 — Result 섹션 진행 기록

`## Result` 섹션의 *진행* 부분 Edit (테스트 결과는 `/task-test`에서 채움):

```markdown
## Result

### 진행
- Phase 1: <구현 요약 — 변경 파일 / 핵심 로직>
- Phase 2: <...>
- Phase N: <...>

### 테스트 (격리 세션 결과)
(`/task-test`에서 채움)
```

- 각 Phase 한두 줄로 무엇을 어떻게 했는지 요약.
- 변경 파일 목록 명시 (예: `src/auth/login.ts` 신규, `src/api/auth.test.ts` 12 케이스 추가).

### Step 8 — status 전환 + 결과 보고

1. 헤더 status → `developed` Edit.
2. 결과 보고:

```
✅ TASK-<NNN> 구현 완료
- Phase: <N>개 모두 [x]
- 변경 파일: <목록>
- self-check: lint/typecheck/build/test 모두 PASS
- 상태: developing → developed
- 다음: /task-test TASK-<NNN> 으로 격리 세션 검증
```

## 도구 가이드

- **Read**: task 파일 / `CLAUDE.md` 검증 명령 / 관련 코드 정독
- **Edit / Write**: 코드 작성 + Phase 체크박스 갱신 + Result 섹션 갱신 + status 전환
- **Bash**: 검증 명령 실행 (린트/타입/빌드/단위테스트). **git 명령 절대 X — `/task-close`만 git 담당**
- **Grep / Glob**: 추가 코드 탐색 (Phase 진행 중 인접 영향 발견 시)

## 주의사항

- **git 명령 절대 X** — 본 슬래시는 코드만. `git commit` / `git push` / `git branch` 등 모두 `/task-close`에서. self-check fail 후 *재실행*도 git 무관.
- **Phase 순서 건너뛰기 X** — Phase 1 끝나기 전 Phase 2 진행 X. 의존 관계 깨짐 + 디버깅 어려워짐.
- **계획 외 스코프 확장 X** — Dev Plan에 없는 파일 건드리기 전 사용자 confirm. *"이 부분 같이 손대야 할 것 같은데 OK?"* 합의 후 진행.
- **self-check FAIL 시 `developed` 전환 X** — 무리하게 상태 박지 X. 메인 자체 수정 시도 → 안 되면 사용자에게 보고. *"잘 될 거야"* 가정 금지.
- **로그 심기 잊지 X** — Dev Plan 작성 시 `[로그]` 항목 박혔으면 *반드시* 실제 로그 코드 삽입. 격리 세션 / 운영 디버깅 모두 의존.
- **Result 섹션 진행만** — 테스트 결과는 `/task-test`가 박음. 메인이 *"잘 됐을 거야"* 가정 박지 X.
- **flows/ 업데이트 누락 X** — 신규 기능 / 로직 변경이면 `.project/flows/<module>.md` 갱신. 미갱신 시 다음 task가 옛 정보 보고 헤맴.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| `planned` | `developed` |
| `developing` (이어가기) | `developed` |

self-check FAIL → `developing` 그대로 유지 (수정 + 재PASS 시까지).

## 5사이클 참조

`archive/agents/developer.md` *Mode 1 / Mode 2 절차* 참조:
- Phase 순서 진행 + 체크박스 갱신
- `[로그]` 항목 강제 (Step 3)
- 경로 prefix 해석 (Step 5 flows/)
- 계획 외 변경 사용자 확인

`archive/agents/develop-reviewer.md` *hard-fail 조건* 참조 — v0.2는 self-check 게이트로 흡수:
- 완료 조건 미체크 (Phase `진행: [ ]` 잔존) → `developed` 전환 차단
- Bash 에러 (검증 명령 fail) → `developed` 전환 차단
- 보안 취약점 — 메인 자체 검토 (1차 자기검토. 진짜 데이터 모이면 PLAYBOOK §7 자동 PR 리뷰 부활)

v0.2 변경점:
- developer + develop-reviewer 분리 폐기 (1 슬래시 흡수)
- self-check 게이트 추가 (린트/타입/빌드/테스트 PASS 필수) — 5사이클은 reviewer 별도 검증
- developing → developed 단일 전이 (revision/approved 단계 폐기)
- flows/ 업데이트 본 슬래시에 흡수 (5사이클 Mode 3 별도 호출)
- plan/roadmap Mode 4 폐기 (`/project-init` / `/plan-init`이 흡수)
