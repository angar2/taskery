# SLASH-COMMANDS — taskery v0.2 슬래시 8종

> 본 리포 *작업 흐름의 단일 진실 소스*. 8 슬래시 명세 + 흐름 + 컨텍스트 관리 전략.
> 슬래시 본문 step별 디테일은 `template/.claude/skills/<slash>.md`에 박힘 — 본 문서는 *흐름과 정신* 중심.

---

## 1. 슬래시 8종 표 — project > plan > task 위계 + 회고

| 슬래시 | 레벨 | 역할 | 상태 전이 | 호출 빈도 |
|--------|------|------|---------|----------|
| `/project-init` | **project** | PROJECT.md / AGENT-GUIDE.md / LINKED-REPOS.md / .env / .project 골격 생성 | — | **1회성** (프로젝트 첫 셋업) |
| `/plan-init` | **plan** | `.project/plans/<vX.X>/` 안 9 기획 문서 작성 | — | plan 버전마다 |
| `/task-init` | **task** | task.md 6 섹션 placeholder + 헤더 status=draft | — → `draft` | task마다 |
| `/task-plan` | task | Requirements / Scope / Dev Plan / Test Plan 채우기 | `draft` → `planned` | task마다 |
| `/task-dev` | task | Phase 순서 구현 + self-check 게이트 | `planned`/`developing` → `developed` | task마다 |
| `/task-test` | task | Task tool 격리 검증 (confirmation bias 회피) | `developed` → `tested` (또는 `developing`/`tested`+결함 명시) | task마다 |
| `/task-close` | task | git 마무리 + 검증 명령 재실행 게이트 + dev `--no-ff` 병합 | `tested` → `closed` | task마다 |
| `/refine` | **meta** | FRICTION_LOG 정독 + 반복 패턴 감지 + bottoms-up 보강 제안 | — | 5 task마다 또는 사용자 호출 |

**위계 정신**:
- `project` → 1회성 (프로젝트 셋업)
- `plan` → plan 버전마다 (기획 문서 단위)
- `task` → task마다 (5 슬래시 흐름)
- `meta` → 누적된 짜증 데이터 회고 (`/refine`)

---

## 2. 입력 처리 패턴

| 슬래시 | 입력 | 처리 |
|--------|------|------|
| `/project-init` | (자동 분석 또는 질문) | 빈 프로젝트 → 질문 라운드 / 기존 코드 → 소스 분석 + 제안 + confirm. **1회성** — `.project/PROJECT.md` 있으면 경고 |
| `/plan-init` | 버전명 (예: v1.0, alpha) | 인자 없으면 사용자에게 질문. **분기 1**(신규): vX.X/ 생성 + 9 문서별 질문 라운드. **분기 2**(이어가기): 최신 카피 → 새 vY.Y/ + 변경 인터뷰 + 변경된 문서만 갱신 + AGENT-GUIDE.md 활성 버전 갱신 |
| `/task-init` | 주제/유형/규모/플랜 | 직전 맥락 명확하면 메인 제안 + confirm. 맥락 부족 시 인터뷰. **자동 추정 진행 X** |
| `/task-plan` ~ `/task-close` | TASK-NNN 인자 또는 자동 | 인자 없으면 *상태에 맞는 가장 최근 task* 자동 선택 + confirm |
| `/refine` | (없음) `--scope last-N` 옵션 | FRICTION_LOG 정독 → 패턴 감지 → 보강 제안 |

**자동 추정 진행 X 정신** — `/task-init`이 가장 강조. 메인이 *추정한 메타로* 파일 생성하지 X. 사용자 답 받기 전 박지 X.

---

## 3. 상태 전이 체인 + FAIL/UNCERTAIN 분기

7 상태 머신 (-ing/-ed 페어 일관성):

```
draft → planned → developing → developed → testing → tested → closed
```

```
                     ┌──────── FAIL + "고쳐" ────┐
                     ↓                          │
draft → planned → developing → developed → testing → tested → closed
                                                         ↑
                                                FAIL + "OK 마무리"
                                                (알려진 결함 명시)
```

상세 박는 주체 + FAIL/UNCERTAIN 분기는 → [TASK-DOC.md](TASK-DOC.md) §3~5 참조.

---

## 4. 슬래시 본문 — 단일 진실 소스

**본문 step별 디테일**은 `template/.claude/skills/<slash>.md`에 박힘. 본 문서는 link만:

| 슬래시 | 본문 위치 | 분량 |
|--------|---------|------|
| `/project-init` | [template/.claude/skills/project-init.md](../template/.claude/skills/project-init.md) | 5,990 B |
| `/plan-init` | [template/.claude/skills/plan-init.md](../template/.claude/skills/plan-init.md) | 5,494 B |
| `/task-init` | [template/.claude/skills/task-init.md](../template/.claude/skills/task-init.md) | 7,079 B |
| `/task-plan` | [template/.claude/skills/task-plan.md](../template/.claude/skills/task-plan.md) | 9,273 B |
| `/task-dev` | [template/.claude/skills/task-dev.md](../template/.claude/skills/task-dev.md) | 8,035 B |
| `/task-test` | [template/.claude/skills/task-test.md](../template/.claude/skills/task-test.md) | 9,038 B |
| `/task-close` | [template/.claude/skills/task-close.md](../template/.claude/skills/task-close.md) | 9,077 B |
| `/refine` | [template/.claude/skills/refine.md](../template/.claude/skills/refine.md) | 8,011 B |

**공통 형식** (각 슬래시 .md):
```markdown
---
description: <한 줄 설명>
---

# /<슬래시>

## 개요
## 호출 시점
## 입력 처리
## 단계 (Step 1~7~8)
## 도구 가이드
## 주의사항
## 상태 전이
## 5사이클 참조
```

---

## 5. 검증 명령 — 단일 진실 소스

`/task-dev` self-check, `/task-test` 격리 게이트, `/task-close` 최종 게이트, `pre-commit-verify.sh` hook이 *모두* 사용자 프로젝트 루트 `CLAUDE.md`의 `## 검증 명령` 섹션을 참조.

**형식** (사용자 프로젝트 `CLAUDE.md`):
```markdown
## 검증 명령

- 린트: `npm run lint`
- 타입체크: `npm run typecheck`
- 빌드: `npm run build`
- 단위테스트: `npm test`
```

**원칙**:
- 백틱(`...`) 안 명령 그대로 실행
- 언어/프레임워크 따라 변경 (cargo / poetry / go 등)
- 한 곳만 수정하면 슬래시 + hook 모두 따름

본 리포 자체는 검증 명령 없음 (template + plan + bin 자산 — 사용자 프로젝트 검증 명령은 사용자 책임).

---

## 6. 컨텍스트 관리 전략

**원칙**: 미리 다 격리 X (5사이클 함정), 미리 다 직접 X (컨텍스트 폭발). *진짜 부담 보이는 곳만 격리*.

| 슬래시 | Default | 이유 |
|--------|---------|------|
| `/project-init` | 직접 실행 | 1회성 + 사용자 대화 흐름 |
| `/plan-init` | 직접 실행 | 9 기획 문서 인터뷰 + 사용자 대화 흐름 |
| `/task-init` | 직접 실행 | 짧고 명확, 직전 맥락 활용 |
| `/task-plan` | 직접 실행 | 사용자 대화 흐름. 단 큰 코드베이스 탐색 시 Task 격리 옵션 |
| `/task-dev` | 직접 실행 | plan 컨텍스트 이어짐 필요 |
| `/task-test` | **Task 격리 권장 (default)** | confirmation bias 회피 — 메인 plan/dev 가정이 결과 해석에 안 들어가야 |
| `/task-close` | 직접 실행 | 짧고 명확 |
| `/refine` | 직접 실행 | FRICTION_LOG 정독 + 패턴 감지 + 사용자 대화 |

**격리 메커니즘** — `/task-test` 1차 default:

```
/task-test 호출 → 메인이:
1. task.md 정독 → Test Plan + Dev Plan 완료 기준 추출
2. status를 testing으로 박음
3. Task tool 호출, 격리 prompt:
   - task.md 절대 경로 (격리 세션이 직접 정독 — 자기완결적)
   - 수행 룰 (메인 가정 X, 코드/동작만 신뢰, PASS/FAIL/UNCERTAIN 결과 + 근거)
4. 결과 리턴받아 task.md Result 섹션 기록
5. PASS → status=tested → 사용자에게 close 신호
6. FAIL/UNCERTAIN → 사용자 보고 → "고쳐" or "OK 마무리" 분기
```

격리 prompt 정확한 본문은 → [template/.claude/skills/task-test.md](../template/.claude/skills/task-test.md) Step 3 참조.

**bottoms-up 보강**: 사이드 프로젝트 굴리며 *컨텍스트 부담 데이터* 수집. 어느 슬래시가 부담 큰지 → PLAYBOOK §1(컨텍스트 격리 강화) 부활 검토.

