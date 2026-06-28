# DECISIONS — taskery 핵심 의사결정 로그

> taskery 골격을 짠 *결정 사유 + 대안 + 채택 기준*의 단일 진실 소스.
> 각 토픽 문서(SKILLS / TASK-DOC / HOOKS / DISTRIBUTION)는 *결정 결과*만 기록하고, *왜*는 본 문서 §<N> 참조.

---

## 1. 본 문서 역할

| 문서 | 다루는 것 | 위치 |
|------|---------|------|
| `plan/DECISIONS.md` (본 문서) | taskery의 *해결 결정* — 어떤 결정을 *왜* 채택했나 + 대안 + 채택 기준 | `plan/DECISIONS.md` |
| `plan/OVERVIEW.md` 외 토픽 doc | 결정의 *결과*만 기록. *왜*는 본 문서 link | `plan/*.md` |

본 문서를 정독하면 taskery이 *왜 이런 모양*인지 이해 가능. 토픽 doc은 *어떻게 동작하는지* 본문.

---

## 2. taskery 핵심 정신 (3 원칙)

모든 결정의 상위 기준. 5사이클 회귀에서 도출.

| # | 원칙 | 의미 |
|---|------|------|
| 1 | *Process는 자동화 OK, Practice는 자유롭게 + 사용자 판단 신뢰* | 결정적 영역(린트/타입/빌드)은 강제, 휴리스틱 영역(리뷰 본문/상태 전이 흐름)은 강제 X |
| 2 | *Catastrophic만 hook 차단, 형식 위반은 instruction + 대화* | 합리적 변형 차단 사고 회피 (5사이클 함정의 핵심) |
| 3 | *Top-down 선제적 작성 금지, bottoms-up — 진짜 데이터 모이면 그때 추가* | PLAYBOOK 카탈로그 + FRICTION_LOG 패턴 ≥ 3회 트리거 |

---

## 3. 결정: 9 에이전트 강제 핸드오프 폐기 → 1 메인 세션

**결정**: 5사이클의 9 에이전트(architect / planner / plan-reviewer / developer / develop-reviewer / tester / tasker / gitter / architect-reviewer) 분담 폐기. **메인 세션 = 사용자 = 오케스트레이터 + 실행자** 단일 모델 채택.

**WHY**:
- 5사이클의 *각 에이전트가 자기 영역만 담당하는* 구조 = process로 practice를 강제한 *임피던스 미스매치*
- 사용자의 *진짜 흐름*은 plan/dev/test 사이 *자유로운 왕복* — 강제 핸드오프와 충돌
- 회귀 5번 = 결함이 수렴하지 않음

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| 9 에이전트 유지 + 룰 완화 | practice 영역 분담 자체가 함정 — 룰 완화로 해결 X |
| 6 에이전트로 축소 | 분담 정도만 줄여도 같은 문제 (architect-reviewer 등 폐기는 의미) |
| 1 메인 세션 + 스킬 (채택) | 분담 자체 폐기. *흐름*만 스킬로 표현 |

**채택 기준**:
- 메인 = 사용자가 직접 호출. 스킬은 *흐름의 표지*만, 강제 핸드오프 X
- 서브에이전트(Task tool)는 *옵션 도구로 살아있음* — 컨텍스트 격리 진짜 필요할 때만
- 5사이클 9 에이전트 spec은 `taskery-prototype` 리포에 보존 (학습 자료)

**결과 위치**: `plan/SKILLS.md` §1~4

---

## 4. 결정: 11 상태 → 7 상태

**결정**: 5사이클 11 상태(draft/planning/planned/plan-approved/revision-required/developing/developed/dev-revision-required/dev-approved/test-passed/test-failed/closed) → 7 상태(`draft → planned → developing → developed → testing → tested → closed`).

**WHY**:
- revision/approved 단계 = *practice 흐름*. 대화로 OK = 자동 전이가 자연
- 5사이클은 *상태가 진척*인데 *대화 흐름*이 불일치 — 두 문서가 서로 다른 행동을 명령

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
- 기록 주체: 스킬 끝에 메인이 갱신 (`/task-init` → `draft`, `/task-plan` → `planned`, ...)
- *대화로 OK = 다음 상태로 자동 전이* — revision은 *흐름의 자연스러운 이전*

**결과 위치**: `plan/TASK-DOC.md` §3~5 + `template/.project/rules/TASK_DOC_RULE.md` §1.2

---

## 5. 결정: 3 hook 화이트리스트(practice) → 3 hook catastrophic only(process)

