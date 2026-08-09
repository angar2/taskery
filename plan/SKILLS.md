# SKILLS — taskery 스킬 9종 (+ Claude 전용 run-team)

> 본 리포 *작업 흐름의 단일 진실 소스*. 9 스킬 명세 + 흐름 + 컨텍스트 관리 전략. (+ Claude 전용 오케스트레이션 `/run-team` — §3.7)
> 스킬 본문 step별 디테일은 `template/.claude/skills/<skill>/SKILL.md`에 위치 — 본 문서는 *흐름과 정신* 중심.

---

## 1. 스킬 9종 표 — project > plan > task 위계 + 회고

| 스킬 | 레벨 | 역할 | 상태 전이 | 호출 빈도 |
|------|------|------|---------|----------|
| `/project-init` | **project** | 진입 문서(PROJECT/LINKED-REPOS/GLOSSARY/.env) + 리포 로컬 룰 초안(TEST_RULE/DEV_RULE.local.md) + 제품 관통 문서(그룹 A 작성 / 그룹 B 골격, `.project/` 루트) 생성 | — | **1회성** (프로젝트 첫 셋업) |
| `/plan-init` | **plan** | `.project/plans/<NNN_slug>/` PLAN.md / ROADMAP.md + 제품 관통 문서 FEATURES/UX-UI 의도 delta | — | 기능 그룹마다 |
| `/task-init` | **task** | **워크트리 분기** + task.md 6 섹션 placeholder + 헤더 status=draft. BL 출처 진행 시 `tasks/<NNN_slug>/BACKLOG.md` 항목 확인 마킹 (`[ ]` → `[x]` + TASK 마크) | — → `draft` | task마다 |
| `/task-plan` | task | Requirements / Scope / Dev Plan / Test Plan 채우기 (워크트리 호출 default — 멀티세션. 호출 위치 자유, cwd 무관). 해석 여지 태스크는 **출제 분리** — Test Plan을 격리 서브에이전트 B가 출제(입력 = Requirements 합의문·승인 목업·TEST_RULE.local.md만, origin 원문 보존, A 수정권 = 방식 칸+플래그) | `draft` → `planned` | task마다 |
| `/task-dev` | task | Phase 순서 구현 + self-check 게이트 (워크트리 호출 default. cwd 무관) | `planned`/`developing` → `developed` | task마다 |
| `/task-test` | task | Task tool 격리 검증 (confirmation bias 회피. 워크트리 호출 default. cwd 무관). 출제 분리 태스크는 origin 대조 **시험지 오염 검사**(무플래그 차이 즉시 반려) + 핵심 시나리오 **음성 대조**(일시 되돌림 FAIL 확인 후 원복) | `developed` → `tested` (또는 `developing`/`tested`+결함 명시) | task마다 |
| `/task-close` | task | git 마무리 + 검증 명령 재실행 게이트 + **문서 게이트**(PLAN 체크·수정이력 grep — 누락 시 `blocked:'docs'`) + **CHANGELOG 자동 append** + **머지 락 직렬화** + 부모 브랜치 `--no-ff` 병합 + **워크트리/브랜치 자동 정리**. BACKLOG.md 무관 (task-init이 처리) | `tested` → `closed` | task마다 |
| `/add-backlog` | **meta** | 사용자 발화로 *plan(기능 그룹)별* `tasks/<NNN_slug>/BACKLOG.md`에 항목 1건 추가 — 얕은 분석(개요 / 대상 영역) + BL-NNN 채번 + `withMetaLock` 직렬화 (0.1.2+) | — | 사용자 호출 / 백로그 발화 캐치 |
| `/log-friction` | **meta** | FRICTION_LOG.md에 사용자 불편 한 행 기록 | — | 사용자 호출 / 불만 발화 캐치 / task-close 자체 감지 |
| `/run-team` | **meta · Claude 전용** | agent teams로 다건 태스크를 팀원(독립 세션)에 분배해 자동 병렬 처리. 워크트리·머지는 기존 task 스킬이 담당 | — (오케스트레이터) | 트리거 발화 시에만 (실험 기능 전제) |

> `/run-team`은 **Claude 전용** — agent teams가 Codex에 없어 Codex 설치 미포함. 상세 §3.7.

