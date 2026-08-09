# TASKERY_RULE — taskery 사용 설명서

> 본 문서는 taskery의 **전체 사용법 단일 소스**다. 세션은 본 문서를 필독한 후 작업한다.
> 본 문서는 taskery 패키지가 관리한다 — `npx @angar2/taskery update`로 갱신되므로 직접 수정하지 않는다.
> 리포 특성 커스텀은 `TASKERY_RULE.local.md`(본 문서 짝)로 한다.
> **경계**: 본 문서는 *전체 그림과 체계*까지만 담는다. 각 단계의 상세 수행 절차는 해당 스킬(`SKILL.md`)이, git 정책 상세는 `GIT_RULE`이, task 문서 양식은 `TASK_DOC_RULE`이 담당한다 — 여기에 상세 절차를 옮겨 적지 않는다.

---

## 1. taskery란

taskery는 **task 단위 라이프사이클 관리 시스템**이다. 하나의 작업을 task로 세우고, 그 task의 문서·상태·git 브랜치·검증을 정해진 순서로 진행시킨다. 각 단계는 **스킬**(에이전트가 호출하는 절차서)이 주도하고, 결정적인 부분(채번·상태 전이·분기·커밋 준비)은 **CLI/도구**가 코드로 수행한다.

목적은 두 가지다. 하나는 작업 이력이 문서와 git 양쪽에 일관된 형태로 남게 하는 것, 다른 하나는 여러 세션이 같은 리포에서 동시에 일해도 서로를 망가뜨리지 않게 하는 것이다.

---

## 2. task 라이프사이클

### 7상태

```
draft → planned → developing → developed → testing → tested → closed
```

| 상태 | 의미 |
|------|------|
| `draft` | task 문서 골격만 생성된 상태 |
| `planned` | 요구사항·범위·구현 계획·검증 계획 확정 |
| `developing` | 구현 진행 중 |
| `developed` | 구현 완료 + 자체 점검(린트·타입·빌드) 통과 |
| `testing` | 격리 검증 진행 중 |
| `tested` | 격리 검증 통과 |
| `closed` | git 마무리 완료 |

상태 전이는 **코드가 유효성을 검증**한다(`set_status` 도구 / `npx @angar2/taskery set-status`). 문서를 직접 편집해 상태를 바꾸지 않는다. 유효 전이표와 FAIL·UNCERTAIN 분기의 상세는 `TASK_DOC_RULE` §1.2에 있다.

### 어느 상황에 어느 스킬을 호출하나

| 상황 | 스킬 |
|------|------|
| 새 작업을 시작한다 | `/task-init` |
| 무엇을 어떻게 만들지 정한다 | `/task-plan` |
| 구현한다 | `/task-dev` |
| 검증한다 | `/task-test` |
| 마무리하고 부모 브랜치에 합친다 | `/task-close` |
| 프로젝트를 처음 세운다 | `/project-init` (1회성) |
| 기능 그룹을 새로 연다 | `/plan-init` |
| 나중에 할 일을 적어 둔다 | `/add-backlog` |
| 작업 중 겪은 불편을 남긴다 | `/log-friction` |

**사용자가 명시한 범위만 수행한다.** 예를 들어 `/task-dev`까지 지시받았으면 `developed`에서 정지하고 보고한다. 다음 단계로 스스로 진입하지 않는다.

---

## 3. plan · task · 백로그의 관계

- **plan** = 기능 그룹 단위. `.project/plans/<NNN_slug>/`에 `PLAN.md`(인덱스)와 `ROADMAP.md`(Stage 계획)를 둔다.
- **task** = 실제 작업 단위. `.project/tasks/<NNN_slug>/`에 task 문서가 쌓인다.
- **백로그** = 아직 task로 옮기지 않은 후보. `.project/tasks/<NNN_slug>/BACKLOG.md`에 `BL-NNN`으로 누적한다.

**활성 plan**은 `.taskery-manifest.json`의 `activePlan` 필드가 단일 진실이다. 문서에 활성 plan을 자기선언하는 줄을 만들지 않는다. 확인은 `status` 도구, 전환은 `npx @angar2/taskery plan-switch <NNN_slug>`로 한다.

**백로그 체크박스의 의미**:
- `[ ]` = 미확인(task로 옮기지 않은 메모) / `[x]` = task로 옮김.
- `[x]`는 *task로 옮겼다*는 메모일 뿐 완료·머지 여부와 무관하다. **`[x]` 항목이 실제로 끝났는지 굳이 확인하려 들지 않는다.**
- 완료 여부를 반드시 알아야 하면 순서를 지킨다. ① `taskery status` 진행중 목록에 있으면 아직 진행 중이므로 `git log`가 비는 것이 정상이다(재조회하지 않는다). ② 목록에 없으면 `git log --all --grep 'BL-NNN'`으로 확인한다.

