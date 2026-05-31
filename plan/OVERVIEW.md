# OVERVIEW

> **본 리포 진입 문서**. 메인 세션 / 동료 / 미래 본인이 *맨 먼저 정독*.
> 핵심 원칙 + 큰 그림 + 디렉토리 + 단일 진실 소스 + plan/ 인덱스.

---

## 1. taskery 한 줄

Claude Code 메인 세션을 위한 *가벼운 task 시스템*.
**1 메인 세션(또는 멀티세션) + 스킬 9종 + catastrophic hook 2종 + npx 배포**로 구성. *practice 영역(SW 개발)을 process로 강제하지 않는다*는 한 가지 원칙으로 다듬어진 시스템.

---

## 2. 핵심 원칙 3개

| # | 원칙 | 의미 |
|---|------|------|
| 1 | *Process는 자동화 OK, Practice는 자유롭게 + 사용자 판단 신뢰* | 결정적 영역(린트/타입/빌드)만 강제, 휴리스틱 영역은 강제 X |
| 2 | *Catastrophic만 hook 차단, 형식 위반은 instruction + 대화* | 합리적 변형 차단 사고 회피 |
| 3 | *Top-down 선제적 작성 금지, bottoms-up — 진짜 데이터 모이면 그때 추가* | PLAYBOOK 카탈로그 + FRICTION_LOG 누적 후 사용자 직접 검토 |

**결정 사유 본문**: [DECISIONS.md](DECISIONS.md).

---

## 3. 큰 그림 — 4 영역

