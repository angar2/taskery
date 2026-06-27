---
name: task-dev
description: task 구현 — Dev Plan Phase 순서대로 코드 작성 + self-check 게이트, planned → developing → developed
---

# /task-dev

## 개요

`planned` 상태 task의 Dev Plan을 Phase 순서대로 구현. 각 Phase 완료 시 체크박스 갱신 + Result 섹션에 진행 기록. 모든 Phase 완료 + self-check (린트/타입/빌드/단위테스트) PASS 시 status를 `developed`로 갱신.

self-check 명령은 프로젝트 루트 `CLAUDE.md`의 *검증 명령* 섹션 참조 — 단일 진실 소스.

## 멀티세션 메타 위치 (0.1.2+)

본 스킬은 워크트리에서 호출되는 게 default (멀티세션 — 각 워크트리 = 독립 세션). 다만 호출 위치 자유 — 메인 cwd / 서브 세션 호출 등 다른 운영 모델에서도 cwd 무관 동작. 메타(`.project/`, `CLAUDE.md`) 접근 시 **메인 워크트리 절대 경로** 우선.

```sh
MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
```

`.gitignore` 케이스 분기:

| 케이스 | task 문서 / Result 갱신 위치 | CLAUDE.md (검증 명령) |
|--------|---------------------------|----------------------|
| 등록 (퍼블릭 리포 default) | `$MAIN_WT/.project/tasks/<NNN_slug>/...` (`bin/lib.js` `withMetaLock`) | `$MAIN_WT/CLAUDE.md` |
| 미등록 | `$WT_PATH/.project/tasks/<NNN_slug>/...` (워크트리 안, 머지 시 dev 반영) | `$MAIN_WT/CLAUDE.md` (CLAUDE.md는 단일 소스) |

self-check 명령은 워크트리(`$WT_PATH`)에서 실행 — 코드 변경이 워크트리 안에 있으므로 검증 대상도 거기.

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
   - 인자 없음 → `ls .project/tasks/<NNN_slug>/` 결과 중 status=`planned` 또는 `developing`인 가장 최근 파일. 발견 시 *"TASK-<NNN> 진행할까요?"* confirm. 없으면 *"진행할 task 없음. `/task-plan` 먼저 호출."* + 종료.
3. 상태 검증:
   - `planned` → 신규 진행 (Step 2 status 전환).
   - `developing` → 이어가기 (Step 2 skip — 이미 developing).
   - 그 외 → 종료 + 안내.
4. 프로젝트 루트 `CLAUDE.md` Read → 두 섹션 명령 추출:
   - **`## 검증 명령`** (코드 상태 — 빌드/린트/타입체크): self-check 게이트의 단일 진실 소스 (Step 6).
   - **`## 테스트 명령`** (테스트 실행 — 단위/통합/E2E): 구현 후 테스트 실행의 단일 진실 소스 (Step 6.5).
   - stash FRICTION_LOG #25 반영 — 두 섹션 분리. self-check 게이트는 *코드 상태*만, 테스트는 *별도 단계*.

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

Dev Plan에 Phase 0(제품 관통 문서 변경)이 있으면:
1. `.project/<문서>.md` (루트 제품 관통 문서) Edit. **DATA-MODEL/API-SPEC 상세는 구현 동반으로 여기서 확정** — plan-init이 미룬 스키마·엔드포인트 본문을 실제 구현 기준으로 채운다.
2. `.project/tasks/<NNN_slug>/spec-diffs/<NNN>_<slug>_spec-diff.md` 이미 `/task-plan`에서 만들어졌으면 그대로. 없으면 작성 (TASK_DOC_RULE §spec-diff 형식 참조).
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

### Step 6 — self-check 게이트 (`## 검증 명령` — 코드 상태)

`CLAUDE.md` `## 검증 명령` 섹션의 명령을 *전부* 실행. 모두 PASS여야 다음 단계 (Step 6.5 테스트 실행) 진입 가능. 테스트 명령은 본 게이트에서 실행 X.

