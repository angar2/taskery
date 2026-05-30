# SKILLS — taskery 스킬 8종

> 본 리포 *작업 흐름의 단일 진실 소스*. 8 스킬 명세 + 흐름 + 컨텍스트 관리 전략.
> 스킬 본문 step별 디테일은 `template/.claude/skills/<skill>.md`에 위치 — 본 문서는 *흐름과 정신* 중심.

---

## 1. 스킬 8종 표 — project > plan > task 위계 + 회고

| 스킬 | 레벨 | 역할 | 상태 전이 | 호출 빈도 |
|------|------|------|---------|----------|
| `/project-init` | **project** | PROJECT.md / AGENT-GUIDE.md / LINKED-REPOS.md / .env / .project 골격 생성 | — | **1회성** (프로젝트 첫 셋업) |
| `/plan-init` | **plan** | `.project/plans/<vX.X>/` 안 기획 문서 작성 | — | plan 버전마다 |
| `/task-init` | **task** | task.md 6 섹션 placeholder + 헤더 status=draft | — → `draft` | task마다 |
| `/task-plan` | task | Requirements / Scope / Dev Plan / Test Plan 채우기 | `draft` → `planned` | task마다 |
| `/task-dev` | task | Phase 순서 구현 + self-check 게이트 | `planned`/`developing` → `developed` | task마다 |
| `/task-test` | task | Task tool 격리 검증 (confirmation bias 회피) | `developed` → `tested` (또는 `developing`/`tested`+결함 명시) | task마다 |
| `/task-close` | task | git 마무리 + 검증 명령 재실행 게이트 + dev `--no-ff` 병합 | `tested` → `closed` | task마다 |
| `/log-friction` | **meta** | FRICTION_LOG.md에 사용자 불편 한 행 기록 | — | 사용자 호출 / 불만 발화 캐치 / task-close 자체 감지 |

**위계 정신**:
- `project` → 1회성 (프로젝트 셋업)
- `plan` → plan 버전마다 (기획 문서 단위)
- `task` → task마다 (5 스킬 흐름)
- `meta` → 사용자 불편 등록 (`/log-friction`)

---

## 2. 입력 처리 패턴

| 스킬 | 입력 | 처리 |
|------|------|------|
| `/project-init` | (자동 분석 또는 질문) | 빈 프로젝트 → 질문 라운드 / 기존 코드 → 소스 분석 + 제안 + confirm. **1회성** — `.project/PROJECT.md` 있으면 경고 |
| `/plan-init` | 버전명 (예: v1.0, alpha) | 인자 없으면 사용자에게 질문. **분기 1**(신규): vX.X/ 생성 + 기획 문서별 질문 라운드. **분기 2**(이어가기): 최신 카피 → 새 vY.Y/ + 변경 인터뷰 + 변경된 문서만 갱신 + AGENT-GUIDE.md 활성 버전 갱신 |
| `/task-init` | 주제/유형/규모/플랜 | 직전 맥락 명확하면 메인 제안 + confirm. 맥락 부족 시 인터뷰. **자동 추정 진행 X** |
| `/task-plan` ~ `/task-close` | TASK-NNN 인자 또는 자동 | 인자 없으면 *상태에 맞는 가장 최근 task* 자동 선택 + confirm |
| `/log-friction` | `<불편 내용>` 또는 무인자 호출 | 사용자 합의 → FRICTION_LOG.md 한 행 추가 |

**자동 추정 진행 X 정신** — `/task-init`이 가장 강조. 메인이 *추정한 메타로* 파일 생성하지 X. 사용자 답 받기 전 작성 금지.

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

상세 작성 주체 + FAIL/UNCERTAIN 분기는 → [TASK-DOC.md](TASK-DOC.md) §3~5 참조.

---

## 4. 스킬 본문 — 단일 진실 소스

**본문 step별 디테일**은 `template/.claude/skills/<skill>/SKILL.md`에 위치. 본 문서는 link만:

| 스킬 | 본문 위치 | 분량 |
|------|---------|------|
| `/project-init` | [template/.claude/skills/project-init/SKILL.md](../template/.claude/skills/project-init/SKILL.md) | 5,990 B |
| `/plan-init` | [template/.claude/skills/plan-init/SKILL.md](../template/.claude/skills/plan-init/SKILL.md) | 5,494 B |
| `/task-init` | [template/.claude/skills/task-init/SKILL.md](../template/.claude/skills/task-init/SKILL.md) | 7,079 B |
| `/task-plan` | [template/.claude/skills/task-plan/SKILL.md](../template/.claude/skills/task-plan/SKILL.md) | 9,273 B |
| `/task-dev` | [template/.claude/skills/task-dev/SKILL.md](../template/.claude/skills/task-dev/SKILL.md) | 8,035 B |
| `/task-test` | [template/.claude/skills/task-test/SKILL.md](../template/.claude/skills/task-test/SKILL.md) | 9,038 B |
| `/task-close` | [template/.claude/skills/task-close/SKILL.md](../template/.claude/skills/task-close/SKILL.md) | 9,077 B |
| `/log-friction` | [template/.claude/skills/log-friction/SKILL.md](../template/.claude/skills/log-friction/SKILL.md) | 3,617 B |

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

## 5. 검증 명령 / 테스트 명령 — 두 섹션 단일 진실 소스 (v0.2.0 정합 — stash FRICTION_LOG #25 반영)

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
- *테스트 실행은 task-test 단일 시점*에 집중 (task-close / hook 영역 중복 제거 — pre-commit-verify v0.2.0 폐기 정합)

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
| `/log-friction` | 직접 실행 | FRICTION_LOG.md 한 행 Append + 사용자 합의 |

**격리 메커니즘** — `/task-test` 1차 default (v0.2.0 정합 — stash FRICTION_LOG #14+19 / #25 반영):

```
/task-test 호출 → 메인이:
1. task.md 정독 → Test Plan + Dev Plan 완료 기준 추출 (목업 있으면 mockup/<task>-mockup.html 도 정독)
2. status를 testing으로 갱신 (격리 세션 호출 직전)
3. Task tool 호출, 격리 prompt:
   - task.md 절대 경로 (격리 세션이 직접 정독 — 자기완결적)
   - 본질 — Test Plan 시나리오 기반 *실질 동작 검증* (유닛 테스트 카운트 단정 X)
   - [AUTO] / [USER] 분류 그대로 따름 — [USER]는 격리 검증 X, 사용자 검수 항목으로 리턴
   - CLAUDE.md `## 검증 명령` + `## 테스트 명령` 둘 다 참조
   - 신규 테스트 식별자 grep 직접 등장 확인
   - PASS / FAIL / UNCERTAIN + 근거
4. 결과 리턴받아 task.md Result 섹션 기록
5. UNCERTAIN ([USER] 시나리오) → 메인이 체크리스트 형식으로 사용자 직접 검수 요청 (목업 경로 명시 + 시각 fix 사이클 사전 예고)
6. 사용자 검수 모두 ✓ → status=tested → 사용자에게 close 신호
7. FAIL 또는 ✗ → 사용자 보고 → "고쳐" or "OK 마무리" 분기
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
3. claude code              # 메인 세션 진입 (CLAUDE.md 자동 정독)
4. /project-init            # PROJECT/AGENT-GUIDE/LINKED-REPOS/.env 골격
5. /plan-init v1.0          # 기획 문서 작성
6. /task-init               # 첫 task — Requirements 인터뷰
7. /task-plan TASK-001      # 4 섹션 채우기
8. /task-dev TASK-001       # Phase 구현 + self-check
9. /task-test TASK-001      # Task tool 격리 검증
10. /task-close TASK-001    # git 마무리 + dev 병합
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
| 2026-05-30 | stash FRICTION_LOG 기반 v0.2.0 정합 — §5 `## 검증 명령` + `## 테스트 명령` 두 섹션 분리 (pre-commit-verify hook 폐기 정합) + §6 task-test 격리 prompt 흐름 갱신 ([AUTO]/[USER] 분류 / 목업 정독 / 신규 식별자 grep / USER 검수 흐름). 8 스킬 본문 변경은 각 SKILL.md 참조. |