| 영역 | 정신 | 결과물 |
|------|------|------|
| **세션 모델** | 1 메인 세션 = 사용자 = 오케스트레이터 + 실행자. 같은 프로젝트 멀티세션 운영 시 작업 폴더(worktree) 격리 + 머지 락 직렬화 (0.1.2+) | 메인 세션 직접 호출 (서브에이전트는 옵션) |
| **흐름 표지** | 스킬 9종 — project > plan > task 위계 + 메타(백로그 누적 / 불편 등록) | `/project-init` ~ `/log-friction` |
| **안전망** | catastrophic only hook 2종 — git / 완료 보호 (process hook `pre-commit-verify` 폐기 — stash FRICTION_LOG #25) | `git-guard.sh` / `closed-immutable.sh` |
| **배포** | 단일 default = npx | `npx @angar2/taskery init` / `update` / `create-taskery` |

---

## 4. 디렉토리 구조

### 4-1. 본 리포 (`taskery/`)

```
taskery/                                  ← 본 리포 (시스템 자체)
├─ .gitignore                             ← 코어 (.temp/ 추적 제외 포함)
├─ package.json                           ← npm publish 메타
│
├─ plan/                                  ← 본 리포 spec / 결정 / 미래 옵션
│   ├─ OVERVIEW.md                       ← 본 문서 (진입점)
│   ├─ SKILLS.md                         ← 스킬 9종 명세 + 흐름
│   ├─ TASK-DOC.md                       ← 태스크 위계 + 양식 + 7 상태
│   ├─ HOOKS.md                          ← 2 catastrophic hook 정책
│   ├─ DISTRIBUTION.md                   ← npx 배포 + bin/ + manifest
│   ├─ DECISIONS.md                      ← 핵심 의사결정 (단일 진실 소스)
│   └─ PLAYBOOK.md                       ← 미래 옵션 카탈로그
│
├─ bin/                                   ← npx 진입점 (7 스크립트)
│   ├─ lib.js                            ← 공통 유틸 (멀티세션 + 백로그 유틸 포함)
│   ├─ taskery.js                        ← dispatcher
│   ├─ init.js                           ← npx @angar2/taskery init
│   ├─ create.js                         ← npx -p @angar2/taskery create-taskery
│   ├─ update.js                         ← npx @angar2/taskery update
│   ├─ status.js                         ← npx @angar2/taskery status (멀티세션 0.1.2+)
│   └─ prune.js                          ← npx @angar2/taskery prune (멀티세션 0.1.2+)
│
└─ template/                              ← 사용자 프로젝트로 카피되는 자산 (코어 25 파일)
    ├─ CLAUDE.md                         ← 사용자 프로젝트 메인 진입점
    ├─ .gitignore                        ← .project/.env 등 포함
    ├─ .claude/
    │   ├─ settings.json                 ← Claude Code hook 등록 (PreToolUse 매칭)
    │   ├─ skills/                       ← 9 스킬 본문 (add-backlog 포함, 0.1.2+)
    │   └─ hooks/                        ← 2 catastrophic 안전망
    └─ .project/
        ├─ FRICTION_LOG.md               ← 불편 누적 빈 템플릿
        ├─ rules/                        ← 코어 룰 (TASK_DOC_RULE / GIT_RULE / CHANGELOG_RULE / MOCKUP_RULE)
        ├─ changelog/.gitkeep            ← 사용자 영역 빈 골격 (/task-close 갱신)
        ├─ flows/.gitkeep                ← 사용자 영역 빈 골격 (/task-dev 갱신)
        ├─ plans/.gitkeep                ← 사용자 영역 빈 골격 (/plan-init이 vX.X/ 작성)
        ├─ tasks/.gitkeep                ← 사용자 영역 빈 골격 (/plan-init이 vX.X/BACKLOG.md 빈 골격 + /task-init이 <NNN>_<slug>.md 작성)
        └─ shared/                       ← 멀티리포 메시지 디렉토리
            ├─ sent/
            │   └─ completed/.gitkeep    ← 처리 완료 송신 메시지 보관
            └─ received/
                └─ completed/.gitkeep    ← 처리 완료 수신 메시지 보관
```

### 4-2. 사용자 프로젝트 (`npx @angar2/taskery init` 후)

```
my-app/                                   ← 사용자 프로젝트
├─ CLAUDE.md                              ← template/CLAUDE.md 카피 (메인 세션 진입)
├─ .taskery-manifest.json                 ← init.js 동적 생성 (hidden 단일 파일)
├─ .gitignore                             ← template/.gitignore 카피
│
├─ .claude/                               ← 코어 (npx 갱신)
│   ├─ settings.json                     ← hook 등록 (PreToolUse 매칭)
│   ├─ skills/ (9)
│   └─ hooks/ (2)
│
├─ .project/                              ← 사용자 영역
│   ├─ PROJECT.md                        ← /project-init 생성
│   ├─ AGENT-GUIDE.md                    ← /project-init 생성
│   ├─ LINKED-REPOS.md                   ← /project-init 생성
│   ├─ GLOSSARY.md                       ← /project-init 생성 (도메인 용어집, stash FRICTION_LOG #3)
│   ├─ .env                              ← 사용자 직접 (멀티리포 환경 변수)
│   ├─ rules/
│   │   ├─ TASK_DOC_RULE.md              ← 코어 (npx 갱신, *.bak 백업)
│   │   ├─ GIT_RULE.md                   ← 코어 (npx 갱신)
│   │   ├─ CHANGELOG_RULE.md             ← 코어 (npx 갱신)
│   │   ├─ MOCKUP_RULE.md                ← 코어 (npx 갱신)
│   │   └─ *.local.md                    ← (옵션) 사용자 오버라이드 (npx 미갱신)
│   ├─ plans/                            ← .gitkeep (template에서) → /plan-init이 vX.X/ + 기획 문서 작성
│   ├─ tasks/                            ← .gitkeep (template에서) → /plan-init이 vX.X/BACKLOG.md 빈 골격 + /task-init이 <NNN>_<slug>.md 작성
│   ├─ flows/                            ← .gitkeep (template에서) → /task-dev이 <module>.md 작성
│   ├─ changelog/                        ← .gitkeep (template에서) → /task-close가 <YYYY-MM>.md 작성
│   ├─ shared/                           ← 멀티리포 메시지
│   │   ├─ sent/
│   │   │   └─ completed/                ← 처리 완료 송신 메시지 보관
│   │   └─ received/
│   │       └─ completed/                ← 처리 완료 수신 메시지 보관
│   └─ FRICTION_LOG.md                   ← 불편 누적 (template에서 빈 템플릿)
│
├─ src/ ...                               ← 사용자 코드
└─ package.json                           ← 사용자 프로젝트
```

---

## 5. 핵심 결정 요약 (왜 이 구조인가)

| 결정 | WHY 한 줄 | 본문 |
|------|---------|------|
| 1 메인 세션 | practice 영역에 분담 강제 X | [DECISIONS §3](DECISIONS.md) |
| 7 상태 (-ing/-ed 페어) | revision은 *흐름*, *상태* X. 대화로 OK = 자동 전이 | [DECISIONS §4](DECISIONS.md) |
| catastrophic only hook | 합리적 변형 차단 사고 회피 | [DECISIONS §5](DECISIONS.md) |
| 분산 spec (template/ + plan/ + bin/) | 모순 누적 차단 | [DECISIONS §6](DECISIONS.md) |
| 자동 빌드 X | 자동 동기화 = 또 다른 source of truth = 모순 | [DECISIONS §7](DECISIONS.md) |
| 배포 = npx | Node.js 진입장벽 0 + 머지 갱신 자동화 | [DECISIONS §8](DECISIONS.md) |
| `/task-test`만 1차 default 격리 | confirmation bias 회피 + 컨텍스트 절감 균형 | [DECISIONS §9](DECISIONS.md) |
| PLAYBOOK 카탈로그 (top-down 선제적 작성 금지) | *선제적 일괄 작성* 함정 회피 | [DECISIONS §10](DECISIONS.md) |

---

## 6. 단일 진실 소스 — 어느 spec이 어디에 위치하나

각 정보는 *한 곳에만* 위치. 다른 곳은 link만.

| 정보 | 단일 진실 소스 |
|------|--------------|
| 스킬 본문 (Step 1~N) | [template/.claude/skills/<skill>/SKILL.md](../template/.claude/skills/) (9 디렉토리) |
| Hook 본문 + 정규식 | [template/.claude/hooks/<hook>.sh](../template/.claude/hooks/) (2 파일 — `git-guard.sh` / `closed-immutable.sh`. `pre-commit-verify.sh` 폐기) |
| Hook 등록 (Claude Code PreToolUse 매칭) | [template/.claude/settings.json](../template/.claude/settings.json) |
| 태스크 양식 + 4단 layer + 완성 예시 3개 | [template/.project/rules/TASK_DOC_RULE.md](../template/.project/rules/TASK_DOC_RULE.md) |
| 프로젝트별 git 룰 | [template/.project/rules/GIT_RULE.md](../template/.project/rules/GIT_RULE.md) → `~/.claude/rules/GIT_RULE.md` (글로벌 fallback) |
| CHANGELOG 작성 룰 | [template/.project/rules/CHANGELOG_RULE.md](../template/.project/rules/CHANGELOG_RULE.md) |
| UX/UI HTML 목업 룰 | [template/.project/rules/MOCKUP_RULE.md](../template/.project/rules/MOCKUP_RULE.md) |
| 검증 명령 (사용자 프로젝트 — 코드 상태) | 사용자 프로젝트 `CLAUDE.md` `## 검증 명령` (빌드/린트/타입체크) |
| 테스트 명령 (사용자 프로젝트 — 테스트 실행) | 사용자 프로젝트 `CLAUDE.md` `## 테스트 명령` (단위/통합/E2E) |
| manifest 구조 + 머지 로직 | [bin/lib.js](../bin/lib.js) + [bin/init.js](../bin/init.js) + [bin/update.js](../bin/update.js) |
| 미래 옵션 카탈로그 | [plan/PLAYBOOK.md](PLAYBOOK.md) |
| 핵심 의사결정 사유 | [plan/DECISIONS.md](DECISIONS.md) |

**원칙**: plan/ 토픽 doc은 *상위 추상 + 영역 정신 + link*. 본문 spec은 *실제 구현 파일*에서 정독.

---

## 7. 문서 인덱스

### plan/ 7 문서

| 문서 | 다루는 영역 | 정독 시점 |
|------|----------|---------|
| [OVERVIEW.md](OVERVIEW.md) (본 문서) | 진입 + 정신 + 큰 그림 + 디렉토리 + 단일 진실 소스 + 인덱스 | **메인 세션 진입 시 맨 먼저** |
| [DECISIONS.md](DECISIONS.md) | 핵심 의사결정 + 변경 이력 (단일 진실 소스) | *왜 이렇게 결정?* 궁금할 때 |
| [SKILLS.md](SKILLS.md) | 스킬 9종 명세 + 흐름 + 컨텍스트 관리 | 작업 시작 / 스킬 동작 의문 시 |
| [TASK-DOC.md](TASK-DOC.md) | 태스크 위계 + 양식 + 7 상태 + 4단 layer 가이드 | task 작성 / 상태 전이 의문 시 |
| [HOOKS.md](HOOKS.md) | 2 catastrophic hook 정책 + 우회 절차 | hook 차단 발생 시 / 우회 필요 시 |
| [DISTRIBUTION.md](DISTRIBUTION.md) | npx 배포 + bin/ + manifest 머지 로직 | 사용자 프로젝트 셋업 / npx update / publish 시 |
| [PLAYBOOK.md](PLAYBOOK.md) | 미래 옵션 카탈로그 (bottoms-up 부활 카탈로그) | 사용자 직접 정독 시 |

### 사용자 프로젝트 자산 (template/ 카피 후)

| 자료 | 위치 | 용도 |
|------|------|------|
| 사용자 프로젝트 메인 진입점 | `<user-project>/CLAUDE.md` | 메인 세션 자동 정독 (검증 명령 + 룰 참조 + 스킬 9종) |
| 스킬 본문 | `<user-project>/.claude/skills/*/SKILL.md` | 스킬 호출 시 메인이 정독 |
| Hook | `<user-project>/.claude/hooks/*.sh` | Claude Code PreToolUse 자동 실행 |
| task 양식 룰 | `<user-project>/.project/rules/TASK_DOC_RULE.md` | task 작성 시 메인이 정독 |
| git 룰 | `<user-project>/.project/rules/GIT_RULE.md` | git 작업 시 메인이 정독 |

---

## 8. 메인 세션 진입 가이드

**본 리포(taskery)에서 작업 시 정독 순서**:

1. **본 OVERVIEW.md** — 큰 그림 + 단일 진실 소스 + 인덱스
2. 작업 영역에 따라 → 해당 plan/ 토픽 doc 정독
   - 스킬 작업 시 → [SKILLS.md](SKILLS.md)
   - 태스크 양식 작업 시 → [TASK-DOC.md](TASK-DOC.md)
   - hook 작업 시 → [HOOKS.md](HOOKS.md)
   - bin/ 작업 시 → [DISTRIBUTION.md](DISTRIBUTION.md)
3. *결정 사유* 의문 → [DECISIONS.md](DECISIONS.md)
4. 본문 spec 변경 → 실 구현 파일 (template/ 또는 bin/)에서 직접 Edit. plan/ doc은 *상위 추상*만이므로 spec 본문 변경 시 *동시 갱신* 의무.

**사용자 프로젝트에서 작업 시 정독 순서** (npx @angar2/taskery init 후):

1. `<user-project>/CLAUDE.md` (메인 세션 자동 정독)
2. `<user-project>/.project/AGENT-GUIDE.md` (활성 plan 버전 + 폴더 구조)
3. `<user-project>/.project/plans/<활성버전>/PLAN.md` (기획 문서 진입)
4. 스킬 호출 시 메인이 해당 `<user-project>/.claude/skills/<skill>/SKILL.md` 정독

**글로벌 룰** (`~/.claude/CLAUDE.md`)은 모든 세션에서 자동 적용 — 사용자 닉네임 / 반말 대화 / md 수정 이력 의무 등.

---

## 9. 현재 상태 + 남은 작업

> 본 섹션은 *0.1.0 부트스트랩 시점*의 상태 + 남은 작업 기록. 그 후 진척(0.1.0 publish / 0.1.1 / [Unreleased] 0.1.2 멀티세션 + 백로그 등)은 [CHANGELOG.md](../CHANGELOG.md)가 단일 진실 소스. 본 본문은 *역사적 시점 기록*으로 보존.

**완료** (0.1.0 부트스트랩 시점):
- ✅ 부트스트랩 — plan/ 7 문서 + bin/ 5 스크립트 + template/ 24 파일
- ✅ spec 정합성 audit 안정화
- ✅ smoke test 1회 — notepad-todo 10 task / 47 commit / test 31/31 PASS
- ✅ smoke test follow-up fix 4건 (catastrophic 1 + 가이드 명확화 3)

**남은 작업 — npm publish 전** (0.1.0 시점 기록 — 모두 완료됨, 0.1.0 publish 2026-05-09 [CHANGELOG.md](../CHANGELOG.md) 참조):
- 🟡 `README.md` 작성 (npm 페이지 본문)
- 🟡 `bin/taskery.js` GitHub URL placeholder 교체
- 🟡 `package.json` metadata 점검 (description / keywords / repository / author)
- 🟡 `LICENSE` 작성 (권장 — MIT 등)

**publish 진행**: 사용자 명시 트리거 시. 이후 0.1.1 / 0.1.2 minor 보강 누적은 CHANGELOG 단일 진실 소스 참조.

---

## 10. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — 진입 문서 |
| 2026-05-08 | settings.json 추가 반영 — §4 디렉토리 구조 + §6 단일 진실 소스 표 |
| 2026-05-08 | 사용자 영역 빈 골격 4 .gitkeep 추가 반영 |
| 2026-05-09 | 외부 비교 자료 / 배경 단락 정리 — 비교/배경은 [DECISIONS.md](DECISIONS.md)로 통합. shared/ 하위 폴더 구조 표시. §10 현재 상태 갱신 (smoke test + follow-up fix 반영) |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 정정 (DECISIONS.md 외) |
| 2026-05-09 | npm 패키지명 `@angar2/taskery`로 변경 (이름 충돌 해소) — npx/npm 명령 표기 갱신. 프로젝트 정체성 호칭은 *taskery* 그대로 유지. |
| 2026-05-10 | 스킬 8종 구조 마이그레이션 반영 — §6 단일 진실 소스 표 + §7 사용자 프로젝트 자산 표 + §8 정독 순서 라인 `<skill>.md` → `<skill>/SKILL.md` 갱신. (Claude Code가 npx init 후 스킬을 인식 못 하던 동작 버그 해결, 0.1.1 후보) |
| 2026-05-30 | stash FRICTION_LOG 기반 정합 — §3 안전망 hook 3종 → 2종 (`pre-commit-verify` 폐기) + §6 단일 진실 소스 표에 CHANGELOG_RULE / MOCKUP_RULE 추가 + 검증/테스트 명령 두 섹션 분리 명시. |
| 2026-05-30 | 정합 검증 후속 정정 (Phase 5) — §1 / §3 / §4 / §7 본문·도식에 잔존한 *hook 3종* / *catastrophic 3* 표기를 2종으로 갱신 + §4 / §10 *코어 23 파일* → *24 파일* (CHANGELOG_RULE / MOCKUP_RULE 신설 반영, pre-commit-verify.sh 삭제). |
| 2026-05-31 | 0.1.2 멀티세션 + 백로그 정합 누락 일괄 정정 (정합 순회 1차) — §1 *1 메인 세션*만 표기 → *1 메인 세션(또는 멀티세션)* + 워크트리 격리 명시 / §3 흐름 표지 *스킬 8종* → *9종 + 메타 그룹(백로그 누적 / 불편 등록)* / §4-1 본 리포 *bin/ 5 스크립트* → *7 스크립트* (status.js / prune.js 추가) + *코어 24 파일* → *25 파일* (add-backlog 신설) + skills/ *(8)* → *(9)* + rules/ 본문에 CHANGELOG_RULE / MOCKUP_RULE 명시 + tasks/ 캡션에 vX.X/BACKLOG.md plan-init 생성 명시 / §4-2 사용자 프로젝트 디렉토리 구조에 GLOSSARY.md / CHANGELOG_RULE / MOCKUP_RULE 본문 추가 + skills/ (8) → (9) + tasks/ 캡션 plan-init BACKLOG 명시 / §6 단일 진실 소스 표 *(8 디렉토리)* → *(9 디렉토리)* / §7 plan 문서 인덱스 SKILLS.md 캡션 *8종* → *9종* / §7 사용자 프로젝트 자산 표 메인 진입점 *스킬 8종* → *9종*. 단순 수치 정합, 행위 변경 X |
| 2026-05-31 | 정합 순회 3차 — §9 *현재 상태 + 남은 작업* 본문에 *0.1.0 부트스트랩 시점 기록* 명시 박스 추가 (그 후 진척은 CHANGELOG.md 단일 진실 소스 link). *남은 작업 publish-prep 4 항목*도 *0.1.0 시점 기록, 모두 완료됨*으로 시점 명시. 행위 변경 X — 시점 기록 보존 + 단일 진실 소스 명시 |
