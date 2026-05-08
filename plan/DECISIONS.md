# DECISIONS — taskery v0.2 핵심 의사결정 로그

> v0.2 골격을 짠 *결정 사유 + 대안 + 채택 기준*의 단일 진실 소스.
> RETROSPECTIVE.md = *5사이클 문제 분석*, 본 문서 = *v0.2 해결 결정*.
> 각 토픽 문서(SLASH-COMMANDS / TASK-DOC / HOOKS / DISTRIBUTION)는 *결정 결과*만 박고, *왜*는 본 문서 §<N> 참조.

---

## 1. 본 문서 역할

| 문서 | 다루는 것 | 위치 |
|------|---------|------|
| `RETROSPECTIVE.md` (root) | 5사이클(v0.1.0) 회귀의 *문제 분석* — 어디서 망했고 왜 망했나 | `RETROSPECTIVE.md` |
| `plan/DECISIONS.md` (본 문서) | v0.2의 *해결 결정* — 어떤 결정을 *왜* 채택했나 + 대안 + 채택 기준 | `plan/DECISIONS.md` |
| `plan/OVERVIEW.md` 외 토픽 doc | 결정의 *결과*만 박힘. *왜*는 본 문서 link | `plan/*.md` |

본 문서를 정독하면 v0.2가 *왜 이런 모양*인지 이해 가능. 토픽 doc은 *어떻게 동작하는지* 본문.

---

## 2. v0.2 핵심 정신 (3 원칙)

모든 결정의 상위 기준. 5사이클 회귀에서 도출.

| # | 원칙 | 의미 |
|---|------|------|
| 1 | *Process는 자동화 OK, Practice는 자유롭게 + 사용자 판단 신뢰* | 결정적 영역(린트/타입/빌드)은 강제, 휴리스틱 영역(리뷰 본문/상태 전이 흐름)은 강제 X |
| 2 | *Catastrophic만 hook 차단, 형식 위반은 instruction + 대화* | 합리적 변형 차단 사고 회피 (5사이클 함정의 핵심) |
| 3 | *Top-down 미리 박지 X, bottoms-up — 진짜 데이터 모이면 그때 추가* | PLAYBOOK 카탈로그 + FRICTION_LOG 패턴 ≥ 3회 트리거 |

---

## 3. 결정: 9 에이전트 강제 핸드오프 폐기 → 1 메인 세션

**결정**: 5사이클의 9 에이전트(architect / planner / plan-reviewer / developer / develop-reviewer / tester / tasker / gitter / architect-reviewer) 분담 폐기. **메인 세션 = 지크 = 오케스트레이터 + 실행자** 단일 모델 채택.

**WHY**:
- 5사이클의 *각 에이전트가 자기 영역만 만지는* 구조 = process로 practice를 강제한 *임피던스 미스매치*
- 지크의 *진짜 흐름*은 plan/dev/test 사이 *자유로운 왕복* — 강제 핸드오프와 충돌
- 회귀 5번 = 결함이 수렴하지 않음 (RETROSPECTIVE §5 진단 3)

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| 9 에이전트 유지 + 룰 완화 | practice 영역 분담 자체가 함정 — 룰 완화로 해결 X |
| 6 에이전트로 축소 | 분담 정도만 줄여도 같은 문제 (architect-reviewer 등 폐기는 의미) |
| 1 메인 세션 + 슬래시 (채택) | 분담 자체 폐기. *흐름*만 슬래시로 표현 |

**채택 기준**:
- 메인 = 지크가 직접 호출. 슬래시는 *흐름의 표지*만, 강제 핸드오프 X
- 서브에이전트(Task tool)는 *옵션 도구로 살아있음* — 컨텍스트 격리 진짜 필요할 때만
- 5사이클 9 에이전트 spec은 `taskery-prototype` 리포에 보존 (학습 자료)

**결과 박힌 곳**: `plan/SLASH-COMMANDS.md` §1~4

---

## 4. 결정: 11 상태 → 7 상태

**결정**: 5사이클 11 상태(draft/planning/planned/plan-approved/revision-required/developing/developed/dev-revision-required/dev-approved/test-passed/test-failed/closed) → 7 상태(`draft → planned → developing → developed → testing → tested → closed`).

**WHY**:
- revision/approved 단계 = *practice 흐름*. 대화로 OK = 자동 전이가 자연
- 5사이클은 *상태가 진척*인데 *대화 흐름*이 불일치 (RETROSPECTIVE §4-c — 두 문서가 서로 다른 행동을 명령)