**위계 정신**:
- `project` → 1회성 (프로젝트 셋업)
- `plan` → 기능 그룹마다 (작업 묶음 단위)
- `task` → task마다 (5 스킬 흐름)
- `meta` → 백로그 누적 (`/add-backlog`) + 사용자 불편 등록 (`/log-friction`) + 자동 병렬 오케스트레이션 (`/run-team`, Claude 전용)

---

## 2. 입력 처리 패턴

| 스킬 | 입력 | 처리 |
|------|------|------|
| `/project-init` | (자동 분석 또는 질문) | 빈 프로젝트 → 질문 라운드 / 기존 코드 → 소스 분석 + 제안 + confirm. **1회성** — `.project/PROJECT.md` 있으면 경고 |
| `/plan-init` | 기능 그룹 slug (예: mvp, compare-products) | 인자 없으면 사용자에게 질문. 단일 흐름: `computeNextPlanNumber`로 NNN 채번 → `plans/NNN_slug/` 생성 + PLAN.md/ROADMAP.md + 제품 관통 문서 FEATURES/UX-UI 의도 delta + manifest.activePlan 갱신. legacy(NNN 아닌) 폴더 감지 시 게이트 |
| `/task-init` | 주제/유형/규모/플랜 | 직전 맥락 명확하면 메인 제안 + confirm. 맥락 부족 시 인터뷰. **자동 추정 진행 X** |
| `/task-plan` ~ `/task-close` | TASK-NNN 인자 또는 자동 | 인자 없으면 *상태에 맞는 가장 최근 task* 자동 선택 + confirm |
| `/add-backlog` | `<주제>` (예: "로그인 빈 화면 백로그에") 또는 백로그 발화 캐치 | 메인 워크트리/부모 브랜치 검증 + 활성 plan(manifest.activePlan) 검출 + 얕은 분석(코드 탐색 X) + BL-NNN 채번 + append. 유형 모호 시 confirm |
| `/log-friction` | `<불편 내용>` 또는 무인자 호출 | 사용자 합의 → FRICTION_LOG.md 한 행 추가 |

**자동 추정 진행 X 정신** — `/task-init`이 가장 강조. 메인이 *추정한 메타로* 파일 생성하지 X. 사용자 답 받기 전 작성 금지.

---

## 3. 상태 전이 체인 + FAIL/UNCERTAIN 분기

7 상태 머신 (-ing/-ed 페어 일관성):

```
draft → planned → developing → developed → testing → tested → closed
```

```
                     ┌──────── FAIL(코드) + "고쳐" ────┐
                     ↓                               │
draft → planned → developing → developed → testing → tested → closed
          ↑                                    │ ↑       ↑
          └─ 시험문제 결함 보수 ────────────────┘ │  FAIL + "OK 마무리"
             (task-plan, 코드·status 보존,        │  (알려진 결함 명시)
              testing 유지 → 재검사)        UNCERTAIN(사람 검수)
                                            ✓→tested / ✗→developing
```

**task-test 세 갈래**: PASS→`tested` / 코드 결함→`developing`(사용자 "고쳐") / 시험문제 결함(UNCERTAIN 검증 불가)→`task-plan` Test Plan 보수→재검사(`testing` 유지). UNCERTAIN(사람 검수, 주관)은 검수 ✓→`tested`, ✗→`developing`.

상세 작성 주체 + FAIL/UNCERTAIN 분기는 → [TASK-DOC.md](TASK-DOC.md) §3~5 참조.

---

## 3.5 멀티세션 워크트리 (0.1.2+)

한 프로젝트에서 *여러 메인 세션이 독립 태스크를 병렬*로 진행하는 운영. git worktree로 작업 폴더 격리, 머지 시 직렬화.