백로그 조작은 **손편집하지 않는다** — `backlog_add` / `backlog_get` / `backlog_mark` 도구가 채번·서식·직렬화를 보장한다. 파일 위치는 등록/미등록과 무관하게 항상 메인 워크트리다.

`.project/BACKLOG.md`(글로벌)는 *다음 기능 그룹* 후보 카탈로그로 성격이 다르며 `/plan-init` 영역이다.

---

## 4. 스킬

| 스킬 | 레벨 | 하는 일 |
|------|------|--------|
| `/project-init` | project | `AGENTS.md` 리포 값 기입 + `.project/` 진입·제품 관통 문서 + 리포 로컬 룰 초안 생성 (1회성) |
| `/plan-init` | plan | plan 폴더·PLAN·ROADMAP 생성 + FEATURES/UX-UI에 의도 추가 |
| `/task-init` | task | 채번 + 워크트리·브랜치 분기 + task 문서 골격 (→ `draft`) |
| `/task-plan` | task | Requirements / Scope / Dev Plan / Test Plan 작성 (→ `planned`) |
| `/task-dev` | task | Phase 순서 구현 + 자체 점검 (→ `developed`) |
| `/task-test` | task | 서브에이전트 격리 검증 (→ `tested`) |
| `/task-close` | task | 검증 게이트 + 커밋 + 부모 브랜치 병합 (→ `closed`) |
| `/add-backlog` | meta | 백로그 항목 1건 추가 (얕은 분석 + 채번) |
| `/log-friction` | meta | 작업 흐름의 불편을 `FRICTION_LOG.md`에 한 행 기록 |
| `/run-team` | meta · **Claude 전용** | 다건 task를 팀원 세션에 분배해 병렬 처리 |

각 스킬의 수행 절차는 해당 `SKILL.md`에 있다. **스킬은 반드시 정식 호출한다** — 본문을 기억으로 대체해 진행하지 않는다(컨텍스트가 압축된 상태에서도 동일).