**결정**: 5사이클의 3 hook(pre-state-save / validate-task-state / post-state-sync)이 *practice 영역(상태 전이 / 자기 행 / 검토 본문)* 차단 → *합리적 변형* 차단 → 망함. taskery은 hook을 *process / git / 완료 보호* 영역만 catastrophic 차단.

**WHY**:
- practice 영역(예: 검토 본문 형식, 상태 전이 흐름)은 *합리적 변형 다양*. hook이 변형 차단 = 막힘
- process 영역(린트/타입체크/빌드/단위테스트)은 *결정적 — exit code 0 또는 != 0*. 합리적 변형 없음
- git catastrophic(main/dev 직접 커밋, force, no-verify 등)은 *복구 불가능*. 사고 차단 정당

**폐기된 5사이클 hook**:
| Hook | 폐기 사유 | 보존 위치 |
|------|---------|----------|
| `pre-state-save.sh` | 25행 화이트리스트 검증용. taskery 7 상태에는 무의미 | `taskery-prototype/.taskestra/hooks/` |
| `validate-task-state.sh` | 합리적 변형 차단 사고의 핵심 | `taskery-prototype/.taskestra/hooks/` |
| `post-state-sync.sh` | 자기 행 검증 + 검토 결과 검증 — practice 영역 | `taskery-prototype/.taskestra/hooks/` |

**채택 taskery hook 2종 (§13 변경 이력 참조)**:
| Hook | 영역 | 잡는 것 |
|------|------|--------|
| `git-guard.sh` | git catastrophic | main/dev 직접 커밋, force, no-verify, branch -D, reset --hard, clean -fd |
| `closed-immutable.sh` | 완료 보호 catastrophic | closed task.md 본 파일 재수정 차단 (spec-diffs / screenshots / mockup은 자유) |

> `pre-commit-verify.sh` 폐기 — task-close Step 2 게이트와 *동일 검증 명령 / 동일 working tree* 결정론적 redundant. 5 커밋 task 풀 검증 8회 (의도 2 + redundant 6) 시간 낭비 누적. 상세: §13 변경 이력.

**채택 기준**: *잘 지키면 hook 작동 0회 (무해). 안 지키면 차단 (catastrophic 막음)*. hook이 *작동하면* = 사고 직전.

**결과 위치**: `plan/HOOKS.md` 전체 + `template/.claude/hooks/*.sh`

---

## 6. 결정: 단일 거대 spec → 분산 (template/ + plan/)

**결정**: 5사이클의 `project-system-plan.md` 단일 거대 spec(1500+ 행) → taskery은 *영역별 분산*. spec의 *각 부분*이 *실제 동작하는 자리*에 위치.

**WHY**:
- 단일 거대 문서 = 한 곳 수정 → 다른 곳과 모순
- 5사이클 회귀 5번 중 3번이 *spec 내부 모순*에서 발생
- *spec과 구현이 멀어지면* 정합 검증 비용 ↑

**분산 원칙** (각 정보는 *한 곳에만* 위치):
| 정보 | 단일 진실 소스 |
|------|--------------|
| 스킬 본문 (Step 1~N) | `template/.claude/skills/<skill>/SKILL.md` |
| Hook 본문 | `template/.claude/hooks/<hook>.sh` |
| 태스크 양식 spec + 4단 layer + 완성 예시 | `template/.project/rules/TASK_DOC_RULE.md` |
| git 룰 (브랜치/커밋/머지) | `template/.project/rules/GIT_RULE.md` (프로젝트별) → `~/.claude/rules/GIT_RULE.md` (글로벌) |
| CHANGELOG 작성 룰 | `template/.project/rules/CHANGELOG_RULE.md` |
| UX/UI HTML 목업 룰 | `template/.project/rules/MOCKUP_RULE.md` |
| 검증 명령 (사용자 프로젝트 — 코드 상태) | 사용자 프로젝트 `CLAUDE.md` `## 검증 명령` (빌드/린트/타입체크) |
| 테스트 명령 (사용자 프로젝트 — 테스트 실행) | 사용자 프로젝트 `CLAUDE.md` `## 테스트 명령` (단위/통합/E2E) |
| manifest 구조 | `bin/lib.js` + `bin/init.js` |
| 미래 옵션 9 항목 | `plan/PLAYBOOK.md` |
| 결정 사유 (본 문서) | `plan/DECISIONS.md` |

**채택 기준**: plan/ 토픽 doc은 *상위 추상 + 링크*만. 본문은 *실제 구현 파일*에서 정독.

**결과 위치**: `plan/OVERVIEW.md` §단일 진실 소스 표 + plan/ 7 파일 전체 구조

---

## 7. 결정: extract-spec.js 빌드 + IDEMPOTENT 해시 → 폐기