**핵심 정신**:
- **SSoT = git 브랜치** — 별도 상태 파일/락 운영 X. `git branch --list 'feature/*_TASK-*' ...` 단일 진실 소스 (`--no-merged` 미사용 — 분기 직후 브랜치가 부모와 동일 commit이라 완전 머지로 오판돼 채번 충돌하기 때문. `getActiveTasks` 참조)
- **메인 워크트리 = 부모 브랜치 고정 (기본 dev)** — 모든 태스크 작업은 별도 워크트리에서 수행
- **race 차단 2층** — 결정적 슬러그(같은 항목 → 같은 브랜치명, git 자동 거부) + SSoT BL/RM-NNN grep 검사
- **충돌 자체 해결 3단계** — 단순 자동 / 의미적 자료 분석 / 판단 불가 사용자 호출
- **머지 락 직렬화** — `proper-lockfile` 기반 머지 락 (`~/.taskery/<projectId>.merge.lock`), 락 외 사전 rebase + 락 안 재 rebase로 race 흡수
- **자동 정리** — task-close 마지막에 워크트리 + 브랜치 자동 제거 (GIT_RULE.md 면제 조항). 보존 키워드 시 양쪽 보존

**호출 위치 정책 (0.1.3+ — cwd 무관 동작 보장)**:
- **task-init만 예외 — 메인 워크트리 cwd 전용** (워크트리 생성 단계라 cwd 제약 의미). Step 1 사전 검증에서 `git rev-parse --show-toplevel` 결과가 메인 워크트리와 일치 안 하면 중단
- **나머지 task-* 스킬은 호출 위치 자유** — 운영 모델별 default:
  - *멀티세션 병렬* (시스템 default) — 각 워크트리에 새 세션 열어 그 세션이 task-* 스킬 호출
  - *단일 메인 지휘* — 메인 cwd 세션 1개가 모든 task 호출 (별도 워크트리 세션 X)
  - *메인이 서브 세션 spawn* — 메인이 다른 세션 호출해 각 task 병렬 진행 (각 서브 세션이 그 task의 메인)
- **cwd 무관 동작** — 모든 git 명령이 `git -C "$WT_PATH"` / `git -C "$MAIN_WT"` 형태라 어느 cwd에서 호출하든 결과 동일 (task-init 제외)
- **task-close 인자 분기**:
  - 인자 명시 (`TASK-NNN`) → 해당 워크트리 컨텍스트 진입
  - 인자 없음 → 워크트리 cwd면 *그 워크트리의 태스크* 자동 / 메인 cwd면 진행중 태스크 인터뷰 + 사용자 선택
- **내부 명령 형태 강제** (메인 cwd 호출 시 git-guard 오판 차단): 모든 git 명령 `git -C <경로> ...` 형태로만 발행. 셸 prefix(`cd <경로> && git ...`) / `--git-dir=` / `--work-tree=` 변형 영구 금지 — git-guard.sh가 5종 변형(`-C` / `--git-dir=` / `--git-dir` 공백 / `--work-tree=` / `--work-tree` 공백) 인식하나 셸 prefix는 인식 X

**관련 CLI 보조 명령**:
- `npx @angar2/taskery status` — 진행중 태스크 + 워크트리 + 머지 락 + stale 의심 항목 출력
- `npx @angar2/taskery prune` — stale 워크트리 / 브랜치 대화형 정리

**.gitignore 케이스 분기 (task 문서 위치)**:
- 등록 (퍼블릭 리포 default) — 메인 워크트리 절대 경로 (`$MAIN_WT/.project/tasks/...`) 단일 소스. 동시 쓰기 `proper-lockfile`로 직렬화
- 미등록 — 워크트리 안 (`$WT_PATH/.project/tasks/...`), 워크트리 커밋 + 머지 시 부모 브랜치 반영

상세 흐름은 → [template/.claude/skills/task-init/SKILL.md](../template/.claude/skills/task-init/SKILL.md) / [template/.claude/skills/task-close/SKILL.md](../template/.claude/skills/task-close/SKILL.md) 참조.

---

## 3.6 백로그 (0.1.2+)

`/add-backlog`는 *plan(기능 그룹)별 백로그* `.project/tasks/<NNN_slug>/BACKLOG.md`에 task 후보를 1건씩 누적한다. 글로벌 `.project/BACKLOG.md`(다음 기능 그룹 후보 카탈로그)는 `/plan-init` 영역 — 별 차원.

