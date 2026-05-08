# OVERVIEW — taskery v0.2

> **본 리포 진입 문서**. 메인 세션 / 동료 / 미래 본인이 *맨 먼저 정독*.
> v0.2 정신 + 큰 그림 + 디렉토리 + 단일 진실 소스 + plan/ 인덱스.

---

## 1. 한 줄 요약

**taskery v0.2** = Claude Code 메인 세션을 위한 *가벼운 task 시스템*. **1 메인 세션 + 슬래시 8종 + catastrophic hook 3종 + npx 배포**. 5사이클 회귀(9 에이전트 + 화이트리스트 hook 강제)를 폐기하고 *무게를 대폭 낮춘* 시제품.

**버전**: 0.2.0 (publish 전)
**상태**: v0.2 부트스트랩 완료, C11(사이드 프로젝트 적용) 대기

---

## 2. v0.2 정신 (3 핵심 원칙)

| # | 원칙 | 의미 |
|---|------|------|
| 1 | *Process는 자동화 OK, Practice는 자유롭게 + 사용자 판단 신뢰* | 결정적 영역(린트/타입/빌드)만 강제, 휴리스틱 영역은 강제 X |
| 2 | *Catastrophic만 hook 차단, 형식 위반은 instruction + 대화* | 합리적 변형 차단 사고 회피 (5사이클 함정의 핵심) |
| 3 | *Top-down 미리 박지 X, bottoms-up — 진짜 데이터 모이면 그때 추가* | PLAYBOOK 카탈로그 + FRICTION_LOG 패턴 ≥ 3회 트리거 |

**왜 이 정신인가** — 5사이클 회귀 5번 끝에 *practice를 process로 강제한 임피던스 미스매치*가 결함이라는 결론. → [DECISIONS.md](DECISIONS.md) + [RETROSPECTIVE.md](../RETROSPECTIVE.md)

---

## 3. 큰 그림 — 4 영역

| 영역 | 정신 | 결과물 |
|------|------|------|
| **세션 모델** | 1 메인 세션 = 사용자 = 오케스트레이터 + 실행자. 9 에이전트 분담 폐기 | 메인 세션 직접 호출 (서브에이전트는 옵션) |
| **흐름 표지** | 슬래시 8종 — project > plan > task 위계 + 회고 메타 | `/project-init` ~ `/refine` |
| **안전망** | catastrophic only hook 3종 — process / git / 완료 보호 | `pre-commit-verify.sh` / `git-guard.sh` / `closed-immutable.sh` |
| **배포** | 단일 default = npx | `npx taskery init` / `update` / `create-taskery` |

**대조표 — 5사이클(v0.1.0) vs v0.2**:

| 영역 | v0.1.0 (5사이클 — 폐기) | v0.2 (현재) |
|------|--------------------|-----------|
| 에이전트 | 9개 강제 핸드오프 | 1 메인 세션 |
| 슬래시 | (없음) | 8종 (project/plan/task/refine) |
| Hook | 3 화이트리스트 (practice 영역) | 3 catastrophic (process/git/완료 보호) |
| 상태 | 11 상태 (revision/approved 포함) | 7 상태 (-ing/-ed 페어) |
| 헤더 컬럼 | 6 (생성일/프로젝트/규모/유형/우선순위/상태) | 5 (생성일/플랜/유형/규모/상태) |
| 빌드 | extract-spec.js + IDEMPOTENT 해시 | 폐기 — 사용자 직접 동기화 |
| 배포 | (없음) | npx (init/update/create-taskery) |
| 5사이클 자산 | 본 리포 archive/ | `taskery-prototype` 리포 보존 |

---

## 4. 5사이클 v0.1.0 폐기 (간략)

5사이클 회귀의 핵심 결함:
- *각 에이전트가 자기 영역만 만지는* 분담 강제 = process로 practice 강제
- *25행 화이트리스트 검증 hook* = 합리적 변형 차단 → 합리적 작업이 막힘
- *단일 거대 spec*(`project-system-plan.md` 1500+행) = 한 곳 수정 → 다른 곳과 모순