| 명령 | PASS 기준 |
|------|---------|
| 린트 (예: `npm run lint`) | exit 0 + 에러 0 |
| 타입체크 (예: `npm run typecheck`) | exit 0 |
| 빌드 (예: `npm run build`) | exit 0 |

**FAIL 시 — 추측 fix 반복 방지 룰 (stash FRICTION_LOG #15+16+18 반영)**:

1. **1회 실패 시 자체 수정 시도** — 에러 메시지 + 스택 트레이스 *전체 정독*. 추측 X. 실제 로그 데이터 기반 fix.
2. **2회 이상 실패 시 진단 로그 추가** — `console.log` / `print` / `logger.debug` 등 디버그 로그 추가 후 *실제 동작 데이터* 확보 후 root cause 확정. 추측 fix 반복 영구 금지.
3. **동일 신고 재발 시 즉시 root cause 분석 모드** — 사용자 또는 자동화에서 *동일 에러 / 동일 신고* 재발 시 추측 fix 중단. `grep -rn <symbol>` 으로 *모든 사용처* 확인 + `git blame` 으로 *언제 추가된 줄* 확인 + 진단 로그 추가해 *실제 데이터* 추적. 동명 property / 함수 가능성 *항상 의심* (한 위치 fix 후 재발 시 다른 위치 우선 의심).
4. 같은 종류 fail이 3회 반복되면 사용자에게 보고 + 판단 요청 (*"이 에러가 풀리지 않아. 진단 로그 결과: ... 추가 정보 필요"*).
5. 수정 + 재PASS 시까지 status `developing` 유지. PASS 못 받으면 `developed` 전환 X.

### Step 6.5 — 테스트 실행 (`## 테스트 명령` — 코드 정상성)

stash FRICTION_LOG #14+19 / #25 반영 — 유닛 테스트는 본 단계에서 단일 시점 실행 (task-close / hook 영역 중복 제거).

`CLAUDE.md` `## 테스트 명령` 섹션의 명령을 *전부* 실행. 모두 PASS여야 `developed`로 전이 가능.

| 명령 | PASS 기준 |
|------|---------|
| 단위 테스트 (예: `npm test`) | 모든 케이스 PASS |
| 통합 테스트 (있을 시) | 모든 케이스 PASS |
| E2E 테스트 (있을 시) | 모든 시나리오 PASS |

**신규 테스트 식별자 등장 확인 (stash FRICTION_LOG #19 반영)**:

- 본 task에서 신규 테스트 추가되었으면 *단순 카운트 +N / 모든 PASS* 자체로 PASS 단정 X.
- 신규 *테스트 식별자* (suite / class / function / describe 등) 가 테스트 runner 결과 로그에 *실제 등장*했는지 grep 직접 확인 (1 hit 이상).
- 예: `grep -E "Suite \"<NewSuite>\"" test-output.log` → hit 1 이상.
- 등장 안 하면 *Suite 미실행* (빌드 시스템 등록 누락 등) → FAIL 처리.

**FAIL 시**: Step 6의 FAIL 룰 동일 적용 (추측 fix 반복 방지 / 진단 로그 / 동일 신고 재발 시 root cause).

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

### Step 9 — 검수 서버 기동 (중단점·해당 시)

**조건**: ① 이번 세션이 여기서 멈추고 사용자에게 제어를 넘김(= `/task-test`로 계속 진행하지 않음) + ② `CLAUDE.md`(코덱스 `AGENTS.md`)에 `## 검수 실행 명령`이 선언됨.

- 두 조건 충족 시 — 그 명령으로 서버를 *백그라운드* 기동(포트 = 기준 포트 + TASK번호) + 접속 URL 보고. 모바일 검수가 필요하다고 판단되면 터널도 기동.
- `/task-test`로 계속 진행하면 본 단계 생략 (마지막 단계에서만 기동 — 상세: GIT_RULE "멀티세션 검수 환경").
- `## 검수 실행 명령` 미선언(CLI/라이브러리 등) 또는 사용자 *"안 띄워도 돼"* 발화 시 생략.

## 도구 가이드

- **Read**: task 파일 / `CLAUDE.md` 검증 명령 / 관련 코드 정독
- **Edit / Write**: 코드 작성 + Phase 체크박스 갱신 + Result 섹션 갱신 + status 전환
- **Bash**: 검증 명령 실행 (린트/타입/빌드/단위테스트). **git 명령 절대 X — `/task-close`만 git 담당**
- **Grep / Glob**: 추가 코드 탐색 (Phase 진행 중 인접 영향 발견 시)

## 주의사항

- **git 명령 절대 X** — 본 스킬은 코드만. `git commit` / `git push` / `git branch` 등 모두 `/task-close`에서. self-check fail 후 *재실행*도 git 무관.
- **Phase 순서 건너뛰기 X** — Phase 1 끝나기 전 Phase 2 진행 X. 의존 관계 깨짐 + 디버깅 어려워짐.
- **계획 외 스코프 확장 X** — Dev Plan에 없는 파일 다루기 전 사용자 confirm. *"이 부분 같이 작업해야 할 것 같은데 OK?"* 합의 후 진행.
- **모호 발화 confirm 룰 (stash FRICTION_LOG #21+22 반영)** — 사용자 발화가 코드/문서/기능 영역에서 *복수 매칭* 가능할 때 자율 추정 영구 금지. 메인 *자체 안 1개* + *"X 의미 맞아?"* 한 줄 confirm 후 진행. 옵션 4개 늘어놓기 금지 (메인 판단 위임 회피 패턴). 예: 사용자 *"환경설정 아이콘"* 발화 → popover 톱니 / Settings 탭바 아이콘 둘 다 가능 → 어느 영역인지 한 줄 confirm 필수.
- **디자인 산출 정독 의무 (stash FRICTION_LOG #14+19 / #12 일반화)** — task에 디자인 산출 (HTML 목업 / Figma / 디자인 파일 등) 있으면 메인이 *직접 Read* 후 구현. sub-agent 위임 금지 (요약만 받아 디자인 정합 깨짐). 구현 = 디자인 산출 기준 (역방향 X — 코드 편의로 디자인 어김 절대 X). 목업 위치 = `.project/tasks/<NNN_slug>/mockup/<task-doc-name>-mockup.html`.
- **self-check FAIL 시 `developed` 전환 X** — 무리하게 상태 갱신 금지. 메인 자체 수정 시도 → 안 되면 사용자에게 보고. *"잘 될 거야"* 가정 금지.
- **로그 심기 잊지 X** — Dev Plan 작성 시 `[로그]` 항목 명시되어 있으면 *반드시* 실제 로그 코드 삽입. 격리 세션 / 운영 디버깅 모두 의존.
- **Result 섹션 진행만** — 테스트 결과는 `/task-test`가 기록. 메인이 *"잘 됐을 거야"* 가정 작성 금지.
- **flows/ 업데이트 누락 X** — 신규 기능 / 로직 변경이면 `.project/flows/<module>.md` 갱신. 미갱신 시 다음 task가 옛 정보 보고 헤맴.
- **워크트리에서 앱 실행·검수 시 의존성 심링크 금지** — 워크트리엔 의존성·빌드 산출물이 없는데, 메인 워크트리에서 심링크로 끌어오면 개발 서버 등이 로딩 실패(빈 화면)한다. 실행·검수하는 task면 워크트리 안에 실제로 의존성을 마련한다. 상세: GIT_RULE "워크트리 실행 환경" 섹션.

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| `planned` | `developed` |
| `developing` (이어가기) | `developed` |

self-check FAIL → `developing` 그대로 유지 (수정 + 재PASS 시까지).

**self-check 게이트 hard-fail 조건**:
- 완료 조건 미체크 (Phase `진행: [ ]` 잔존) → `developed` 전환 차단
- Bash 에러 (검증 명령 fail) → `developed` 전환 차단
- 보안 취약점 — 메인 자체 검토 (1차 자기검토. 진짜 데이터 모이면 PLAYBOOK §7 자동 PR 리뷰 부활)