**흐름**:
- 사용자 *"~ 백로그에"* 발화 → 메인 워크트리 검출 + 부모 브랜치 체크아웃 검증 + 활성 plan(manifest.activePlan) 검출
- 얕은 분석(코드 탐색 X, 추정 수준) — 유형 / 제목 / 개요 / 대상 영역
- BL-NNN 채번(`BL-(\d+)` max + 1) + 결정적 슬러그(한국어 → 영어 의미 변환 → kebab-case 3 단어 이내)
- `withMetaLock`으로 BACKLOG.md append (plan-init이 박은 placeholder 라인 치환 우선)

**체크박스 의미**:
- `[ ]` = 미확인 (task로 옮기지 않은 메모)
- `[x]` = 확인 완료 (task로 옮김). **부모 머지 완료 의미 X**

진행중/완료 추적은 git branch SSoT + `git log --all --grep 'BL-NNN'` + `taskery status`가 담당. BACKLOG.md는 *메모지 + task 참조 마크*만.

**`/task-init` 연동**:
- 사용자 *"백로그의 BL-NNN 진행"* → BACKLOG.md에서 BL-NNN 메타 파싱 → 슬러그 그대로 사용 → 개요/대상 영역을 task.md §1 초안으로 자동 복사 → 워크트리 생성 → `withMetaLock` 안에서 `[ ]` → `[x]` + `- TASK: TASK-NNN` 추가 (다회 진행 시 콤마)
- 이미 `[x]` BL 재진행 요청 시 → 사용자 호출 + 결정 (콤마 추가 / 중단)

**`/task-close` 무관** — `[x]` = task로 옮김 의미라 close 시점 마킹 X.

상세 흐름은 → [template/.claude/skills/add-backlog/SKILL.md](../template/.claude/skills/add-backlog/SKILL.md) 참조.

---

## 3.7 agent teams 자동 병렬 (Claude 전용 · 실험 · 트리거 한정)

`/run-team`은 다건 태스크를 *리더 메인 세션 1개가 agent teams로 팀원(독립 세션)에 분배*해 자동 병렬 처리하는 고기능이다. 기존 멀티세션(§3.5)을 사용자가 일일이 띄우는 대신 리더가 띄우고 관리하게 한다. 상위 에이전트 생태계가 taskery를 *병렬 개발 도구*로 호출할 수 있게 하는 전제이기도 하다.

**핵심 정신**:
- **세션 오케스트레이션만 추가** — 워크트리 격리는 `/task-init`이, 머지 직렬화·충돌 3단계는 `/task-close`가 그대로 담당. `/run-team`은 *누가 무엇을 어디까지 진행하는지*만 조율
- **팀원 = agent teams 팀원** (독립 세션 · 자체 컨텍스트 · 사용자 직접 접근). **Task tool 서브에이전트 대체 영구 금지** — 둘은 다름 (서브에이전트는 리더 컨텍스트 내 워커라 사용자 직접 접근·독립 컨텍스트 불가)
- **트리거 한정 발동** — 기본 플로우(1세션 1태스크) 비침범. *"백로그 한 번에 / 팀으로 독립 병렬"* 류 발화에서만
- **두 가드** — 플랫폼(Claude) + 활성화(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). 미충족 시 팀을 만들지 말고 안내 후 중단
- **중단점 = taskery 단계 경계** — 기본 단계별 정지(팀원이 한 단계 후 idle → 리더 자동 통지), 사용자 지시 시 구간 자동. 디버거식 breakpoint 아님. 되돌릴 수 없는 `/task-close`는 게이트로 두기 권장
- **팀원 파일 충돌 회피** — 각 팀원이 *물리적으로 분리된 워크트리*에서 작업하므로 agent teams "같은 파일 동시 편집 → 덮어쓰기" 제약이 구조적으로 회피됨

**상태 전이 무관** — 본 스킬은 task 상태를 직접 전이시키지 X. 각 팀원이 호출하는 task 5스킬이 전이.

**Claude 전용** — agent teams가 Codex에 없어 Codex 설치 미포함(`platformOf`가 `.claude/`를 claude 소속으로 분류 → Claude 선택 시에만 설치). Codex는 단일 태스크 흐름으로.