`/run-team`은 기본 흐름이 아니다. *"백로그 한 번에 진행해"* 류의 트리거 발화가 있을 때만 발동하며, 실험 기능이라 `~/.claude/settings.json`의 `env`에 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` 설정이 선행돼야 한다. Codex에는 해당 기능이 없어 미지원이다.

---

## 5. 멀티세션 (워크트리)

여러 메인 세션이 같은 프로젝트에서 독립 task를 병렬 진행할 수 있다. 작업 폴더는 git worktree로 격리하고, 부모 브랜치 병합은 락으로 직렬화한다.

- **메인 워크트리 = 부모 브랜치 고정.** 메인 워크트리는 `/task-init` 시점에 체크아웃돼 있던 브랜치를 유지한다. taskery는 특정 이름을 고정하지 않고 *그때 서 있는 브랜치*를 부모로 삼는다.
- **진행 중 task가 있는 동안 메인 워크트리의 HEAD를 옮기는 어떤 작업도 금지**한다(`checkout` / `switch` / `reset` / `rebase` 등). close가 부모로 되병합해야 하므로 부모에 서 있어야 한다.
- ***"잠깐만 메인에서"* / *"테스트 한 번만 메인에서"* 류의 예외 발화도 거부**한다. 별도 워크트리에서 처리한다. 이런 발화는 규칙 충돌 신호이므로 정지 후 확인한다.
- **세션 시작 시 자가 진단**: `git rev-parse --show-toplevel` 결과를 `~/.taskery/worktrees/` 경로와 비교해 지금이 메인 워크트리인지 task 워크트리인지 판정한다. task 워크트리면 그 task 맥락으로, 메인이면 새 task 또는 진행중 목록 흐름으로 진입한다.
- **워크트리에서 메인 메타에 접근**할 때는 메인 워크트리 절대 경로를 쓴다:
  ```sh
  MAIN_WT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
  ```
- **수동 git 작업은 정합성을 보장하지 않는다.** taskery 스킬과 `npx @angar2/taskery <서브커맨드>`로만 운영한다.
- 보조 명령: `status`(진행중 task·워크트리·부모 머지 상태) / `prune`(오래된 워크트리 대화형 정리).

git 정책의 상세(브랜치 명명·커밋 형식·병합 방식·금지 명령)는 `GIT_RULE`에 있다. 요건은 git 2.31 이상이다.

---

## 6. 문서 체계 지도

| 구분 | 위치 | 성격 |
|------|------|------|
| 진입 문서 | `AGENTS.md` (+ `CLAUDE.md`는 이를 임포트) | 에이전트 최상위 지침 + 이 리포의 메타·명령 값 |
| 코어 룰 | `.project/rules/` | taskery가 제공하며 모든 리포에 동일 |
| 리포 로컬 룰 | `.project/rules/*.local.md` | 이 리포 고유 규칙 (§7) |
| 제품 관통 문서 | `.project/` 루트 | SERVICE-POLICY / TECH-STACK / ARCHITECTURE / DATA-MODEL / API-SPEC / FEATURES / UX-UI |
| plan 문서 | `.project/plans/<NNN_slug>/` | PLAN · ROADMAP |
| task 문서 | `.project/tasks/<NNN_slug>/` | task 본문 · spec-diffs · screenshots · mockup |
| 기계 상태 | `.taskery-manifest.json` | 활성 plan · projectId · 설치 자산 해시 — **손편집 금지** |

**코어 룰 5종**:

| 룰 | 관할 |
|----|------|
| `TASKERY_RULE` | taskery 사용법 전체 (본 문서) |
| `TASK_DOC_RULE` | task 문서 양식 — 헤더 6컬럼 / 6섹션 / 7상태 |
| `GIT_RULE` | git 정책 — 브랜치 · 커밋 · 병합 · 금지 명령 |
| `CHANGELOG_RULE` | CHANGELOG 위치 · 형식 · 필수 필드 |
| `MOCKUP_RULE` | UX/UI task의 HTML 목업 위치 · 형식 · 네이밍 |

**Hook 안전망 2종** — 정상적으로 지키면 한 번도 작동하지 않는다.

| Hook | 차단 대상 |
|------|----------|
| `git-guard.sh` | 보호 브랜치 직접 커밋 / `--force` / `--no-verify` / `branch -D` / `reset --hard` / `clean -fd` |
| `closed-immutable.sh` | `closed` 상태 task 문서의 재수정 (spec-diffs · screenshots · mockup은 자유) |

---

## 7. `.local.md` 커스텀 체계

코어 룰은 **항상 준수가 기본값**이다. 이 리포만의 규칙이 필요하면 해당 코어 문서의 짝을 만든다 — 파일명은 `<코어문서명>.local.md`이며 같은 `.project/rules/`에 둔다. 예: `GIT_RULE.local.md` · `TASK_DOC_RULE.local.md`.

**구속력**:

> 로컬 룰의 조항은 코어와 **동등한 구속력**을 가진다. 겹치는 조항은 로컬이 최우선이고, **겹치지 않는 로컬 조항도 그대로 준수한다.**

**로컬이 뒤집을 수 없는 안전선** (아래는 로컬에 무엇을 적든 무효다):
- 멀티세션 불변식 — 메인 워크트리 부모 브랜치 고정, task는 워크트리에서.
- git 되병합·워크트리 정리는 `/task-close`만 수행.
- destructive git 명령은 사용자 승인 필수.
- 상태 전이 유효성 검증(코드 게이트).

**갱신 안전 보장**: `*.local.md`는 taskery 패키지가 배포하는 자산이 아니므로 `npx @angar2/taskery update`가 **영구히 건드리지 않는다.** 반대로 코어 룰은 update가 갱신하므로 코어 파일을 직접 고치지 않는다 — 고쳐야 할 내용은 로컬 짝으로 옮긴다.

---

## 8. TEST_RULE.local.md · DEV_RULE.local.md — 모든 리포 필수

이 둘은 코어 짝이 없는 **로컬 전용 문서**다. 프로젝트마다 검증·구현 방식이 근본적으로 달라 공통으로 배포할 내용이 없기 때문이다. 그러나 **모든 리포에 반드시 존재해야 한다** — 없으면 세션이 그 리포의 방식을 모른 채 일반론으로 진행하게 된다. `/project-init`이 초안을 만들고, 이후 작업 중 확인된 사항을 누적한다.

**`TEST_RULE.local.md` 구성**:

| 섹션 | 내용 |
|------|------|
| 방식별 실행 경로 | 데이터 조회 / API 호출 / UI·E2E / 시각 실행 — 각 방식을 *이 프로젝트에서 실제로 돌리는 명령·경로·셋업* |
| 테스트 실행 환경 | 화면·입력을 점유하는 스위트의 **격리 실행 경로**(창 숨김·헤드리스 플래그 / 컨테이너·가상 디스플레이 / VM / CI 러너). 결정 자체도 기록 대상이다 — 격리 경로를 두지 않기로 했다면 *"없음 — 매번 승인(사용자 결정 YYYY-MM-DD)"*로 적어 미결정 상태와 구분한다 |
| 범위·방식 정책 | 무엇을 얼마나 검증하나 — 수정 루프에서의 실행 범위, 테스트 신설 상한 등 |

**"방식별 실행 경로"는 그대로 실행 가능한 형태로 적는다.** 추상적 설명이 아니라 명령과 경로다. 모르면 비워 두지 말고 사용자에게 확인한 즉시 기록한다 — 재사용의 근거는 기억이 아니라 파일이어야 세션이 바뀌어도 남는다.

**"테스트 실행 환경"이 비어 있으면 점유 스위트를 자동 실행하지 않는다.** 사용자의 화면·마우스·키보드를 뺏어 작업을 중단시키기 때문이다. 비점유 부분만 한정 실행하거나, 실행 보류로 표시해 사용자 승인을 받는다.

**`DEV_RULE.local.md` 구성**: 이 프로젝트 고유의 구현 정책과 테스트 실행 정책(빌드 선행 여부, 커밋 단위 관행, 금지 패턴 등).

---

## 9. 규칙을 새로 만드는 절차

**트리거 2종**:
1. 사용자가 직접 언급하거나 불편을 표현한 경우.
2. 세션이 작업 중 문제를 인지한 경우(같은 실수 반복, 방식이 프로젝트와 맞지 않음 등).

**판단** — 둘 중 어느 쪽인지 먼저 가른다.

| 성격 | 처리 |
|------|------|
| **taskery 자체의 결함** — 모든 리포에서 똑같이 발생할 문제 | `/log-friction`으로 기록한다. 예: 스킬 지시가 서로 모순됨, CLI 반환값이 문서와 다름 |
| **이 리포의 특성** — 이 프로젝트에서만 해당하는 방식·관행 | 해당 문서의 `.local.md` 감이다. 예: 이 프로젝트는 테스트 전에 빌드가 필요함, 이 리포는 특정 브랜치 명명을 씀 |

**질문 후 생성** — 리포 특성으로 판단했으면 **반드시 사용자에게 묻는다**: *"이걸 이 리포 규칙(`<문서>.local.md`)으로 등록할까?"* 승인받은 후에만 파일을 만들거나 조항을 추가한다. 문안은 사용자와 확정한 내용으로 적는다. 양쪽에 모두 해당하면 둘 다 제안한다.

새 로컬 문서의 파일명은 §7의 규칙을 따른다 — 코어 짝이 있으면 `<코어문서명>.local.md`, 없으면 `TEST_RULE` · `DEV_RULE`처럼 관할이 드러나는 이름에 `.local.md`를 붙인다.

---

## 10. 폴더 구조

```
.project/
├─ rules/                    코어 룰 5종 + 이 리포의 *.local.md
├─ *.md (루트)               제품 관통 문서 (SERVICE-POLICY / TECH-STACK / ARCHITECTURE /
│                            DATA-MODEL / API-SPEC / FEATURES / UX-UI)
├─ PROJECT.md                프로젝트 개요 + 초기 빌드 로드맵
├─ GLOSSARY.md               도메인 용어집 (영문/한글 표기 단일 진실)
├─ LINKED-REPOS.md           연결 리포 목록
├─ BACKLOG.md                다음 기능 그룹 후보 카탈로그
├─ FRICTION_LOG.md           불편 기록 (첫 기록 시 생성)
├─ plans/<NNN_slug>/         PLAN.md · ROADMAP.md
├─ tasks/<NNN_slug>/         task 문서 · spec-diffs/ · screenshots/ · mockup/
├─ flows/                    도메인 흐름
├─ shared/                   멀티리포 메시지
├─ changelog/                월별 변경 이력
└─ .env                      연결 리포 경로 (gitignore)
```

---

## 11. 동기화 · 불편 기록 · 멀티리포

**동기화 (사용자 의무)** — taskery는 문서 간 자동 빌드를 하지 않는다.
- `.project/` 루트 제품 관통 문서를 변경하면 → 관련 task의 `spec-diffs/`를 갱신한다.
- 진입 문서의 검증·테스트 명령을 변경하면 → 모든 스킬과 hook이 그대로 따르므로 별도 동기화가 불필요하다.
- 룰 문서를 변경하면 → 다음 스킬 호출부터 반영된다.

**불편 기록** — `.project/FRICTION_LOG.md`에 한 행씩 누적한다. 파일이 없으면 `/log-friction`이 첫 기록 때 생성한다. 발동 계기는 사용자 명시 호출 / 불만 발화 감지 / `/task-close` 직후 마찰 신호 자체 감지다.

**멀티리포 통신** (해당 시)
- 송신: `.project/shared/sent/<파일명>.md` 작성 → 수신 리포에서 `received/`로 복사 후 정독.
- 처리 완료분은 각각 `completed/`로 이동한다.
- 연결 리포 경로는 `.project/.env`, 리포 목록은 `.project/LINKED-REPOS.md`에 둔다.