**폐기된 7 상태**:
| 상태 | 폐기 사유 |
|------|---------|
| `planning` | `/task-plan` 호출 자체가 진행 표지. 별도 상태 X |
| `plan-approved` | 사용자 *"OK"* = 자동 `planned` |
| `revision-required` | revision은 *흐름*이지 *상태*가 아님 |
| `dev-revision-required` | 동일 — `/task-test` FAIL → 사용자 *"고쳐"* → `developing`으로 자동 |
| `dev-approved` | self-check PASS = 자동 `developed` |
| `test-passed` | `tested`로 통합 |
| `test-failed` | `developing` 또는 `tested`로 분기 흡수 (사용자 판단) |

**채택 7 상태** (-ing/-ed 페어 일관성):
```
draft → planned → developing → developed → testing → tested → closed
```

**채택 기준**:
- 박는 주체: 슬래시 끝에 메인이 박음 (`/task-init` → `draft`, `/task-plan` → `planned`, ...)
- *대화로 OK = 다음 상태로 자동 전이* — revision은 *흐름의 자연스러운 이전*

**결과 박힌 곳**: `plan/TASK-DOC.md` §3~5 + `template/.project/rules/TASK_DOC_RULE.md` §1.2

---

## 5. 결정: 3 hook 화이트리스트(practice) → 3 hook catastrophic only(process)

**결정**: 5사이클의 3 hook(pre-state-save / validate-task-state / post-state-sync)이 *practice 영역(상태 전이 / 자기 행 / 검토 본문)* 차단 → *합리적 변형* 차단 → 망함. v0.2는 hook을 *process / git / 완료 보호* 영역만 catastrophic 차단.

**WHY**:
- practice 영역(예: 검토 본문 형식, 상태 전이 흐름)은 *합리적 변형 다양*. hook이 변형 차단 = 막힘
- process 영역(린트/타입체크/빌드/단위테스트)은 *결정적 — exit code 0 또는 != 0*. 합리적 변형 없음
- git catastrophic(main/dev 직접 커밋, force, no-verify 등)은 *복구 불가능*. 사고 차단 정당

**폐기된 5사이클 hook**:
| Hook | 폐기 사유 | 보존 위치 |
|------|---------|----------|
| `pre-state-save.sh` | 25행 화이트리스트 검증용. v0.2 7 상태에는 무의미 | `taskery-prototype/.taskestra/hooks/` |
| `validate-task-state.sh` | 합리적 변형 차단 사고의 핵심 | `taskery-prototype/.taskestra/hooks/` |
| `post-state-sync.sh` | 자기 행 검증 + 검토 결과 검증 — practice 영역 | `taskery-prototype/.taskestra/hooks/` |

**채택 v0.2 hook 3종**:
| Hook | 영역 | 잡는 것 |
|------|------|--------|
| `git-guard.sh` | git catastrophic | main/dev 직접 커밋, force, no-verify, branch -D, reset --hard, clean -fd |
| `pre-commit-verify.sh` | process catastrophic | git commit 시 CLAUDE.md `## 검증 명령` 모두 PASS 게이트 |
| `closed-immutable.sh` | 완료 보호 catastrophic | closed task.md 본 파일 재수정 차단 (spec-diffs/screenshots는 자유) |

**채택 기준**: *잘 지키면 hook 작동 0회 (무해). 안 지키면 차단 (catastrophic 막음)*. hook이 *작동하면* = 사고 직전.

**결과 박힌 곳**: `plan/HOOKS.md` 전체 + `template/.claude/hooks/*.sh`

---

## 6. 결정: 단일 거대 spec → 분산 (template/ + plan/)

**결정**: 5사이클의 `project-system-plan.md` 단일 거대 spec(1500+ 행) → v0.2는 *영역별 분산*. spec의 *각 부분*이 *실제 동작하는 자리*에 박힘.

**WHY**:
- 단일 거대 문서 = 한 곳 수정 → 다른 곳과 모순 (RETROSPECTIVE §4-c)
- 5사이클 회귀 5번 중 3번이 *spec 내부 모순*에서 발생
- *spec과 구현이 멀어지면* 정합 검증 비용 ↑

**분산 원칙** (각 정보는 *한 곳에만* 박힘):
| 정보 | 단일 진실 소스 |
|------|--------------|
| 슬래시 본문 (Step 1~N) | `template/.claude/skills/<slash>.md` |
| Hook 본문 | `template/.claude/hooks/<hook>.sh` |
| 태스크 양식 spec + 4단 layer + 완성 예시 | `template/.project/rules/TASK_DOC_RULE.md` |
| git 룰 (브랜치/커밋/머지) | `template/.project/rules/GIT_RULE.md` (프로젝트별) → `~/.claude/rules/GIT_RULE.md` (글로벌) |
| 검증 명령 (사용자 프로젝트) | 사용자 프로젝트 `CLAUDE.md` `## 검증 명령` |
| manifest 구조 | `bin/lib.js` + `bin/init.js` |
| 미래 옵션 9 항목 | `plan/PLAYBOOK.md` |
| 결정 사유 (본 문서) | `plan/DECISIONS.md` |
| 5사이클 회고 본문 | `RETROSPECTIVE.md` (root) |