**결정**: 5사이클의 plan ↔ template 자동 빌드(`extract-spec.js`) + IDEMPOTENT 해시 검증 폐기. *사용자 직접 동기화* 의무로 전환.

**WHY**:
- 자동 동기화 = *spec과 빌드 사이 또 다른 source of truth* 생성 → 모순 누적
- IDEMPOTENT 검증 = *practice 영역 강제*의 다른 형태 — 5사이클 함정 재발
- 사용자 직접 편집 = *spec과 구현이 같은 곳*에 위치. 모순 0

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| extract-spec.js 유지 + 룰 완화 | 빌드 자체가 source of truth 분리. 룰 완화로 해결 X |
| 단방향 (plan → template만) | plan 수정 시 template 자동 갱신 = 같은 함정 |
| 사용자 직접 동기화 (채택) | 모순 0. 단 사용자 의무 명시 필요 |

**채택**: 사용자 의무를 *프로젝트 CLAUDE.md `## 동기화 룰`*에 명시. *plan ↔ template 자동 빌드 X*.

**결과 위치**: `plan/DISTRIBUTION.md` §자동 빌드 미채택 + `template/CLAUDE.md` `## 동기화 룰`

---

## 8. 결정: 배포 = npx 단일 default

**결정**: taskery 배포는 npm publish + npx 진입점 단일 default. Claude Code plugin / 직접 카피 등 보조 옵션 미채택.

**WHY**:
- 사용자 = 본인 + 동료 진영 (회사/집 PC). Node.js 의존 0 진입장벽
- npx는 *최신 버전 자동 fetch* + *버전 고정 가능* (`npx @angar2/taskery@0.1.5 init`)
- 머지 갱신 메커니즘 (`npx @angar2/taskery update`) 단일 흐름

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| Claude Code plugin (`/plugin`) | 환경 미지원 (VSCode extension 환경) + 이중 유지비 |
| 직접 git clone + 카피 | 머지 갱신 자동화 X. 사용자 customize 충돌 처리 수동 |
| npm publish + npx (채택) | 단일 default. 진입장벽 0 |

**채택 명령**:
| 명령 | 동작 |
|------|------|
| `npx -p @angar2/taskery create-taskery <name>` | 새 폴더 + 세팅 |
| `npx @angar2/taskery init` | 기존 리포에 세팅 |
| `npx @angar2/taskery update` | 최신 버전 머지 갱신 |
| `npx @angar2/taskery@<version> init` | 특정 버전 고정 |

**보조 옵션 미래로 유보**: Claude Code plugin은 PLAYBOOK §6 (진짜 환경 지원되면 검토).

**결과 위치**: `plan/DISTRIBUTION.md` 전체 + `bin/*.js` + `package.json`

---

## 9. 결정: Task tool 격리는 `/task-test`만 1차 default

**결정**: 9 스킬 중 `/task-test`만 *Task tool 격리 호출*이 1차 default. 다른 스킬은 메인 세션 직접 실행.

**WHY**:
- `/task-test`는 *confirmation bias 회피*가 핵심 — 메인 세션의 plan/dev 가정이 결과 해석에 안 들어가야
- 다른 스킬(`/task-plan`, `/task-dev` 등)은 *사용자와 대화 흐름*이 핵심 — 격리하면 대화 끊김
- 모든 스킬을 미리 격리시키지 않고, 모든 스킬을 미리 직접 실행시키지도 않음. *진짜 부담 보이는 곳만 격리*

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| 모든 스킬 격리 | 5사이클 함정 재발 (분담 강제) |
| 모든 스킬 직접 | 30+ task 누적 시 컨텍스트 폭발 |
| `/task-test`만 격리 (채택) | confirmation bias 회피 + 컨텍스트 절감 균형 |

**bottoms-up 보강**: 진짜 사이드 프로젝트 굴리며 *컨텍스트 부담 데이터* 수집. 어느 스킬이 부담 큰지 보고 PLAYBOOK §1(컨텍스트 격리 강화) 부활.

**채택 prompt 정신** — 격리 prompt는 *자기완결적*:
- task.md 경로 + 격리 룰만 명시. 메인 컨텍스트 일체 X
- 격리 세션이 *task.md만 보고도* 수행 가능
- 결과 = PASS/FAIL/UNCERTAIN + 근거 (로그 인용)

**결과 위치**: `plan/SKILLS.md` §컨텍스트 관리 + `template/.claude/skills/task-test/SKILL.md` Step 3

---

## 10. 결정: PLAYBOOK 카탈로그 (top-down 선제적 작성 금지, bottoms-up)