상세 흐름은 → [template/.claude/skills/run-team/SKILL.md](../template/.claude/skills/run-team/SKILL.md) 참조.

---

## 4. 스킬 본문 — 단일 진실 소스

**본문 step별 디테일**은 `template/.claude/skills/<skill>/SKILL.md`에 위치. 본 문서는 link만:

| 스킬 | 본문 위치 | 분량 |
|------|---------|------|
| `/project-init` | [template/.claude/skills/project-init/SKILL.md](../template/.claude/skills/project-init/SKILL.md) | 15,627 B |
| `/plan-init` | [template/.claude/skills/plan-init/SKILL.md](../template/.claude/skills/plan-init/SKILL.md) | 7,711 B |
| `/task-init` | [template/.claude/skills/task-init/SKILL.md](../template/.claude/skills/task-init/SKILL.md) | 14,010 B |
| `/task-plan` | [template/.claude/skills/task-plan/SKILL.md](../template/.claude/skills/task-plan/SKILL.md) | 24,634 B |
| `/task-dev` | [template/.claude/skills/task-dev/SKILL.md](../template/.claude/skills/task-dev/SKILL.md) | 13,407 B |
| `/task-test` | [template/.claude/skills/task-test/SKILL.md](../template/.claude/skills/task-test/SKILL.md) | 21,829 B |
| `/task-close` | [template/.claude/skills/task-close/SKILL.md](../template/.claude/skills/task-close/SKILL.md) | 14,736 B |
| `/add-backlog` | [template/.claude/skills/add-backlog/SKILL.md](../template/.claude/skills/add-backlog/SKILL.md) | 6,321 B |
| `/log-friction` | [template/.claude/skills/log-friction/SKILL.md](../template/.claude/skills/log-friction/SKILL.md) | 3,617 B |
| `/run-team` (Claude 전용) | [template/.claude/skills/run-team/SKILL.md](../template/.claude/skills/run-team/SKILL.md) | 12,749 B |

**공통 형식** (각 SKILL.md):
```markdown
---
name: <스킬>
description: <한 줄 설명>
---

# /<스킬>

## 개요
## 호출 시점
## 입력 처리
## 단계 (Step 1~7~8)
## 도구 가이드
## 주의사항
## 상태 전이
```

---

## 5. 검증 명령 / 테스트 명령 — 두 섹션 단일 진실 소스 (stash FRICTION_LOG #25 반영)

CLAUDE.md `## 검증 명령` 단일 섹션이 *4 시점에 분산 실행* (self-check / 격리 / 최종 게이트 / hook) 마찰 → 두 섹션 분리 + pre-commit-verify hook 폐기로 *단일 시점 실행* 흐름 정합.

### 5.1. `## 검증 명령` (코드 상태 — 빌드/린트/타입체크)

`/task-dev` self-check (Step 6) + `/task-close` 최종 게이트 (Step 2) 가 *이 섹션을 단일 진실 소스로 참조*.

**형식**:
```markdown
## 검증 명령

- 린트: `npm run lint`
- 타입체크: `npm run typecheck`
- 빌드: `npm run build`
```

### 5.2. `## 테스트 명령` (테스트 실행 — 단위/통합/E2E)

`/task-dev` 구현 후 테스트 실행 (Step 6.5) + `/task-test` 격리 세션이 *이 섹션을 단일 진실 소스로 참조*.

**형식**:
```markdown
## 테스트 명령

- 단위 테스트: `npm test`
- 통합 테스트: `npm run test:integration` (있을 시)
- E2E 테스트: `npx playwright test` (있을 시)
```

### 5.3. 원칙

- 백틱(`...`) 안 명령 그대로 실행
- 언어/프레임워크 따라 변경 (cargo / poetry / go 등)
- 두 섹션 분리 — 한 곳만 수정해도 *해당 영역의 스킬* 만 영향 (cross-contamination 회피)
- *테스트 실행은 task-test 단일 시점*에 집중 (task-close / hook 영역 중복 제거 — pre-commit-verify 폐기 정합)

본 리포 자체는 검증/테스트 명령 없음 (template + plan + bin 자산 — 사용자 프로젝트 명령은 사용자 책임).

---

## 6. 컨텍스트 관리 전략