**채택 기준**: plan/ 토픽 doc은 *상위 추상 + 링크*만. 본문은 *실제 구현 파일*에서 읽는다.

**결과 박힌 곳**: `plan/OVERVIEW.md` §단일 진실 소스 표 + plan/ 7 파일 전체 구조

---

## 7. 결정: extract-spec.js 빌드 + IDEMPOTENT 해시 → 폐기

**결정**: 5사이클의 plan ↔ template 자동 빌드(`extract-spec.js`) + IDEMPOTENT 해시 검증 폐기. *사용자(지크) 직접 동기화* 의무로 전환.

**WHY**:
- 자동 동기화 = *spec과 빌드 사이 또 다른 source of truth* 생성 → 모순 누적
- IDEMPOTENT 검증 = *practice 영역 강제*의 다른 형태 — 5사이클 함정 재발
- 사용자 직접 편집 = *spec과 구현이 같은 곳*에서 박힘. 모순 0

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| extract-spec.js 유지 + 룰 완화 | 빌드 자체가 source of truth 분리. 룰 완화로 해결 X |
| 단방향 (plan → template만) | plan 수정 시 template 자동 갱신 = 같은 함정 |
| 사용자 직접 동기화 (채택) | 모순 0. 단 사용자 의무 명시 필요 |

**채택**: 사용자 의무를 *프로젝트 CLAUDE.md `## 동기화 룰`*에 박음. *plan ↔ template 자동 빌드 X*.

**결과 박힌 곳**: `plan/DISTRIBUTION.md` §빌드 시스템 폐기 + `template/CLAUDE.md` `## 동기화 룰`

---

## 8. 결정: 배포 = npx 단일 default

**결정**: taskery 배포는 npm publish + npx 진입점 단일 default. Claude Code plugin / 직접 카피 등 보조 옵션 미채택.

**WHY**:
- 사용자 = 지크 본인 + 동료 진영 (회사/집 PC). Node.js 의존 0 진입장벽
- npx는 *최신 버전 자동 fetch* + *버전 고정 가능* (`npx taskery@0.2.5 init`)
- 머지 갱신 메커니즘 (`npx taskery update`) 단일 흐름

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| Claude Code plugin (`/plugin`) | 환경 미지원 (지크 VSCode extension 환경) + 이중 유지비 |
| 직접 git clone + 카피 | 머지 갱신 자동화 X. 사용자 customize 충돌 처리 수동 |
| npm publish + npx (채택) | 단일 default. 진입장벽 0 |

**채택 명령**:
| 명령 | 동작 |
|------|------|
| `npx create-taskery <name>` | 새 폴더 + 세팅 |
| `npx taskery init` | 기존 리포에 세팅 |
| `npx taskery update` | 최신 버전 머지 갱신 |
| `npx taskery@<version> init` | 특정 버전 고정 |

**보조 옵션 미래로 폐기**: Claude Code plugin은 PLAYBOOK §6 (진짜 환경 지원되면 검토).

**결과 박힌 곳**: `plan/DISTRIBUTION.md` 전체 + `bin/*.js` + `package.json`

---

## 9. 결정: Task tool 격리는 `/task-test`만 1차 default

**결정**: 8 슬래시 중 `/task-test`만 *Task tool 격리 호출*이 1차 default. 다른 슬래시는 메인 세션 직접 실행.

**WHY**:
- `/task-test`는 *confirmation bias 회피*가 핵심 — 메인 세션의 plan/dev 가정이 결과 해석에 안 들어가야
- 다른 슬래시(`/task-plan`, `/task-dev` 등)는 *지크와 대화 흐름*이 핵심 — 격리하면 대화 끊김
- 미리 다 격리 X = 5사이클 함정 회피. 미리 다 직접 X = 컨텍스트 폭발 회피. *진짜 부담 보이는 곳만 격리*

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| 모든 슬래시 격리 | 5사이클 함정 재발 (분담 강제) |
| 모든 슬래시 직접 | 30+ task 누적 시 컨텍스트 폭발 |
| `/task-test`만 격리 (채택) | confirmation bias 회피 + 컨텍스트 절감 균형 |

**bottoms-up 보강**: 진짜 사이드 프로젝트 굴리며 *컨텍스트 부담 데이터* 수집. 어느 슬래시가 부담 큰지 보고 PLAYBOOK §1(컨텍스트 격리 강화) 부활.

**채택 prompt 정신** — 격리 prompt는 *자기완결적*:
- task.md 경로 + 격리 룰만 박음. 메인 컨텍스트 일체 X
- 격리 세션이 *task.md만 보고도* 수행 가능
- 결과 = PASS/FAIL/UNCERTAIN + 근거 (로그 인용)