결정 사유 → [DECISIONS.md §9](DECISIONS.md#9-결정-task-tool-격리는-task-test만-1차-default)

---

## 7. 회고 메타 — `/refine` + FRICTION_LOG

**짜증 데이터 수집 메커니즘** — 두 단계:

| 방식 | 동작 |
|------|------|
| 평소 — `.project/FRICTION_LOG.md` | 사용자 *"이거 짜증나, 적어줘"* → 메인이 한 줄 추가. 또는 메인이 사용자 발화에서 짜증 감지 시 자동 추가 |
| 주기적 — `/refine` 슬래시 | 5 task마다 또는 사용자 호출. 메인이 *최근 짜증 정리 + 반복 패턴 감지 + bottoms-up 보강 제안* (PLAYBOOK 항목 부활 또는 새 룰). 사용자 OK 시 적용 |

**`/refine` 동작 흐름**:
1. FRICTION_LOG.md 정독 (인자 `--scope last-N` 옵션)
2. 패턴 분류 + 빈도 카운트 (8 카테고리: 형식/컨텍스트/슬래시/Test Plan/git/멀티리포/자동화/기타)
3. 반복 패턴 감지 (≥ 3회 카테고리)
4. PLAYBOOK 항목 매핑 (반복 패턴 ↔ §1~§9)
5. bottoms-up 제안서 작성 + 사용자 합의
6. FRICTION_LOG에 메타 행 추가 (다음 회고가 *이전 결과 참조*용)

**핵심 정신**: *미리 박지 X — 진짜 데이터(반복 패턴) 없이 PLAYBOOK 부활 절대 X*. 5사이클 함정 회피의 핵심.

본문 → [template/.claude/skills/refine.md](../template/.claude/skills/refine.md) 참조.

---

## 8. 5사이클 9 에이전트와의 차이

5사이클에서 어느 에이전트가 어느 슬래시로 흡수됐는지:

| 5사이클 에이전트 | v0.2 슬래시 | 메모 |
|----------------|-----------|------|
| `architect` | `/project-init` + `/plan-init` | 프로젝트 + 기획 분리 |
| `architect-reviewer` | (폐기) | 대화로 OK 흡수 |
| `tasker` (create 모드) | `/task-init` | 빈 골격 생성만 |
| `tasker` (close 모드) | `/task-close` 흡수 (사실상 gitter와 합침) | — |
| `tasker` (status / plan-next / roadmap-next / message 모드) | (폐기) | v0.2 단순화 |
| `planner` | `/task-plan` | Requirements / Scope / Dev Plan / Test Plan 작성 |
| `plan-reviewer` | (폐기) | 대화로 OK = 자동 전이 흡수 |
| `developer` | `/task-dev` | Phase 순서 구현 + self-check |
| `develop-reviewer` | (폐기 — self-check 게이트로 흡수) | hard-fail 조건이 self-check가 됨 |
| `tester` | `/task-test` | Task tool 격리 호출 |
| `gitter` | `/task-close` | 검증 명령 재실행 + 커밋 순서 + 병합 |

**5사이클 spec은 본 리포 X** — `taskery-prototype` 리포에 보존. 학습 자료 필요 시 거기서 정독.

→ [DECISIONS.md §3](DECISIONS.md#3-결정-9-에이전트-강제-핸드오프-폐기--1-메인-세션) + [DECISIONS.md §11](DECISIONS.md#11-결정-archive-5사이클-자산-본-리포-x--taskery-prototype-보존)

---

## 9. 메인 세션 진입 시 슬래시 호출 흐름 예시

**사용자 프로젝트 첫 셋업**:
```
1. cd <user-project>
2. npx taskery init        # template/ 자산 카피 + manifest 생성
3. claude code              # 메인 세션 진입 (CLAUDE.md 자동 정독)
4. /project-init            # PROJECT/AGENT-GUIDE/LINKED-REPOS/.env 골격
5. /plan-init v1.0          # 9 기획 문서 작성
6. /task-init               # 첫 task — Requirements 인터뷰
7. /task-plan TASK-001      # 4 섹션 채우기
8. /task-dev TASK-001       # Phase 구현 + self-check
9. /task-test TASK-001      # Task tool 격리 검증
10. /task-close TASK-001    # git 마무리 + dev 병합
```

**5 task 후 회고**:
```
11. /refine                 # FRICTION_LOG 정독 + 반복 패턴 감지 + 보강 제안
```

---

## 10. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — 8 슬래시 명세 + 흐름 + 컨텍스트 관리 + 회고 메타 + 5사이클 9 에이전트 흡수 매핑 |