**원칙**: 모든 스킬을 격리시키지 않고, 모든 스킬을 직접 실행시키지도 않음. *진짜 부담 보이는 곳만 격리*.

| 스킬 | Default | 이유 |
|------|---------|------|
| `/project-init` | 직접 실행 | 1회성 + 사용자 대화 흐름 |
| `/plan-init` | 직접 실행 | 기획 문서 인터뷰 + 사용자 대화 흐름 |
| `/task-init` | 직접 실행 | 짧고 명확, 직전 맥락 활용 |
| `/task-plan` | 직접 실행 | 사용자 대화 흐름. 단 큰 코드베이스 탐색 시 Task 격리 옵션 |
| `/task-dev` | 직접 실행 | plan 컨텍스트 이어짐 필요 |
| `/task-test` | **Task 격리 권장 (default)** | confirmation bias 회피 — 메인 plan/dev 가정이 결과 해석에 안 들어가야 |
| `/task-close` | 직접 실행 | 짧고 명확 |
| `/add-backlog` | 직접 실행 | 사용자 발화 → 얕은 분석(코드 탐색 X) + BACKLOG.md append. 대화 흐름 위주, 격리 의미 약함 |
| `/log-friction` | 직접 실행 | FRICTION_LOG.md 한 행 Append + 사용자 합의 |