**결과 박힌 곳**: `plan/SLASH-COMMANDS.md` §컨텍스트 관리 + `template/.claude/skills/task-test.md` Step 3

---

## 10. 결정: PLAYBOOK 카탈로그 (top-down 미리 박지 X, bottoms-up)

**결정**: 미래 가능 옵션을 *카탈로그*로 박되 *현재 도입 X*. 진짜 데이터(반복 패턴 ≥ 3회)가 모이면 `/refine` 회고 + 사용자 합의로 부활.

**WHY**:
- 5사이클은 *미리 다 박음* → 합리적 변형 차단 → 망함 (RETROSPECTIVE §4 진단 종합)
- 미리 박은 옵션은 *진짜 부담 데이터 없이* 추가됨 → 짜증 누적 + spec 무게 ↑
- bottoms-up = *진짜 짜증 발생 시점*에서 옵션 검토 → 정당화

**카탈로그 9 항목** (`plan/PLAYBOOK.md`):
| # | 주제 | 부활 트리거 |
|---|------|----------|
| 1 | 컨텍스트 격리 강화 (Task tool default 확장) | 30+ task 메인 컨텍스트 폭발 |
| 2 | 압축 평가 기준 subagent (유사 RAG) | 9 기획 문서 / 코드 컨벤션 누적 부담 |
| 3 | Python orchestrator + `claude -p` 헤드리스 | task당 phase 100개 자동화 시나리오 (충돌 가능 — *v0.2 정신과 다름*) |
| 4 | minimal form hook | 태스크 문서 형식 위반 5회 이상 |
| 5 | `/plan-roadmap` 슬래시 | 큰 묶음 작업 빈발 + ROADMAP.md 수동 부담 |
| 6 | Claude Code plugin 발행 | `/plugin` 환경 지원 시 |
| 7 | 자동 PR 리뷰 (CodeRabbit + 자동 반영) | PR 리뷰 부담 ↑ + 다른 시각 필요 |
| 8 | 우선순위 컬럼 부활 | task 누적 시 우선순위 정렬 필요 |
| 9 | 머지 로직 엣지 케이스 보강 | npx update 시 사용자 customize 충돌 빈발 |

**부활 흐름**:
```
FRICTION_LOG 패턴 ≥ 3회 → /refine 회고 → 사용자 합의 → PLAYBOOK 항목 본문 §방법 그대로 적용
```

**결과 박힌 곳**: `plan/PLAYBOOK.md` (본문) + `plan/SLASH-COMMANDS.md` `/refine` 섹션

---

## 11. 결정: archive 5사이클 자산 본 리포 X — taskery-prototype 보존

**결정**: 5사이클의 9 에이전트 spec / 3 hook / AGENT-CONSTITUTION 자산은 본 리포(`taskery`) 안에 안 박음. `taskery-prototype` 리포에서 *영구 보존*.

**WHY**:
- 본 리포 archive + prototype 리포 = *동일 자산 두 곳 중복*. sync 부담 + 헷갈림
- 5사이클 spec은 *시제품 단계의 학습 자료* — 진화하지 않는 정적 자산 → 별도 리포가 자연
- 본 리포는 v0.2 *진화하는 자산* (template/ + bin/ + plan/) — archive와 *수명 주기 다름*

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| 본 리포 + prototype 모두 보존 | 중복 (현재 상태) |
| 둘 다 폐기 | 5사이클 학습 자료 손실 |
| prototype 리포만 보존 (채택) | 단일 진실 소스. 본 리포 가벼움 |

**채택**: 본 리포 `archive/` 디렉토리 삭제. 5사이클 참조 필요 시 `taskery-prototype` 리포 정독.

**부수 처리**:
- `template/.claude/skills/*.md` 안 *5사이클 참조* 섹션 — `archive/agents/<name>.md` 인용 → *broken link*. 단 이 섹션은 *taskery 리포 자체*가 아닌 *taskery-prototype*을 가리키도록 OVERVIEW에서 안내
- 사용자 프로젝트(`npx taskery init`)에는 archive 카피 X (template/만 카피) → 영향 없음

**결과 박힌 곳**: `plan/OVERVIEW.md` §5사이클 참조 안내 + 본 리포 `archive/` 디렉토리 삭제

---

## 12. 변경 이력

결정이 *진짜 데이터*로 부분 뒤집어진 경우 추가. 현재 없음.

C11(사이드 프로젝트 적용) 굴린 후 짜증/한계 데이터 누적 시 본 섹션에 추가:
- 어느 결정이 뒤집혔는지
- 어떤 데이터가 트리거됐는지
- 새 결정의 사유

---

## 13. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — 핵심 의사결정 11개 + 변경 이력 자리. RETROSPECTIVE와의 역할 분리 명시 |