**v0.2 해결**:
- 1 메인 세션 + 슬래시 8종 (분담 폐기)
- catastrophic only hook 3종 (practice 영역 강제 폐기)
- 분산 spec (template/ + plan/ + bin/)

**상세 회고 본문**: [RETROSPECTIVE.md](../RETROSPECTIVE.md) (root, 307행 — 5사이클 회귀 시간순 + 진단 4개 + 깨달음)

**v0.2 결정 사유 본문**: [DECISIONS.md](DECISIONS.md) (의사결정 11개 + 변경 이력)

**5사이클 9 에이전트 spec / 3 hook 자산**: 본 리포 X — `taskery-prototype` 리포에서 정독.

---

## 5. 디렉토리 구조

### 5-1. 본 리포 (`taskery/`)

```
taskery/                                  ← 본 리포 (v0.2 시스템 자체)
├─ .gitignore                             ← 코어 (.temp/ 추적 제외 포함)
├─ RETROSPECTIVE.md                       ← 5사이클 회고 (root)
├─ package.json                           ← npm publish 메타
│
├─ plan/                                  ← 본 리포 spec / 결정 / 미래 옵션
│   ├─ OVERVIEW.md                       ← 본 문서 (진입점)
│   ├─ SLASH-COMMANDS.md                 ← 슬래시 8종 명세 + 흐름
│   ├─ TASK-DOC.md                       ← 태스크 위계 + 양식 + 7 상태
│   ├─ HOOKS.md                          ← 3 catastrophic hook 정책
│   ├─ DISTRIBUTION.md                   ← npx 배포 + bin/ + manifest
│   ├─ DECISIONS.md                      ← 핵심 의사결정 11개 (단일 진실 소스)
│   └─ PLAYBOOK.md                       ← 미래 옵션 9 항목
│
├─ bin/                                   ← npx 진입점 (5 스크립트)
│   ├─ lib.js                            ← 공통 유틸
│   ├─ taskery.js                        ← dispatcher
│   ├─ init.js                           ← npx taskery init
│   ├─ create.js                         ← npx create-taskery
│   └─ update.js                         ← npx taskery update
│
└─ template/                              ← 사용자 프로젝트로 카피되는 자산 (코어 19 파일)
    ├─ CLAUDE.md                         ← 사용자 프로젝트 메인 진입점
    ├─ .gitignore                        ← .project/.env 등 박힘
    ├─ .claude/
    │   ├─ settings.json                 ← Claude Code hook 등록 (PreToolUse 매칭)
    │   ├─ skills/                       ← 8 슬래시 본문
    │   └─ hooks/                        ← 3 catastrophic 안전망
    └─ .project/
        ├─ FRICTION_LOG.md               ← 짜증 누적 빈 템플릿
        ├─ rules/
        │   ├─ TASK_DOC_RULE.md          ← task 양식 spec (4단 layer)
        │   └─ GIT_RULE.md               ← 프로젝트별 git 정책
        └─ shared/                       ← 멀티리포 메시지 빈 골격
```

### 5-2. 사용자 프로젝트 (`npx taskery init` 후)