**격리 메커니즘** — `/task-test` 1차 default (stash FRICTION_LOG #14+19 / #25 반영):

```
/task-test 호출 → 메인이:
1. task.md 정독 → Test Plan + Dev Plan 완료 기준 추출 (목업 있으면 mockup/<task-doc-name>-mockup.html 도 정독)
2. status를 testing으로 갱신 (격리 세션 호출 직전)
3. Task tool 호출, 격리 prompt:
   - task.md 절대 경로 + TEST_RULE.local.md 절대 경로 ($MAIN_WT/.project/rules/) (격리 세션이 직접 정독 — 자기완결적)
   - 본질 — Test Plan 시나리오 기반 *실질 동작 검증* (유닛 테스트 카운트 단정 X)
   - ④ 문 앞 검사 — 각 [AUTO]가 [명령+구체적 기대값] 자격 갖췄나, 미달이면 시험문제 결함 반려
   - 증거 일치 시만 PASS (코드 정독 PASS 금지)
   - [AUTO] / [USER] 분류 — [USER]는 주관(미세 취향/느낌)만 사용자 검수, 시각 객관 깨짐은 [AUTO] 캡처-목업 대조
   - ⑤ UNCERTAIN 2종 — (사람 검수) 주관 / (검증 불가) [AUTO]인데 기대값 구성 불가 = 시험문제 결함 (근거 의무)
   - AGENTS.md `## 검증 명령` + `## 테스트 명령` + TEST_RULE.local.md 참조
   - 신규 테스트 식별자 grep 직접 등장 확인
   - PASS / FAIL / UNCERTAIN + 근거
4. 결과 리턴받아 task.md Result 섹션 기록
5. 분기:
   - UNCERTAIN(사람 검수, [USER]) → 체크리스트로 사용자 직접 검수 (목업 경로 + 시각 fix 사이클 사전 예고)
   - UNCERTAIN(검증 불가) → /task-plan Test Plan 보수 모드 (코드·status 보존) → /task-test 재실행
   - 시각 어긋남 FAIL → 어긋남 목록 보고 → 사용자 "고쳐" → dev 배치수정 → 재검사 (라운드 상한 3)
6. 사용자 검수 모두 ✓ → status=tested → 사용자에게 close 신호
7. FAIL(코드) 또는 ✗ → 사용자 보고 → "고쳐" or "OK 마무리" 분기
```

격리 prompt 정확한 본문은 → [template/.claude/skills/task-test/SKILL.md](../template/.claude/skills/task-test/SKILL.md) Step 3 참조.

**bottoms-up 보강**: 사이드 프로젝트 굴리며 *컨텍스트 부담 데이터* 수집. 어느 스킬이 부담 큰지 → PLAYBOOK §1(컨텍스트 격리 강화) 부활 검토.

결정 사유 → [DECISIONS.md §9](DECISIONS.md)

---

## 7. 불편 등록 — `/log-friction` + FRICTION_LOG

**불편 데이터 수집 메커니즘** — 호출 트리거 3가지:

| 방식 | 동작 |
|------|------|
| 사용자 명시 호출 | `/log-friction "<불편 내용>"` 또는 무인자 호출. 무인자 시 메인이 사용자에게 *"어떤 점이 불편했는지?"* 질문 |
| 사용자 불만 발화 캐치 | 메인이 사용자 발화에서 불편·짜증·답답함 신호 감지 시 *"FRICTION_LOG에 등록할까?"* 제안 → 사용자 OK 시 자동 발동 |
| task-close 직후 자체 감지 | 메인이 작업 중 마찰 신호(동일 단계 재호출 / 실패 반복 / 사용자 부정 반응 누적) 감지 시 등록 제안 → 사용자 OK 시 발동. 감지 신호 없으면 호출 X |

**`/log-friction` 동작 흐름**:
1. 호출 경로 확인 (직접 호출 / 발화 캐치 / task-close 자체 감지 분기)
2. 등록 본문 확정 (사용자 합의 — 1~3 문장 한 행)
3. `.project/FRICTION_LOG.md` 마지막 행 다음에 신규 행 Append
4. 결과 보고

**핵심 정신**: *기록 행위만* — 분석 / 패턴 감지 / PLAYBOOK 부활 검토 / 룰 제안 X. 사용자가 직접 FRICTION_LOG.md를 정독해 후속 조치 결정.

본문 → [template/.claude/skills/log-friction/SKILL.md](../template/.claude/skills/log-friction/SKILL.md) 참조.

---

## 8. 메인 세션 진입 시 스킬 호출 흐름 예시

**사용자 프로젝트 첫 셋업**:
```
1. cd <user-project>
2. npx @angar2/taskery init  # template/ 자산 카피 + manifest 생성
3. claude code              # 메인 세션 진입 (CLAUDE.md → @AGENTS.md 자동 정독)
4. /project-init            # 진입 문서 + 제품 관통 문서(루트, 그룹 A 작성/B 골격)
5. /plan-init mvp           # 기능 그룹 plan — PLAN/ROADMAP + 제품 문서 의도
6. /task-init               # 첫 task — Requirements 인터뷰
7. /task-plan TASK-001      # 4 섹션 채우기
8. /task-dev TASK-001       # Phase 구현 + self-check
9. /task-test TASK-001      # Task tool 격리 검증
10. /task-close TASK-001    # git 마무리 + 부모 브랜치 병합
```

**불편 발생 시**:
```
11. /log-friction           # 사용자 불편 한 행 기록 (명시 호출 / 불만 발화 캐치 / task-close 자체 감지)
```

---

## 9. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 (`SLASH-COMMANDS.md`) — 8 스킬 명세 + 흐름 + 컨텍스트 관리 + 회고 메타 |
| 2026-05-09 | 파일명 변경: `SLASH-COMMANDS.md` → `SKILLS.md`. 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 이전 버전 언급 정리 |
| 2026-05-09 | npm 패키지명 `@angar2/taskery`로 변경 반영 — `npx taskery init` → `npx @angar2/taskery init`. |
| 2026-05-10 | 스킬 8종 구조 마이그레이션 반영 — §4 표 + 라인 150/177 본문 링크 `<name>.md` → `<name>/SKILL.md` 갱신, frontmatter 공통 형식 예시에 `name` 필드 추가. (Claude Code가 npx init 후 스킬을 인식 못 하던 동작 버그 해결, 0.1.1 후보) |
| 2026-05-30 | stash FRICTION_LOG 기반 정합 — §5 `## 검증 명령` + `## 테스트 명령` 두 섹션 분리 (pre-commit-verify hook 폐기 정합) + §6 task-test 격리 prompt 흐름 갱신 ([AUTO]/[USER] 분류 / 목업 정독 / 신규 식별자 grep / USER 검수 흐름). 8 스킬 본문 변경은 각 SKILL.md 참조. |
| 2026-05-30 | 정합 검증 후속 정정 (Phase 5) — §6 격리 prompt 흐름 본문의 mockup path 표기 `<task>-mockup.html` → `<task-doc-name>-mockup.html` 으로 통일 (MOCKUP_RULE 단일 진실 소스 정합). |
| 2026-05-31 | 멀티세션 0.1.2 반영 — §1 스킬 표에 task-init/close 멀티세션 동작 + 워크트리 호출 위치 명시 / §3.5 멀티세션 워크트리 섹션 신규 (SSoT / 메인=dev 전용 / race 2층 / 충돌 3단계 / 머지 락 / 자동 정리 / 호출 위치 분기 / CLI 보조 명령 / .gitignore 케이스 분기) |
| 2026-05-31 | 0.1.2 백로그 스킬 추가 반영 — §1 스킬 8종 → 9종 + `/add-backlog` (meta) 행 / §2 입력 처리 패턴 행 추가 / §3.6 백로그 (0.1.2+) 섹션 신규 (흐름 / 체크박스 의미 / task-init 연동 / task-close 무관) / §4 스킬 본문 표에 `/add-backlog` 행 / 위계 정신 meta 그룹에 백로그 누적 명시. task-init `[x]` 확인 마킹 + task-close BACKLOG.md 무관 명시도 §1 표에 반영 |
| 2026-05-31 | 정합 순회 1차 후속 정정 — 제목 + 캡션 *스킬 8종* → *9종* 갱신 (멀티세션 + 백로그 commit 후 잔존). 본문 링크 path 표기 `<skill>.md` → `<skill>/SKILL.md` (0.1.1 디렉토리 마이그레이션 정합 누락분). §6 컨텍스트 관리 표 `/add-backlog` 행 추가 (9 스킬 정합). §4 본문 표 7 스킬 분량 실측 갱신 (멀티세션 commit으로 분량 증가 후 갱신 누락 — project-init/plan-init/task-init/task-plan/task-dev/task-test/task-close). 단순 수치 정합, 행위 변경 X |
| 2026-06-02 | 0.1.3 F3 정합 — §1 스킬 표 task-plan/dev/test 캡션 *워크트리 안 호출* → *워크트리 호출 default (멀티세션), 호출 위치 자유, cwd 무관* / §3.5 호출 위치 분기(task-close) → *호출 위치 정책 (0.1.3+ — cwd 무관 동작 보장)* 섹션 재작성: 운영 모델 3가지(멀티세션 병렬 default / 단일 메인 지휘 / 메인 spawn 서브 세션) 모두 지원 + cwd 무관 동작 + 내부 명령 형태 강제 (`git -C` 형태, 셸 prefix / `--git-dir=` / `--work-tree=` 변형 금지) + git-guard.sh 5종 변형 인식 명시. stash FRICTION_LOG 2026-06-01 반영. |
| 2026-06-28 | `/run-team` (agent teams 자동 병렬, Claude 전용) 추가 — 제목·캡션 + §1 표 행 + 위계 정신 meta 그룹 + §3.7 신규 섹션 + §4 본문 표 행(12,749 B). 공통 9종은 유지, Claude 전용 1종 분리 표기(패리티 의도적 갈림). PLAYBOOK §15 본구현. |
| 2026-07-11 | 0.6.0 부모 브랜치 파라미터화 정합 — 분기·되병합 기준을 `dev` 고정에서 *task-init 시점의 현재 브랜치(= 부모 브랜치)*로 일반화. §1 task-close 병합 캡션 / §2 add-backlog 위치 검증 / §3.5 SSoT 명령·메인 워크트리 고정·.gitignore 미등록 반영 / §3.6 체크박스 의미·완료 추적 grep(`git log --all --grep`) / §8 예시 흐름 주석의 *dev* 표기를 *부모 브랜치*로 갱신. git-guard의 main/dev 보호·상태명·`/task-dev` 스킬명은 유지. |
| 2026-08-09 | 프릭션 5건 수선 정합 — §1 표 갱신: task-plan 출제 분리(B 격리 출제·origin 보존·방식 칸+플래그 수정권) / task-test 시험지 오염 검사·음성 대조 / task-close 문서 게이트(`blocked:'docs'`)+CHANGELOG 자동 append. recordion FRICTION 2026-08-09 반영 |