**결정**: 미래 가능 옵션을 *카탈로그*로 두되 *현재 도입 X*. 진짜 데이터(FRICTION_LOG 누적 불편)가 모이면 사용자가 직접 PLAYBOOK 정독 후 부활 결정.

**WHY**:
- 5사이클은 *선제적 일괄 작성* → 합리적 변형 차단 → 망함
- 선제적으로 추가된 옵션은 *진짜 부담 데이터 없이* 추가됨 → 짜증 누적 + spec 무게 ↑
- bottoms-up = *진짜 짜증 발생 시점*에서 옵션 검토 → 정당화

**카탈로그 9 항목** (`plan/PLAYBOOK.md`):
| # | 주제 | 부활 검토 시점 |
|---|------|----------|
| 1 | 컨텍스트 격리 강화 (Task tool default 확장) | 30+ task 메인 컨텍스트 폭발 |
| 2 | 압축 평가 기준 subagent (유사 RAG) | 제품 관통 문서 / 코드 컨벤션 누적 부담 |
| 3 | Python orchestrator + `claude -p` 헤드리스 | task당 phase 100개 자동화 시나리오 (충돌 가능 — *현재 정신과 다름*) |
| 4 | minimal form hook | 태스크 문서 형식 위반 5회 이상 |
| 5 | `/plan-roadmap` 스킬 | 큰 묶음 작업 빈발 + ROADMAP.md 수동 부담 |
| 6 | Claude Code plugin 발행 | `/plugin` 환경 지원 시 |
| 7 | 자동 PR 리뷰 (CodeRabbit + 자동 반영) | PR 리뷰 부담 ↑ + 다른 시각 필요 |
| 8 | 우선순위 컬럼 부활 | task 누적 시 우선순위 정렬 필요 |
| 9 | 머지 로직 엣지 케이스 보강 | npx update 시 사용자 customize 충돌 빈발 |

**부활 흐름**:
```
FRICTION_LOG 누적 → 사용자 직접 정독 → PLAYBOOK 항목 §방법 그대로 적용
```

**결과 위치**: `plan/PLAYBOOK.md` (본문)

---

## 11. 결정: archive 5사이클 자산 본 리포 X — taskery-prototype 보존

**결정**: 5사이클의 9 에이전트 spec / 3 hook / AGENT-CONSTITUTION 자산은 본 리포(`taskery`) 안에 미포함. `taskery-prototype` 리포에서 *영구 보존*.

**WHY**:
- 본 리포 archive + prototype 리포 = *동일 자산 두 곳 중복*. sync 부담 + 헷갈림
- 5사이클 spec은 *시제품 단계의 학습 자료* — 진화하지 않는 정적 자산 → 별도 리포가 자연
- 본 리포는 taskery *진화하는 자산* (template/ + bin/ + plan/) — archive와 *수명 주기 다름*

**대안 검토**:
| 대안 | 채택 X 이유 |
|------|-----------|
| 본 리포 + prototype 모두 보존 | 중복 (현재 상태) |
| 둘 다 폐기 | 5사이클 학습 자료 손실 |
| prototype 리포만 보존 (채택) | 단일 진실 소스. 본 리포 가벼움 |

**채택**: 본 리포 `archive/` 디렉토리 부재. 5사이클 참조 필요 시 `taskery-prototype` 리포 정독.

**부수 처리**:
- `template/.claude/skills/*/SKILL.md`의 과거 *5사이클 참조* 섹션은 정정 작업으로 통째 제거 — broken link 가능성 자체 해소
- 사용자 프로젝트(`npx @angar2/taskery init`)에는 archive 카피 X (template/만 카피) → 영향 없음

**결과 위치**: 본 리포 `archive/` 디렉토리 부재

---

## 12. 결정: task-test 거짓 PASS → 오라클 강제 (증거 기반 검증)

**결정**: task-test가 *반증 가능한 합격 기준(오라클)* 없이 PASS를 찍던 문제를 토대부터 고친다. PLAYBOOK §12 본구현 (2026-06-28).

**문제**: LLM 테스터는 *틀렸는지 실제로 걸러낼 기준*이 없으면 코드를 읽고 "맞는 것 같음 → PASS"로 낙관한다. 특히 UX/UI에서 목업과 동떨어진 낮은 품질 구현에 PASS가 찍혀, 사용자가 한 task에 재순회 10회+의 *실제 QA* 노동을 떠안았다. 그간의 fix(유닛 카운트 금지 / grep 금지)는 구멍을 하나씩 때운 반창고였고 토대가 없었다.

