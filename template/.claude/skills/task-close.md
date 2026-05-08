---
description: task git 마무리 — 검증 명령 재실행 게이트 + 커밋 순서 준수 + dev --no-ff 병합, tested → closed
---

# /task-close

## 개요

`tested` 상태 task의 git 마무리. 5사이클 gitter 흡수. 작업 브랜치(없으면 생성)에서 커밋 순서(GIT_RULE 준수) 따라 진행 + dev 병합 + status `closed`.

**최종 게이트**: 모든 검증 명령 재실행 — 린트/타입체크/빌드/단위테스트 PASS여야 진행.

## 호출 시점

- `/task-test` PASS 후 + 사용자 OK.
- `/task-test` FAIL 후 사용자 *"OK 마무리"* (알려진 결함 명시 채로).

## 입력 처리

인자 = (선택) `TASK-NNN` 또는 자동 선택.

분기:
- **인자 명시**: 해당 task 파일.
- **인자 없음**: 활성 plan 버전의 *상태=tested인 가장 최근 task* 자동 선택 + confirm.

## 단계

### Step 1 — task 파일 + GIT_RULE 확인

1. `.project/AGENT-GUIDE.md` Read → 활성 plan 버전 확인.
2. task 파일 Read:
   - 인자 있음 → 해당 파일.
   - 인자 없음 → `tested` 상태 가장 최근 task. confirm. 없으면 *"마무리할 task 없음."* + 종료.
3. 상태 = `tested` 검증. 그 외면 종료 (단 알려진 결함 *"OK 마무리"*는 status=tested로 박혀 있어야 함).
4. GIT_RULE Read 우선순위:
   - `.project/rules/GIT_RULE.md` (프로젝트별 — 우선)
   - `~/.claude/rules/GIT_RULE.md` (글로벌)
   둘 다 없으면 종료 + *"GIT_RULE 누락"* 보고.

### Step 2 — 최종 검증 명령 재실행 (게이트)

`CLAUDE.md`의 *검증 명령* 모두 재실행. **하나라도 FAIL이면 close 차단**:

| 명령 | 결과 |
|------|------|
| 린트 | exit 0 + 에러 0 |
| 타입체크 | exit 0 |
| 빌드 | exit 0 |
| 단위 테스트 | 모든 케이스 PASS |

FAIL 시:
- 사용자에게 보고 — *"검증 명령 X가 FAIL. 어떻게 할까?"*
- 분기:
  - *"고쳐"* → status를 `developing`으로 되돌림 + `/task-dev` 안내 + close 중단.
  - *"OK 마무리"* → 결함 명시한 채 진행 (Result 섹션에 *"검증 명령 X FAIL 알려진 결함 — 사유: ..."* 추가).

PASS 시 Step 3으로.

### Step 3 — 작업 브랜치 확인/생성

1. `git branch --show-current` 실행 → 현재 브랜치 확인.
2. 분기:
   - **현재 브랜치 = `{타입}/{개발자}_TASK-<NNN>_<slug>`** → 그대로 진행.
   - **현재 브랜치 = `dev`** (또는 다른 곳) → 새 작업 브랜치 생성:
     ```
     git checkout -b {타입}/{개발자}_TASK-<NNN>_<slug>
     ```
     - **타입**: feature → `feature`, bug → `bug`, improvement → `improve`, refactor → `refactor`, docs → `docs`, chore → `chore`
     - **개발자**: 메인 세션 = `claude`, 사용자 세션 = `angar2` 등 (실제 작업자)
     - **slug**: task 파일명에서 그대로
     - 예: `feature/claude_TASK-007_login-feature`
3. 작업 브랜치 진입 후 *변경분이 미리 stage* 되어 있어야 함. dev에서 작업했다면 이미 working tree에 변경분 있음 — 그대로 새 브랜치 진입 후 staging.

### Step 4 — 커밋 (GIT_RULE 순서 준수)

**필수 순서**:

1. **Phase별 기능 커밋** — Dev Plan의 각 Phase마다 1개 커밋.
   - 같은 파일이 여러 Phase에 걸쳐 변경됐으면 *단일 통합 커밋 1개*로 묶음. 커밋 메시지 본문에 Phase별 변경을 `-`로 나열, 헤더 태그/번호는 마지막 Phase 사용.
   - 메시지 형식 (GIT_RULE.md):
     ```
     {태그}: [TASK-<NNN>] Phase <N> - <작업 요약>

     - <처리 내용 1>
     - <처리 내용 2>
     - 사유: <변경 이유>
     ```
   - 태그: feature → `feat:`, bug → `fix:`, improvement → `improve:`, refactor → `refactor:`, docs/chore → `docs:`, 테스트 파일 → `test:`
2. **flows/ 모듈 커밋 (해당 시)** — `.project/flows/<module>.md` 변경분 있으면 별도 커밋:
   ```
   docs: [TASK-<NNN>] flows/<module>.md 갱신

   - <변경 요약>
   - 사유: <변경 이유>
   ```
3. **태스크 문서 커밋**:
   ```
   docs: [TASK-<NNN>] 태스크 문서 완료
   ```
   - 대상: `.project/tasks/<vX.X>/<NNN>_<slug>.md` (또는 폴더 승격 시 `task.md` + `spec-diffs/` + `screenshots/`).
4. **CHANGELOG 커밋 (해당 시)**:
   - `.project/changelog/<YYYY-MM>.md` Edit (없으면 신규 Write):
     ```markdown
     # <YYYY-MM>

     ## TASK-<NNN> — <제목>
     - <Phase 1 요약>
     - <Phase 2 요약>
     - ...
     ```
   - 커밋:
     ```
     docs: [TASK-<NNN>] CHANGELOG 업데이트
     ```
   - 본 task에서 변경분 없으면 본 단계 *완전히 스킵* (빈 commit 금지).