```
my-app/                                   ← 사용자 프로젝트
├─ CLAUDE.md                              ← template/CLAUDE.md 카피 (메인 세션 진입)
├─ .taskery-manifest.json                 ← init.js 동적 생성 (hidden 단일 파일)
├─ .gitignore                             ← template/.gitignore 카피
│
├─ .claude/                               ← 코어 (npx 갱신)
│   ├─ settings.json                     ← hook 등록 (PreToolUse 매칭)
│   ├─ skills/ (8)
│   └─ hooks/ (3)
│
├─ .project/                              ← 사용자 영역
│   ├─ PROJECT.md                        ← /project-init 생성
│   ├─ AGENT-GUIDE.md                    ← /project-init 생성
│   ├─ LINKED-REPOS.md                   ← /project-init 생성
│   ├─ .env                              ← 사용자 직접 (멀티리포 환경 변수)
│   ├─ rules/
│   │   ├─ TASK_DOC_RULE.md              ← 코어 (npx 갱신, *.bak 백업)
│   │   ├─ GIT_RULE.md                   ← 코어 (npx 갱신)
│   │   └─ *.local.md                    ← (옵션) 사용자 오버라이드 (npx 미터치)
│   ├─ plans/<vX.X>/                     ← /plan-init 생성 (9 기획 문서)
│   ├─ tasks/<vX.X>/                     ← /task-init ~ /task-close 생성/갱신
│   ├─ flows/<module>.md                 ← /task-dev 갱신 (도메인 흐름)
│   ├─ shared/                           ← 멀티리포 메시지 (template에서 빈 골격)
│   ├─ changelog/<YYYY-MM>.md            ← /task-close 갱신
│   └─ FRICTION_LOG.md                   ← 짜증 누적 (template에서 빈 템플릿)
│
├─ src/ ...                               ← 사용자 코드
└─ package.json                           ← 사용자 프로젝트
```

---

## 6. 핵심 결정 요약 (왜 이 구조인가)