**구현 (문서/스킬만, 코드 자산 0)**:
1. **시험문제 형태 강제** (`task-plan` + `TASK_DOC_RULE` §2.5) — 모든 `[AUTO]` 시나리오 = [실행 명령/입력] + [구체적·관측 가능한 기대값] 한 쌍. 소원("정상 동작") 금지, 장면 쪼개기, "고장 시 어떻게 걸리나" 잣대.
2. **방식↔정답지 매핑** — 요구사항 성격 → 필수 방식(재량 0) + 방식마다 다른 정답지·검사 주체 컬럼.
3. **③B 실행 경로** — 방식을 *이 프로젝트에서 실제로 어떻게 돌리나*를 신설 `.project/TEST-GUIDE.md`(FRICTION_LOG 모델 — init 자동 카피)에 기록. 모르면 task-plan이 사용자에게 묻고, 알면 파일에서 재사용.
4. **격리 세션 강제** (`task-test` 펜스 내부) — ④ 문 앞 검사(자격 미달 시나리오 = 시험문제 결함 반려) / 증거 일치 시만 PASS(코드 정독 PASS 금지) / ⑤ UNCERTAIN 2종.
5. **UNCERTAIN 2종** — (사람 검수) 정답지가 주관 / (검증 불가) [AUTO]인데 기대값 구성 불가 = 시험문제 결함. PASS 반올림·도망 방지(근거 의무).
6. **시각 = 캡처-목업 자동 대조** — 승인 목업 = 사용자가 이미 승인한 정답지. 격리 세션이 화면 캡처 → 대조 → *어긋남 목록* → FAIL. 사용자는 흠 사냥 대신 "고쳐" 게이트만. 객관 깨짐=자동, 미세 취향만 사람.
7. **상태전이 3갈래** — PASS→`tested` / 코드 결함→`developing`(사용자 "고쳐") / 시험문제 결함→Test Plan 보수(`task-plan`, 코드·status 보존, `testing` 유지)→재검사.
8. **플랫폼 패리티 (클로드 = 코덱스)** — 위 룰은 전부 `task-test` 격리 펜스(플랫폼 중립)에 들어가 양 플랫폼에 동일 전달된다(클로드 = `general-purpose` 서브에이전트 + 펜스 / 코덱스 = `task-tester` 서브에이전트 + 펜스). 코덱스 `task-tester.toml`의 `developer_instructions`는 같은 룰의 코덱스 기준선 미러 — 펜스 룰 변경 시 함께 갱신(SKILL.md 구현 디테일에 미러 규율 명시).

**대안 기각**:
- *plan-time hook으로 시험문제 형태 미리 차단* — hook은 글자 모양만 보고 의미를 못 봐 얇다("출력이 나온다"도 통과). task-test 문 앞 검사가 의미를 보므로 중복 → hook 안 단다(코드 자산 0 유지).
- *무인 자동 시각 수렴 루프(사용자 없이 dev↔test)* — taskery 코어 불변식 "FAIL은 사용자 발화 필수" 위반. 사용자가 짜증낸 건 흠 사냥 노동이지 "고쳐" 한 번이 아니므로, 기존 FAIL→developing 흐름 재사용으로 노동만 제거(라운드 상한 3).
- *되돌림용 새 status 신설* — 7상태 -ing/-ed 페어·`closed-immutable.sh` 화이트리스트와 충돌. `testing` 유지로 해소.

**얻는 것**: "통과" = "코드 보니 될 듯"(공허) → "실제 동작/화면을 정답지와 대조했고 일치"(믿을 수 있음). taskery 핵심(메인 confirmation bias 차단)이 검증 단계에서 실제로 작동.

**링크**: [PLAYBOOK.md](PLAYBOOK.md) §12 (카탈로그 출처). 본 문서 §4(11→7 상태)·§9(Task tool 격리 default)의 토대 위에 선다. 회귀-안전 2차 재검증 근거는 플랜 문서 §9 참조.

---

## 13. 변경 이력

결정이 *진짜 데이터*로 부분 뒤집어진 경우 추가.

---

### 13.1. stash FRICTION_LOG 기반 정합 (2026-05-30)

**트리거 데이터**: 사이드 프로젝트 `stash` (macOS 데스크톱 앱, v1.0 풀스택 — 80+ task 진행) `.project/FRICTION_LOG.md` 17건 누적. 그 중 일부는 stash 자체에서 정합 완료, 본체 적용 보류 상태였음.