### Step 5 — dev 병합

1. `git checkout dev` 실행.
2. 일반 타입(feature/bug/improvement/refactor/docs/chore) → **`git merge --no-ff <작업 브랜치>` 강제** (fast-forward 절대 금지).
   - `-m` 옵션 박지 X — 머지 커밋 메시지는 git 기본값 사용.
3. plan/roadmap 임시 docs 브랜치 예외 — 단일 커밋이라 `--ff-only` 가능 (v0.2 일반 흐름에서는 거의 발생 X).
4. **작업 브랜치 자동 삭제 금지** — 사용자 명시 승인(*"브랜치 삭제해"*)이 있을 때만 `git branch -d`. 미승인 시 보존.

### Step 6 — task 파일 status 전환

헤더 status → `closed` Edit. 단 이 Edit은 closed-immutable.sh hook에 잡힐 수 있음 — task 파일 *마지막* 수정으로 박은 후 별도 커밋 불필요(이미 Step 4-3에서 커밋함).

→ Edit이 Step 4-3 커밋 *전*에 일어나야 하므로 실제 흐름은:

**실제 순서 재정리**:
1. Step 4-1: Phase 기능 커밋
2. Step 4-2: flows/ 커밋 (해당 시)
3. **task 파일 status를 `closed`로 Edit** (closed-immutable.sh hook 차단되지 X — 이 Edit은 *허용*. status가 closed가 *된 후 재수정*이 차단)
4. Step 4-3: 태스크 문서 커밋 (status=closed 박힌 채로)
5. Step 4-4: CHANGELOG 커밋
6. Step 5: dev 병합

### Step 7 — 결과 보고

```
✅ TASK-<NNN> closed
- 작업 브랜치: <브랜치명>
- 커밋: Phase <N>개 + 태스크 문서 + (CHANGELOG)
- dev 병합: --no-ff 완료
- 상태: tested → closed
- 작업 브랜치 보존 (삭제하려면 "브랜치 삭제해" 명시)
```

## 도구 가이드

- **Read**: GIT_RULE / task 파일 / CLAUDE.md 검증 명령 정독
- **Bash**: git 명령 (`branch`, `checkout`, `add`, `commit`, `merge`) + 검증 명령 재실행. **유일하게 git 사용 허가된 슬래시**
- **Edit**: task 파일 status → `closed`, CHANGELOG 갱신
- **Write**: CHANGELOG 신규 (없으면)

## 주의사항

- **검증 명령 재실행 게이트** — `/task-dev` self-check / `/task-test` 격리 세션 PASS와 *별개로* 본 단계에서 한 번 더 실행. 환경 변화 / 부분 작업 / 메인 가정 등 잡는 안전망. 무리하게 게이트 우회 X.
- **dev 직접 커밋 절대 X** — 작업 브랜치에서만. dev 브랜치에서 `git commit` 시도하면 git-guard.sh hook이 차단. hook이 0회 작동하도록 정상 흐름 준수.
- **`--no-ff` 강제** — 머지 커밋 없으면 작업 브랜치 분기 정보 영구 손실. fast-forward 시도 절대 X.
- **destructive 명령 사용자 승인 필수** — `git reset --hard` / `git push --force` / `git branch -D` / `git clean -fd` 사용자 명시 승인 없이 절대 실행 X. 충돌/오류 시 사용자에게 보고 + 승인 요청 의무.
- **민감 정보 staging X** — `.env` / `credentials.json` / API key 등 staging 절대 X. `.gitignore` 박혀 있어도 한 번 더 점검.
- **빈 commit 금지** — CHANGELOG 변경 없으면 4-4 단계 스킵. `--allow-empty` 박지 X.
- **작업 브랜치 자동 삭제 X** — 사용자 명시 승인 있을 때만. 머지 후 자동 삭제 룰 X (분기 정보 보존).
- **branch -D 사용자 승인 필수** — `-d` (안전 삭제)는 머지 확인된 브랜치만 가능. `-D` (강제 삭제)는 사용자 명시 승인 필수.
- **`-m` 옵션 머지 커밋에 박지 X** — git 기본 메시지 사용 (GIT_RULE §병합 커밋).

## 상태 전이

| 진입 시 | 종료 시 |
|--------|--------|
| `tested` | `closed` |

(검증 명령 FAIL + 사용자 *"고쳐"* → `developing`으로 되돌림. 본 슬래시 자체는 거기서 중단.)

## 5사이클 참조

`archive/agents/gitter.md` *Mode 1 / Mode 2 절차* 참조:
- 브랜치 생성 (Mode 1) — v0.2는 Step 3에서 흡수
- 커밋 순서 (Mode 2) — v0.2 Step 4 그대로
- 일반 타입 vs plan/roadmap 분기 — v0.2는 일반 타입만 (plan/roadmap은 `/project-init` / `/plan-init` 흐름)
- destructive 명령 사용자 승인 (절대 규칙 #9)

`archive/agents/develop-reviewer.md` *hard-fail 조건* 참조 — Step 2 최종 게이트로 흡수.

v0.2 변경점:
- gitter 분리 폐기 (`/task-close`로 흡수)
- task file ## 작업 메모 / ## 에이전트 실행 로그 / ## 문서 수정 이력 표 폐기 (5사이클 hook 강제용 메타)
- Phase별 커밋 + flows/ 분리 + 태스크 문서 커밋 + CHANGELOG 순서는 그대로
- `--no-ff` + 작업 브랜치 보존 + destructive 사용자 승인은 GIT_RULE.md 단일 진실 소스