| 결정 | WHY 한 줄 | 본문 |
|------|---------|------|
| 9 에이전트 폐기 → 1 메인 세션 | practice 영역 분담이 5사이클 함정의 본질 | [DECISIONS §3](DECISIONS.md#3-결정-9-에이전트-강제-핸드오프-폐기--1-메인-세션) |
| 11 상태 → 7 상태 | revision은 *흐름*, *상태* X. 대화로 OK = 자동 전이 | [DECISIONS §4](DECISIONS.md#4-결정-11-상태--7-상태) |
| Practice hook → catastrophic only hook | 합리적 변형 차단 사고 회피 | [DECISIONS §5](DECISIONS.md#5-결정-3-hook-화이트리스트practice--3-hook-catastrophic-onlyprocess--git--완료-보호) |
| 단일 거대 spec → 분산 | 모순 누적 차단 | [DECISIONS §6](DECISIONS.md#6-결정-단일-거대-spec--분산-template--plan) |
| extract-spec.js 빌드 폐기 | 자동 동기화 = 또 다른 source of truth = 모순 | [DECISIONS §7](DECISIONS.md#7-결정-extract-specjs-빌드--idempotent-해시--폐기) |
| 배포 = npx | Node.js 진입장벽 0 + 머지 갱신 자동화 | [DECISIONS §8](DECISIONS.md#8-결정-배포--npx-단일-default) |
| `/task-test`만 1차 default 격리 | confirmation bias 회피 + 컨텍스트 절감 균형 | [DECISIONS §9](DECISIONS.md#9-결정-task-tool-격리는-task-test만-1차-default) |
| PLAYBOOK 카탈로그 (top-down 미리 박지 X) | 5사이클의 *미리 다 박음* 함정 회피 | [DECISIONS §10](DECISIONS.md#10-결정-playbook-카탈로그-top-down-미리-박지-x-bottoms-up) |
| archive 본 리포 X — taskery-prototype 보존 | 동일 자산 두 곳 중복 회피 | [DECISIONS §11](DECISIONS.md#11-결정-archive-5사이클-자산-본-리포-x--taskery-prototype-보존) |

---

## 7. 단일 진실 소스 — 어느 spec이 어디에 박혀 있나

각 정보는 *한 곳에만* 박힘. 다른 곳은 link만.

| 정보 | 단일 진실 소스 |
|------|--------------|
| 슬래시 본문 (Step 1~N) | [template/.claude/skills/<slash>.md](../template/.claude/skills/) (8 파일) |
| Hook 본문 + 정규식 | [template/.claude/hooks/<hook>.sh](../template/.claude/hooks/) (3 파일) |
| Hook 등록 (Claude Code PreToolUse 매칭) | [template/.claude/settings.json](../template/.claude/settings.json) |
| 태스크 양식 + 4단 layer + 완성 예시 3개 | [template/.project/rules/TASK_DOC_RULE.md](../template/.project/rules/TASK_DOC_RULE.md) |
| 프로젝트별 git 룰 | [template/.project/rules/GIT_RULE.md](../template/.project/rules/GIT_RULE.md) → `~/.claude/rules/GIT_RULE.md` (글로벌 fallback) |
| 검증 명령 (사용자 프로젝트) | 사용자 프로젝트 `CLAUDE.md` `## 검증 명령` |
| manifest 구조 + 머지 로직 | [bin/lib.js](../bin/lib.js) + [bin/init.js](../bin/init.js) + [bin/update.js](../bin/update.js) |
| 미래 옵션 9 항목 | [plan/PLAYBOOK.md](PLAYBOOK.md) |
| v0.2 결정 사유 11개 | [plan/DECISIONS.md](DECISIONS.md) |
| 5사이클 회고 본문 | [RETROSPECTIVE.md](../RETROSPECTIVE.md) (root) |
| 5사이클 9 에이전트 spec | **외부**: `taskery-prototype` 리포 |

**원칙**: plan/ 토픽 doc은 *상위 추상 + 영역 정신 + link*. 본문 spec은 *실제 구현 파일*에서 읽는다.

---

## 8. 문서 인덱스 — plan/ 폴더 + 외부 참조

### plan/ 7 문서

| 문서 | 다루는 영역 | 정독 시점 |
|------|----------|---------|
| [OVERVIEW.md](OVERVIEW.md) (본 문서) | 진입 + 정신 + 큰 그림 + 디렉토리 + 단일 진실 소스 + 인덱스 | **메인 세션 진입 시 맨 먼저** |
| [DECISIONS.md](DECISIONS.md) | v0.2 핵심 의사결정 11개 + 변경 이력 (단일 진실 소스) | *왜 이렇게 결정?* 궁금할 때 |
| [SLASH-COMMANDS.md](SLASH-COMMANDS.md) | 슬래시 8종 명세 + 흐름 + 컨텍스트 관리 | 작업 시작 / 슬래시 동작 의문 시 |
| [TASK-DOC.md](TASK-DOC.md) | 태스크 위계 + 양식 + 7 상태 + 4단 layer 가이드 | task 작성 / 상태 전이 의문 시 |
| [HOOKS.md](HOOKS.md) | 3 catastrophic hook 정책 + 우회 절차 | hook 차단 발생 시 / 우회 필요 시 |
| [DISTRIBUTION.md](DISTRIBUTION.md) | npx 배포 + bin/ + manifest 머지 로직 | 사용자 프로젝트 셋업 / npx update / publish 시 |
| [PLAYBOOK.md](PLAYBOOK.md) | 미래 옵션 9 항목 (bottoms-up 부활 카탈로그) | `/refine` 회고 시 |

### 외부 참조

| 자료 | 위치 | 용도 |
|------|------|------|
| 5사이클 회고 | [../RETROSPECTIVE.md](../RETROSPECTIVE.md) | v0.2 정신의 *근거 — 어디서 망했나* |
| 5사이클 9 에이전트 spec | `taskery-prototype` 리포 | 시제품 학습 자료 (본 리포에 archive 보존 X) |
| 5사이클 3 hook spec | `taskery-prototype/.taskestra/hooks/` | 폐기 hook 본문 (학습 자료) |
| 원 v0.2 plan 본문 | `~/.claude/plans/abundant-petting-conway.md` (38KB, 14 섹션) | 부트스트랩 결정 시점의 raw plan (역사적 자료) |
| 부트스트랩 결과 보고서 | `.temp/BUILD_RESULT.md` (gitignore) | C1~C10 청크별 + 검증 + minor 5건 (다음 세션에 안 따라옴) |

### 사용자 프로젝트 자산 (template/ 카피 후)

| 자료 | 위치 | 용도 |
|------|------|------|
| 사용자 프로젝트 메인 진입점 | `<user-project>/CLAUDE.md` | 메인 세션 자동 정독 (검증 명령 + 룰 참조 + 슬래시 8종) |
| 슬래시 본문 | `<user-project>/.claude/skills/*.md` | 슬래시 호출 시 메인이 정독 |
| Hook | `<user-project>/.claude/hooks/*.sh` | Claude Code PreToolUse 자동 실행 |
| task 양식 룰 | `<user-project>/.project/rules/TASK_DOC_RULE.md` | task 작성 시 메인이 정독 |
| git 룰 | `<user-project>/.project/rules/GIT_RULE.md` | git 작업 시 메인이 정독 |

---

## 9. 메인 세션 진입 가이드

**본 리포(taskery)에서 작업 시 정독 순서**:

1. **본 OVERVIEW.md** — 큰 그림 + 단일 진실 소스 + 인덱스
2. 작업 영역에 따라 → 해당 plan/ 토픽 doc 정독
   - 슬래시 만지면 → [SLASH-COMMANDS.md](SLASH-COMMANDS.md)
   - 태스크 양식 만지면 → [TASK-DOC.md](TASK-DOC.md)
   - hook 만지면 → [HOOKS.md](HOOKS.md)
   - bin/ 만지면 → [DISTRIBUTION.md](DISTRIBUTION.md)
3. *결정 사유* 의문 → [DECISIONS.md](DECISIONS.md)
4. 본문 spec 변경 → 실 구현 파일 (template/ 또는 bin/)에서 직접 Edit. plan/ doc은 *상위 추상*만이므로 spec 본문 변경 시 *동시 갱신* 의무.

**사용자 프로젝트에서 작업 시 정독 순서** (npx taskery init 후):

1. `<user-project>/CLAUDE.md` (메인 세션 자동 정독)
2. `<user-project>/.project/AGENT-GUIDE.md` (활성 plan 버전 + 폴더 구조)
3. `<user-project>/.project/plans/<활성버전>/PLAN.md` (9 기획 문서 진입)
4. 슬래시 호출 시 메인이 해당 `<user-project>/.claude/skills/<slash>.md` 정독

**글로벌 룰** (`~/.claude/CLAUDE.md`)은 모든 세션에서 자동 적용 — 사용자 닉네임(지크) / 반말 대화 / md 수정 이력 의무 등.

---

## 10. 현재 상태 + 남은 작업

**완료** (v0.2 부트스트랩):
- ✅ §13 마이그레이션 step 1~5 (rename + init + RETROSPECTIVE 카피 + archive 정리 + plan/template 작성)
- ✅ §10 후속 결정 6항목 (슬래시 8종 / hook 3종 / bin/ / TASK_DOC_RULE / 격리 prompt / archive 이행)
- ✅ git commit 9개 (`8698eb7` ~ `d8e3105`)
- ✅ template/ 18 파일 (npx init 카피 대상) + bin/ 5 스크립트 + plan/ 7 문서

**진행 중**:
- 🟡 본 plan/ 6 신규 문서 작성 (OVERVIEW / SLASH-COMMANDS / TASK-DOC / HOOKS / DISTRIBUTION / DECISIONS) + archive 삭제

**남은 작업**:
- 🟡 **C11 — 사이드 프로젝트 적용** (§13 step 6~7) — 사용자 선정 필요
- 🟡 **publish 전 보완** — README.md 작성 + bin/taskery.js GitHub URL placeholder 교체
- 🟡 **npm publish** — 사용자 명시 요청 시까지 보류

---

## 11. 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — 진입 문서. v0.2 정신 3원칙 + 큰 그림 4영역 + 5사이클 폐기 간략 + 디렉토리 구조 (본 리포 + 사용자 프로젝트) + 핵심 결정 9개 표 + 단일 진실 소스 표 + plan/ 7 문서 인덱스 + 외부 참조 + 메인 세션 진입 가이드 + 현재 상태 + 남은 작업 |
| 2026-05-08 | settings.json 추가 반영 — §5-1/§5-2 디렉토리 구조에 표기 + §7 단일 진실 소스 표에 hook 등록 항목 추가 (audit 발견 #누락) |