**채택 결정 14건** (FRICTION_LOG # 번호):

| # | 결정 | 영역 | 마찰 사례 / 채택 사유 |
|---|------|------|---------------------|
| 1 | ROADMAP 작성 4룰 inline | plan-init SKILL | 사용자가 ROADMAP 작성 방식 매번 정정. 4룰(현재 버전 한정 / Stage 단위 / 작업 단위 / 상태 컬럼만) inline 명시로 정정 불필요화 |
| 3 | GLOSSARY.md 신설 단계 | project-init SKILL | 도메인 용어(~40개) 한글 표기 갈림 마찰. `.project/GLOSSARY.md` (4컬럼: 영문/한글/정의/출처) 부트스트랩 자동 생성 |
| 4 | docs/* 브랜치 + ff-only 금지 명시 | GIT_RULE + task-close SKILL | task 진행 중 ROADMAP/플랜 갱신을 별도 docs/* 브랜치 + ff-only로 처리 → 분기 정보 손실. 작업 브랜치 안에서 + dev `--no-ff` 강제 명시 |
| 5 | FRICTION_LOG 마지막 행 삽입 명시 | log-friction SKILL | 테이블 중간 삽입 실수 누적 → 마지막 행 다음 삽입 명시 (이미 정합) |
| 6+10 | CLAUDE.md 메인 세션 최상위 룰 신설 | CLAUDE.md | (6) 사용자 명시 범위 초과 (close 자체 진입 등) 마찰 + (10) 컴팩트 세션에서 Skill 도구 우회 마찰 → *범위 준수* + *Skill 정식 발동* 두 줄 최상위 룰 신설 |
| 7 | testing 전환 시점 명시 | task-test SKILL | testing 상태를 검증 완료 후 박는 패턴 마찰. 격리 세션 호출 *직전* 전환 명시 (이미 정합) |
| 8+9 | CHANGELOG_RULE.md 신설 | rules/CHANGELOG_RULE.md (신설) + task-close SKILL | CHANGELOG 위치/형식 미정의로 매번 메인 즉흥 결정. 룰 단일 진실 소스 신설 + task-close가 참조 |
| 11 | task-init 단계 경계 화이트/블랙리스트 | task-init SKILL | 빈 골격 단계에서 ARCHITECTURE / API-SPEC / 도메인 코드 미리 정독 → 단계 경계 무너짐. 허용 화이트리스트(ROADMAP §4 + ls tasks/ + 빈 골격 Write) + 금지 블랙리스트 명시 |
| 14+19 | task-test 본질 재설계 + HTML 목업 프로세스 | task-plan / dev / test / TASK-DOC / TASK_DOC_RULE / MOCKUP_RULE (신설) | 격리 세션이 단위 테스트 통째 PASS로 *가짜 PASS* → UI 시각 깨진 채 검수. Test Plan = 실질 동작 시나리오 (유닛 X) / `[AUTO]`/`[USER]` 분류 / HTML 목업 프로세스 (UX/UI task) / USER 검수 체크리스트 / 시각 fix 사이클 예고 / 신규 테스트 식별자 grep 확인 |
| 15+16+18 | 추측 fix 반복 방지 룰 | task-dev SKILL | 코드 fix를 추측으로 다회 시도 (4~16회 반복) → 시간 낭비 + 사용자 부정 반응 누적. 1회 실패 시 디버그 로그 / 동일 신고 재발 시 grep + blame + 진단 / 동명 property 의심 명시 |
| 17 | BACKLOG.md 자동 생성 | plan-init SKILL + AGENT-GUIDE | 버전별 후속 task 후보 누적 누락 마찰. `.project/tasks/<vX.X>/BACKLOG.md` 자동 생성 + AGENT-GUIDE 매 세션 읽기 항목 추가 (글로벌 BACKLOG와 별개) |
| 21+22 | 모호 발화 confirm 룰 | task-dev SKILL | 사용자 한 단어 발화가 복수 영역 매칭 시 자율 추정 강행 → 광범위 변경 후 rollback. *메인 자체 안 1개 + OK? 한 줄* confirm. 옵션 4개 늘어놓기 금지 |
| 25 | 검증/테스트 명령 섹션 분리 + pre-commit-verify hook 폐기 | CLAUDE.md + settings.json + hooks/ + 4 SKILL + HOOKS.md | 5 커밋 task 풀 검증 8회 (의도 2 + redundant 6) 시간 낭비. `## 검증 명령` (코드 상태) + `## 테스트 명령` (테스트 실행) 두 섹션 분리 + hook 폐기 + 4 스킬 정합. 테스트는 task-test 단일 시점 |
| 26 | .gitignore prompt + task-close gitignore commit 스킵 | bin/init.js + task-close SKILL | 공개 repo 정리 후 taskery 내부 파일(.project/.claude/CLAUDE.md) gitignore 등록 시 task-close가 빈 commit 실패. (A) bin/init.js scaffolding 후 인터랙티브 prompt (B) task-close Step 4-0 gitignore 감지 + 조건부 commit 스킵 |

**원리 변경 정리**:

- §5 결정 (3 hook catastrophic only → 2 hook): `pre-commit-verify` 폐기. 사유: task-close Step 2 게이트가 *동일 검증 명령 / 동일 working tree* 결정론적 redundant. *합리적 변형 차단 사고 회피* 원칙은 그대로 — process 영역도 *중복 시점이 catastrophic 가치 ε* 이면 폐기 정당.
- §9 결정 (task-test 격리): 격리 prompt가 *Test Plan 시나리오 기반* 으로 본질 재정의. 단위 테스트 카운트 자체 PASS 단정 X — *task 요구사항 실질 동작 검증*이 본질. confirmation bias 회피 정신 유지.

**대안 검토** (왜 부분 보강이 아닌 14건 묶음 정합인가):

| 대안 | 채택 X 이유 |
|------|-----------|
| 부분 보강 (#25 만 / #14+19 만) | cross-document 영향 큰 항목 (검증/테스트 명령 / task-test 본질) 단독 변경 시 다른 결정과 정합 깨짐 |
| 14건 모두 별도 task | task 14개 + 검수 14 사이클 = 시간 낭비. 의존성 작은 항목은 묶어 한 사이클 충분 |
| 14건 묶음 정합 (채택) | Phase 1~4 단위로 묶어 4 사이클 (룰 → 스킬 → hook/bin → 설계 지침). 검증 1 사이클 |

**채택 기준 정신** (기존 3 원칙 정합):

- 원칙 1 *Practice 자유 + 사용자 판단 신뢰*: USER 검수 흐름 도입 — 시각 영역은 자동 비교 X, 사용자 직접 검수
- 원칙 2 *Catastrophic만 hook*: pre-commit-verify 폐기 — catastrophic 가치 ε이면 폐기 정당
- 원칙 3 *Bottoms-up — 진짜 데이터 모이면 추가*: stash 17건 FRICTION_LOG 누적이 *진짜 데이터*. 사용자 직접 정독 후 14건 채택

**결과 위치**: 8 스킬 SKILL.md + plan/SKILLS.md + plan/TASK-DOC.md + plan/HOOKS.md + plan/OVERVIEW.md + CLAUDE.md + settings.json + bin/init.js + rules/CHANGELOG_RULE.md + rules/MOCKUP_RULE.md + rules/TASK_DOC_RULE.md + GIT_RULE.md

---

사이드 프로젝트 적용을 굴린 후 추가 짜증/한계 데이터 누적 시 본 섹션에 추가.

---

### 13.2. plan = 기능 그룹 재정의 (PLAYBOOK §13 본구현, 2026-06-27)

**트리거**: plan을 버전(vX.X) 단위로 둔 구조가 *버전 범프를 너무 무겁게* 만들어 plan-init이 사실상 1회성 죽은 스킬이 됨 — 모든 task가 첫 버전 폴더에만 누적. plan이 *두 축*(제품 스펙 스냅샷 + 작업 묶음 단위)을 겸한 것이 근본 원인.

**결정**: plan = **기능 그룹(작업 묶음) 단위**로 재정의. 제품 관통 문서 생성 책임을 plan-init → project-init으로 이관하고, 문서를 3분할.

| 결정 | 영역 | 사유 |
|------|------|------|
| 문서 3분할 (그룹 A 작성 / B 골격 / C plan 로컬) | project-init / plan-init SKILL | 제품 관통 문서(SERVICE-POLICY/TECH-STACK/ARCHITECTURE 작성 + DATA-MODEL/API-SPEC/FEATURES/UX-UI 골격)는 `.project/` 루트 평평. plan 폴더엔 PLAN.md/ROADMAP.md만. 기능 분류 = 루트 문서 섹션 구조가 단일 진실(plan 폴더로 역추적 X) |
| plan 폴더 `NNN_slug` 채번 | bin/lib.js `computeNextPlanNumber` + plan-init | TASK-NNN과 결 맞춘 3자리 채번. legacy(NNN 아닌) 폴더 감지 게이트 — 채번 공존 시 활성 plan 갈림 차단 |
| 분기 2(카피포워드) 폐기 | plan-init SKILL | 제품 문서가 루트 living이라 "이전 버전 통째 카피" 불필요. plan-init = 단일 흐름 |
| delta 깊이/시점 분리 | plan-init / task-plan / task-dev SKILL | plan-init은 FEATURES/UX-UI *의도 stub*만. DATA-MODEL/API-SPEC 스키마·엔드포인트 본문은 task가 *구현 동반*으로 채움(선기획 함정 회피, anti-waterfall 정합) |
| spec-diff = 변경된 *제품 문서(루트)* 추적 | TASK_DOC_RULE §1.5 | per-task 기록. 제품 문서의 정식 변경 이력은 git 단일 진실(별도 전역 인덱스 X) |
| closed-immutable 정규식 완화 | .claude/.codex hooks | `tasks/v[^/]+/` → `tasks/[^/]+/`. 폴더명이 `v`로 시작 강제이던 것을 한 세그먼트 매칭으로 완화 — NNN_slug 신규/구버전 모두 보호. spec-diffs 등 하위 세그먼트는 여전히 제외 |
| 제품 레벨 로드맵 = PROJECT.md 섹션 | project-init SKILL | 프로젝트 관통 거시 빌드 순서(구현/배포/보안)는 1회성이라 별도 living 파일 X. `PROJECT.md ## 초기 빌드 로드맵`에 둠 |

**결과 위치**: bin/lib.js + bin/init.js + project-init/plan-init/task-init/task-plan/task-dev/task-close/task-test/add-backlog SKILL.md + TASK_DOC_RULE/GIT_RULE/MOCKUP_RULE + CLAUDE.md/AGENTS.md + README.md + .claude/.codex hooks/closed-immutable.sh + plan/OVERVIEW·TASK-DOC·SKILLS·DISTRIBUTION·HOOKS·PLAYBOOK

---

## 14. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — 핵심 의사결정 11개 + 변경 이력 자리 |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 외부 부재 문서(RETROSPECTIVE.md) 참조 정리. 이전 버전 비교 본문은 결정 사유 설명 목적이므로 유지. |
| 2026-05-09 | §8 채택 명령 표 + WHY의 npx 명령 표기를 `@angar2/taskery`로 갱신 (npm 이름 충돌 해소). |
| 2026-05-10 | 스킬 8종 구조 마이그레이션 반영 — §9 task-test 결과 위치 + §11 5사이클 참조 부수 처리 라인의 `<name>.md`/`*.md` → `<name>/SKILL.md`/`*/SKILL.md` 갱신. (Claude Code 표준 스킬 구조 적용, 0.1.1 후보) |
| 2026-05-30 | stash FRICTION_LOG 기반 정합 — §5 결정 본문에 *2 hook 갱신* 명시 (pre-commit-verify 폐기) + §12 변경 이력에 *정합 결정 모음* 14건 신규 §12.1 추가. |
| 2026-05-30 | 정합 검증 후속 정정 (3차) — §12.1 #14+19 영향 표 + 결과 위치 본문에 `TASK_DOC_RULE.md` 누락분 추가 (양식 spec 단일 진실 소스 정합). |
| 2026-05-30 | 정합 검증 후속 정정 (3차 추가) — §6 분산 원칙 표 보강: 스킬 본문 path `<skill>.md` → `<skill>/SKILL.md` (디렉토리 구조 마이그레이션 정합) + CHANGELOG_RULE / MOCKUP_RULE 행 추가 (신설 룰 정합) + 검증 명령 행 옆에 *테스트 명령* 행 신설 (두 섹션 분리 정합). |
| 2026-05-31 | 정합 순회 1차 — §9 결정 본문 *8 스킬 중* → *9 스킬 중* 갱신 (0.1.2 add-backlog 스킬 추가 정합). 본 본문은 *현재 정신*을 명시하는 부분(시점 기록 X)이라 9 스킬로 갱신 필요. §12.1 결과 위치 본문은 *2026-05-30 stash 정합 시점 기록*이라 *8 스킬 SKILL.md* 그대로 유지(시점 기록 — 정정 X) |
| 2026-06-27 | PLAYBOOK §13(plan = 기능 그룹) 본구현 — §12.2 신규 추가 (문서 3분할 + NNN 채번 + 카피포워드 폐기 + delta 깊이 분리 + spec-diff 재정의 + closed-immutable 정규식 완화 + 제품 로드맵 = PROJECT.md 섹션). |
| 2026-06-28 | PLAYBOOK §12(task-test 오라클 강제) 본구현 — 신규 결정 §12 추가(오라클·시험문제 형태 강제·UNCERTAIN 2종·시각 캡처-목업 대조·상태전이 3갈래·TEST-GUIDE 신설). 기존 변경 이력 §12 → §13, 수정 이력 §13 → §14로 밀고 본문 교차참조(§12 변경 이력 → §13) 2곳 정정. 시점 기록(§13.1/§13.2 본문)은 그대로 유지. |
