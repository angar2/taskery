# Changelog

이 파일은 taskery의 모든 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 기반, 버전 운영은 [Semantic Versioning](https://semver.org/) 따른다.

---

## [Unreleased]

### 추가

- **멀티세션 워크트리 메커니즘 신설 (0.1.2 후보)** — 한 프로젝트 같은 `.git`을 공유하는 여러 메인 세션이 독립 작업 폴더(worktree)로 병렬 task를 진행. 메인 워크트리는 `dev` 전용으로 유지, task는 `~/.taskery/worktrees/<projectId>/TASK-NNN_<출처>_<슬러그>/`에 분기. SSoT = git 브랜치 (`git branch --no-merged dev --list 'feature/*_TASK-*' ...`). race 차단 2층 — 결정적 슬러그(같은 항목 → 같은 브랜치명 → git 자동 거부) + SSoT BL/RM-NNN grep. 충돌 자체 해결 3단계 — 단순 자동 / 의미적 자료 분석 / 판단 불가 사용자 호출. 머지 락 직렬화(`proper-lockfile`, `~/.taskery/<projectId>.merge.lock`). task-close 후 워크트리 + 작업 브랜치 자동 정리(GIT_RULE 면제 조항, 보존 키워드 시 양쪽 보존).
- `bin/lib.js` 멀티세션 유틸 — `getMainWorktreePath` / `getProjectId` / `getWorktreePath` / `withMergeLock` / `withMetaLock` / `getActiveTasks` / `getNextTaskNumber` / `assertMainWorktreeOnDev` / `assertDevExists` / `parseBranchName` / `generateProjectId` 등
- `bin/status.js` 신설 — 진행중 태스크 (SSoT) + 워크트리 폴더 상태 + 마지막 커밋 시각 + 머지 락 상태 + stale 의심 항목 (케이스 A/B/C/D) + orphan 워크트리 출력 (`npx @angar2/taskery status`)
- `bin/prune.js` 신설 — stale 워크트리 / 브랜치 대화형 정리 (`git worktree prune` 자동 + 의심 항목 사용자 선택 보존/삭제) (`npx @angar2/taskery prune`)
- `.taskery-manifest.json` 필드 추가 — `projectId` (8자 hex, 워크트리 폴더 충돌 방지) / `stale_days` (기본 30) / `lock_timeout_ms` (기본 30000). `bin/init.js` 신규 manifest 자동 생성 + `bin/update.js` 누락 필드 자동 마이그레이션
- `package.json` — `proper-lockfile` 의존성 + `engines.git: ">=2.31.0"` 명시 (`--path-format=absolute` 옵션 필요)
- `template/.project/rules/GIT_RULE.md` 멀티세션 오버라이드 — 브랜치명에 출처(BL/RM/DR) 추가 (`{타입}/{개발자}_TASK-NNN_{출처}_{슬러그}`) / 케이스 2(TASK 없는 작업 브랜치) 시스템 외 명시 / `/task-close` 자동 삭제 + 워크트리 제거 면제 조항 / 멀티세션 워크트리 정책 섹션 신규 (메인=dev 전용 / SSoT 조회 / 머지 락 직렬화)
- `template/CLAUDE.md` 메인 세션 최상위 룰 #3 워크트리 자가 진단 추가 + 멀티세션 워크트리 섹션 신규 (호출 위치 / 메타 접근 절대 경로 / 보조 명령 / git ≥ 2.31 요건)
- `.project/rules/CHANGELOG_RULE.md` 신설 — CHANGELOG 위치 / 형식 / 필수 필드 / `/task-close` 정합 단일 진실 소스 (stash FRICTION_LOG #8+9)
- `.project/rules/MOCKUP_RULE.md` 신설 — UX/UI task의 HTML 목업 위치 / 형식 / 두 시점 활용 / 시각 fix 예고 단일 진실 소스 (stash FRICTION_LOG #14+19)
- `.project/GLOSSARY.md` 신설 단계 — `/project-init` Step 4.5 (4컬럼: 영문/한글/정의/출처). 도메인 용어 표기 일관성 (stash FRICTION_LOG #3)
- `.project/tasks/<vX.X>/BACKLOG.md` 자동 Write — `/plan-init` Step 5 (현재 plan 진행 중 후속 task 후보 누적용, 글로벌 BACKLOG와 별개. stash FRICTION_LOG #17)
- `CLAUDE.md` 메인 세션 최상위 룰 신설 — *범위 준수* + *Skill 정식 발동* 두 줄 (stash FRICTION_LOG #6+10/#20)
- `CLAUDE.md` `## 검증 명령` + `## 테스트 명령` 두 섹션 분리 — self-check 게이트 = 코드 상태만, 테스트 = `/task-dev` 구현 후 + `/task-test` 격리 세션 단일 시점 (stash FRICTION_LOG #25)
- `/task-plan` Step 4.5 HTML 목업 프로세스 신설 — UX/UI task 한정, task 1개 = 목업 1개. `.project/tasks/<vX.X>/mockup/<task-doc-name>-mockup.html`
- `/task-close` Step 4-0 — 내부 경로 gitignored 감지 + 4-2/4-3/4-4 조건부 commit 스킵 (공개 repo에서 taskery 내부 영역 gitignore 등록 시 빈 commit 실패 회피. stash FRICTION_LOG #26)
- `bin/init.js` scaffolding 후 `.gitignore` 인터랙티브 prompt — taskery 내부 영역(`/.project/`, `/.claude/`, `CLAUDE.md`, `.taskery-manifest.json`) 자동 등록 (사용자 OK 시. stash FRICTION_LOG #26)
- **`/add-backlog` 스킬 신설 (0.1.2)** — 사용자 발화로 *버전별* `.project/tasks/<vX.X>/BACKLOG.md`에 task 후보 1건씩 누적. 흐름: 메인 워크트리/dev 검증 + 활성 버전(`AGENT-GUIDE.md` 파싱) 검출 + 얕은 분석(LLM, 코드 탐색 X — 유형/제목/개요/대상 영역) + 결정적 슬러그(한국어 → 영어 의미 변환 → kebab-case 3 단어 이내) + BL-NNN 채번(기존 max + 1) + `withMetaLock` append (plan-init placeholder 치환 우선). `[ ]` 대기 default. 글로벌 `.project/BACKLOG.md` (plan 기획 후보 카탈로그) 와는 별 차원
- `bin/lib.js` 백로그 유틸 — `getActiveVersion` / `getBacklogPath` / `parseBacklogItem` / `appendBacklogItem` / `markBacklogChecked` + private helper(`computeNextBLNumber` / `formatBacklogBlock`) + `BACKLOG_PLACEHOLDER` 상수. 멀티세션 인프라 `withMetaLock` 재사용 (proper-lockfile 직렬화)
- `template/.claude/skills/task-init/SKILL.md` §7.5 BL 체크 마킹 단계 신설 — 워크트리 생성 직후 `withMetaLock` 안에서 `- [ ] **BL-NNN**` → `- [x] **BL-NNN**` 4번째 글자 치환 + 같은 블록 끝에 `  - TASK: TASK-NNN` append (이미 있으면 콤마). 출처 분기: BL일 때만 실행, RM/DR은 skip. §4.2.5 신규 — 이미 `[x]` BL 재진행 요청 시 사용자 호출 + 콤마 추가/중단 분기
- `template/CLAUDE.md` "백로그 (0.1.2+)" 섹션 신설 — 흐름 / 체크박스 의미(`[ ]`=미확인, `[x]`=확인(task로 옮김), dev 머지 완료 의미 X) / 글로벌 vs 버전별 분리 명시. 스킬 8종 → 9종 표에 `/add-backlog` (meta) 행 추가
- `package.json` 0.1.1 → 0.1.2

### 수정

- **`/task-init` 스킬 본문 전면 재정의 (멀티세션 0.1.2)** — 사전 검증 (메인 워크트리 검출 / dev 존재 / 메인=dev / stale 감지) + 다음 TASK-NNN 계산 (SSoT) + 출처 결정 (BL/RM/DR) + 결정적 슬러그 + SSoT 안전망 + 워크트리 생성 (`git worktree add`) + task 문서 `.gitignore` 케이스 분기 (등록 시 메인 워크트리 직접 작성, 미등록 시 워크트리 안)
- **`/task-close` 스킬 본문 전면 재정의 (멀티세션 0.1.2)** — 사전 검증 (메인=dev / 워크트리 미커밋 X) + 호출 위치 분기 (워크트리 vs 메인) + 사전 rebase (락 외) + 충돌 자체 해결 3단계 에스컬레이션 + 충돌 해결 task 문서 기록 (`.gitignore` 케이스 분기) + 머지 락 + 락 안 재 rebase + Phase 커밋 시퀀스 + dev `--no-ff` 머지 + 워크트리 제거 + 작업 브랜치 자동 삭제 + 복구 안전망 출력
- `/task-plan` / `/task-dev` / `/task-test` 본문에 *멀티세션 메타 위치* 단락 추가 — `.gitignore` 케이스 분기로 task 문서 위치 결정 (등록 시 `$MAIN_WT/.project/tasks/...` 단일 소스 + `withMetaLock`, 미등록 시 워크트리 안)
- `plan/SKILLS.md` §1 스킬 표 갱신 (task-init/close 멀티세션 동작 + 워크트리 호출 위치 명시) + §3.5 멀티세션 워크트리 섹션 신규 (SSoT / 메인=dev 전용 / race 2층 / 충돌 3단계 / 머지 락 / 자동 정리 / 호출 위치 분기 / CLI 보조 명령 / `.gitignore` 케이스 분기)
- `README.md` 해결하는 문제 표에 *단일 메인 세션 직렬 병목 → 멀티세션 병렬* 한 행 추가 / 멀티세션 (병렬 작업) 섹션 신규 / 빠른 시작에 `taskery status` / `taskery prune` 추가 / 요구 사항에 git ≥ 2.31 명시
- catastrophic hook 안전망 3종 → 2종 — `pre-commit-verify.sh` 폐기 (`/task-close` Step 2 게이트 + `git-guard.sh`로 충분, redundant 검증 사이클 제거). `template/.claude/hooks/pre-commit-verify.sh` 삭제 + `settings.json` 등록 해제 (stash FRICTION_LOG #25)
- `/task-plan` Step 5 Test Plan 본질 재정의 — *실질 동작 시나리오* (유닛 테스트 X) + 카탈로그 7방식 + UX/UI 영역 분리 매트릭스 + `[AUTO]` / `[USER]` 분류 강제 + 시각 fix 사이클 사전 예고 (stash FRICTION_LOG #14+19)
- `/task-dev` Step 6 / 6.5 분리 — self-check = 코드 상태만(테스트 X) + 테스트 실행 단일 시점 + 추측 fix 반복 방지 룰 + 모호 발화 confirm + 신규 테스트 식별자 grep 등장 확인 + 디자인 산출 정독 의무 (stash FRICTION_LOG #15+16+18 / #19 / #21+22 / #25)
- `/task-test` 격리 prompt 본질 재정의 — Test Plan 시나리오 기반 + `[AUTO]` / `[USER]` 분류 그대로 + UNCERTAIN 분기 USER 검수 체크리스트 + 시각 fix 사이클 사전 예고 (stash FRICTION_LOG #7 / #14+19 / #25)
- `/task-close` Step 2 게이트 — *코드 상태 검증만* (테스트 X) + CHANGELOG_RULE 참조 + 사용자 명시 호출 외 자체 진입 영구 금지 강조 (stash FRICTION_LOG #4 / #8+9 / #25 / #6+10)
- `/task-init` 단계 경계 — 허용 화이트리스트 + 금지 블랙리스트 명시 (단계 경계 무너짐 방지. stash FRICTION_LOG #11)
- `/plan-init` Step 3 ROADMAP 작성 4룰 inline — 현재 버전 한정 / Stage 단위 / 작업 단위 명시 / 상태 컬럼만 (stash FRICTION_LOG #1)
- `/project-init` `.project/AGENT-GUIDE.md` 매 세션 읽기 항목에 GLOSSARY / BACKLOG 추가
- `.project/rules/GIT_RULE.md` — task 진행 중 ROADMAP/플랜 갱신은 별도 `docs/*` 브랜치 분리 금지 명시 (작업 브랜치 안에서 + dev `--no-ff`. stash FRICTION_LOG #4)
- `README.md` / `package.json` description — hook 3종 → 2종 표기 정합 (Hook 표에서 폐기된 `pre-commit-verify.sh` 행 제거 포함)
- `.project/rules/TASK_DOC_RULE.md` §1.5 mockup 행 추가 (vX.X 공통, 단일 진실 소스 MOCKUP_RULE) + §2.5 Test Plan 본질 재정의 (실질 동작 시나리오 + `[AUTO]` / `[USER]` 분류 강제 + 카탈로그 7방식 + UX/UI 영역 분리 매트릭스 + 시각 fix 사이클 사전 예고 + 검증/테스트 명령 두 섹션 참조) + §4.5 / §5 완성 예시 3개 Test Plan 형식 갱신 (기존 번호 매김 시나리오 + 검증 명령 나열은 옛 형식). `closed-immutable.sh` hook 주석에 mockup 자유 수정 명시 추가 (행위 변경 X, 가독성 정합)
- **`/task-init` 스킬 본문 §4.2/§도구 가이드 BACKLOG.md 경로 정정 (멀티세션 0.1.2 commit 결함 fix)** — *글로벌* `$MAIN_WT/.project/BACKLOG.md` (잘못) → *버전별* `$MAIN_WT/.project/tasks/<활성버전>/BACKLOG.md` (정확)로 통일. 활성 버전 검출 = `AGENT-GUIDE.md` 파싱. 사유: README §디렉토리 구조 122줄 + `plan-init/SKILL.md` 92~102줄에서 명시한 *두 종류 백로그* 정의(글로벌 = plan 기획 후보 카탈로그 / 버전별 = task 후보 누적)와 이전 멀티세션 commit이 어긋남
- `template/.claude/skills/task-close/SKILL.md` "백로그 무관" 명시 한 줄 추가 — `[x]` = task로 옮김 의미라 close 시점 마킹 X. 완료 추적은 `git log dev --grep 'BL-NNN'` + 브랜치명 + `taskery status`
- `template/.project/rules/GIT_RULE.md` 출처 표 — BL-NNN 채번 주체 `/backlog-add` → `/add-backlog` + *버전별* `.project/tasks/<vX.X>/BACKLOG.md` 경로 명시
- `plan/SKILLS.md` 8종 → 9종 — §1 스킬 표 `/add-backlog` (meta) 행 / `task-init` BL 출처 진행 시 BACKLOG.md 확인 마킹 + `task-close` BACKLOG.md 무관 명시 / 위계 정신 meta 그룹 *백로그 누적* 추가 / §2 입력 처리 패턴 행 / §3.6 백로그 (0.1.2+) 섹션 신규 (흐름 / 체크박스 의미 / `/task-init` 연동 / `/task-close` 무관) / §4 스킬 본문 표 행 추가 (분량은 Phase 5 작성 후 측정)
- `README.md` — 멀티세션 섹션 다음에 *백로그 메모* 단락 신설 (외부 평이체, jargon 풀이) + Skills 표 `/add-backlog` (meta) 행 / 패키지 디렉토리 구조 `8 skill` → `9 skill` 정합

---

## [0.1.1] - 2026-05-11

### 추가

- `/project-init` 스킬 Step 7.5 — 빈 폴더 케이스 `git init` + root commit + dev 분기 가이드 (smoke test 후속, 첫 task 머지 시점 dev/main ref 누락 회피)
- `/log-friction` 스킬 신규 도입 — 사용자가 작업 흐름 중 겪은 불편을 `.project/FRICTION_LOG.md`에 한 행 기록. 호출 트리거 3가지(사용자 명시 호출 / 사용자 불만 발화 캐치 / `/task-close` 직후 마찰 신호 자체 감지). frontmatter description 매칭으로 사용자 발화에서 *불편·짜증·답답함* 신호 감지 시 자동 발동

### 수정

- 스킬 8종 구조를 Claude Code 표준으로 변경 — `template/.claude/skills/<name>.md` (단일 파일) → `template/.claude/skills/<name>/SKILL.md` (디렉토리), frontmatter에 `name` 필드 추가. 사용자 프로젝트에서 `npx @angar2/taskery init` 후 Claude Code가 스킬 8종을 인식 못 하던 동작 버그 해결 — 슬래시 직접 호출(`/project-init` 등) + 자연어 발화로 자동 발동 둘 다 가능
- 위 구조 변경에 따라 경로 표기 갱신 — `template/CLAUDE.md`, `plan/SKILLS.md` / `OVERVIEW.md` / `DECISIONS.md` / `DISTRIBUTION.md` / `PLAYBOOK.md`, `bin/lib.js` 주석
- README.md 전면 재작성 — *해결하는 문제* / *워크플로우 예시* 섹션 신설(첫 방문자 동선 보강), 자기위안식 섹션 제목(*한 줄 정신* 등) 제거, plan/ 톤(단정형 / 표 중심 / 비유 X) 정합. README 본문 *수정 이력 섹션* 폐지(변경 이력은 본 CHANGELOG가 단일 진실 소스)
- `/refine` 스킬 폐기 + `/log-friction`로 전면 재정의 — *5 task마다 자동 호출* 정책 폐기 / 후속 조치(반복 패턴 감지 + PLAYBOOK 부활 검토 + bottoms-up 보강 제안) 폐기. spec 정합 정정 — `plan/SKILLS.md` / `plan/PLAYBOOK.md`(부활 트리거 메커니즘 섹션 제거) / `plan/OVERVIEW.md` / `plan/DECISIONS.md` / `plan/TASK-DOC.md` / `plan/DISTRIBUTION.md` / `plan/HOOKS.md` / `template/CLAUDE.md`(*짜증 데이터* → *불편 데이터*) / `template/.claude/skills/project-init/SKILL.md` / `template/.project/FRICTION_LOG.md`. 구 `template/.claude/skills/refine/` 디렉토리 삭제. PLAYBOOK ↔ 스킬 연동 전면 해제 — PLAYBOOK은 *미래 옵션 카탈로그*로만 운영(사용자 직접 정독 후 부활 결정)
- `/task-close` 결과 보고 직전에 *마찰 신호 자체 감지* Step 신규 추가 — 동일 단계 재호출 ≥ 2회 / 검증 명령 FAIL 반복 / 사용자 부정 반응 발화 누적 검사 후 감지 시 `/log-friction` 등록 제안
- README.md `/log-friction` 동기 정정 — §Skills 표(`/refine` → `/log-friction`) + §워크플로우 예시(*5 task 후 회고* → *불편 발생 시 등록*) + §자동 발동 예시(회고 의도 발화 → 불만 발화 캐치 패턴)

---

## [0.1.0] - 2026-05-09

### 추가

- taskery 빌드 + 첫 init — 1 메인 세션 + 스킬 8종 + catastrophic hook 3종 + npx 배포 골격 완성
- npm publish 자산 작성 — README.md / LICENSE / package.json metadata / bin/taskery.js GitHub URL
- npm 패키지명: `@angar2/taskery` (scoped, public — `taskery` 이름이 npm에 선점되어 본인 namespace로 변경)

---

## 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-09 | 신규 작성 — 0.1.0 첫 기록 |
| 2026-05-09 | npm 패키지명 `@angar2/taskery`로 변경 반영 (이름 충돌 해소) |
| 2026-05-09 | `[Unreleased]` 섹션 도입 — publish 단위로 변경 사항 누적 패턴 (Keep a Changelog 표준) |
| 2026-05-10 | `[Unreleased]` §수정 — 스킬 8종 디렉토리 구조 마이그레이션 + 경로 표기 갱신 (npx 후 스킬 미인식 동작 버그 해결, 0.1.1 후보) |
| 2026-05-10 | `[Unreleased]` §수정 — README.md 전면 재작성 (첫 방문자 동선 보강 + 자기위안식 섹션 제목 제거 + plan/ 톤 정합 + 본문 수정 이력 섹션 폐지) |
| 2026-05-11 | `[Unreleased]` §추가 + §수정 — `/refine` → `/log-friction` 대대적 개편 (호출 정책 *5 task 자동 호출* 폐기 / 분석·제안 후속 조치 전면 폐기 / PLAYBOOK ↔ 스킬 연동 해제 / spec 정합 정정 + 디렉토리 rename + `/task-close` 마찰 신호 자체 감지 Step 신규) |
| 2026-05-11 | `[Unreleased]` §수정 — README.md `/log-friction` 동기 정정 (§Skills 표 + §워크플로우 예시 + §자동 발동 예시) |
| 2026-05-11 | `[0.1.1] - 2026-05-11` 발행 — `[Unreleased]` 누적분(스킬 디렉토리 구조 / README 재작성 / `/log-friction` 개편 / `/task-close` 마찰 감지 / Step 7.5 / README 동기 정정) 묶음 |
| 2026-05-30 | `[Unreleased]` §추가 + §수정 — stash FRICTION_LOG 기반 정합 누적 (CHANGELOG_RULE / MOCKUP_RULE 신설 / GLOSSARY / BACKLOG / 메인 세션 최상위 룰 / 검증·테스트 명령 분리 / HTML 목업 프로세스 / Step 4-0 / `.gitignore` prompt / hook 3종 → 2종 폐기 / 8 스킬 본문 갱신 / README + package.json 정합) |
| 2026-05-30 | `[Unreleased]` §수정 보강 — 3차 검증 후속 정정 누적 (TASK_DOC_RULE §1.5 mockup 행 추가 + §2.5 Test Plan 본질 재정의 + §4.5 / §5 완성 예시 3개 Test Plan 형식 갱신, closed-immutable.sh hook 주석 mockup 자유 수정 명시) |
| 2026-05-30 | `[Unreleased]` §수정 보강 — 3차 검증 후속 정정 추가 누적 (`/task-init` / `/plan-init` / `/task-close` SKILL 본문 + plan/HOOKS.md §6에 mockup `vX.X 공통` 명시 확산 정합. 행위 변경 X, 본문 가독성 정합) |
| 2026-05-31 | `[Unreleased]` §추가 + §수정 — 멀티세션 워크트리 메커니즘 신설 (0.1.2 후보). bin/lib.js 유틸 확장 + bin/status.js / bin/prune.js 신설 + manifest 신규 필드(projectId / stale_days / lock_timeout_ms) + proper-lockfile 의존성. GIT_RULE 멀티세션 오버라이드 + CLAUDE.md 가이드 갱신. 스킬 본문 task-init/close 전면 재정의 + task-plan/dev/test 메타 위치 분기 + plan/SKILLS.md §3.5 신규 + README §멀티세션 + §해결하는 문제 한 행 |
| 2026-05-30 | `[Unreleased]` §수정 보강 — 3차 검증 추가 누적 (closed-immutable.sh 주석 / plan/HOOKS §2·§3·§6 / plan/DECISIONS §5 / template/CLAUDE.md Hook 표 본문에 *spec-diffs / screenshots / mockup* 표기 일관성 정합 — mockup 누락 6건 보강) |
| 2026-05-30 | `[Unreleased]` §수정 보강 — 3차 검증 마지막 누적 (plan/DECISIONS §6 분산 원칙 표 — 스킬 path `<skill>.md` → `<skill>/SKILL.md` + CHANGELOG_RULE / MOCKUP_RULE 행 추가 + 테스트 명령 행 신설. plan/DISTRIBUTION §9 동기화 룰 예시 두 섹션 분리 정합. `/task-init` 블랙리스트 `Sources` 옛 표기 → `src / app / lib 등 프로젝트 소스 디렉토리` 언어/기술 중립 정합) |
| 2026-05-30 | `[Unreleased]` §수정 보강 — README.md 디렉토리 구조 표시에 신설 룰 / 자료 반영 (rules/ 안 CHANGELOG_RULE / MOCKUP_RULE + .project/ 직속 GLOSSARY.md + tasks/ 옆 BACKLOG / mockup 명시) |
| 2026-05-31 | `[Unreleased]` §추가 + §수정 — 0.1.2 백로그 스킬(`/add-backlog`) 신설 + 멀티세션 commit의 잘못 박힌 BACKLOG 경로 정정(글로벌 → 버전별). bin/lib.js 백로그 유틸 + CLAUDE.md 백로그 섹션 + 스킬 9종 표 + task-init §7.5 신규 + §4.2.5 신규 + task-close 노트 + GIT_RULE 출처 표 + plan/SKILLS.md §3.6 백로그 섹션 + §1 9종 표 + README 백로그 메모 단락 + 디렉토리 구조 9 skill + package.json 0.1.2 |
| 2026-05-31 | `[Unreleased]` §추가 정정 — `template/.project/BACKLOG.md 신규` 자기모순 항목 삭제 (표제는 *신규*인데 본문은 *plan-init이 생성, 별도 카피 불필요*로 모순. 실제 `template/.project/` 안 BACKLOG.md 파일 부재 — 신설된 적 없음). 정합 순회 1차 결함 fix |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 스킬 8종 → 9종 표기 갱신 (README §상세 문서 SKILLS.md 캡션 / template/CLAUDE.md 헤더 / plan/OVERVIEW.md §1·§3·§4·§6·§7 본문 다수 / plan/DECISIONS.md §9 결정 본문 / plan/SKILLS.md 제목+캡션) + bin/ 5 → 7 스크립트 표기 갱신 (OVERVIEW §4-1 디렉토리 / DISTRIBUTION §3 표 + status.js/prune.js 행 추가) + lib.js / status.js / prune.js / init.js / update.js / create.js / taskery.js 분량 갱신 (DISTRIBUTION §3) + 카피 대상 24 → 25 파일 / 8 → 9 스킬 본문 (DISTRIBUTION §4 + §8 files 배열) + proper-lockfile 외부 의존성 명시 (DISTRIBUTION §3) + plan/SKILLS.md §4 표 9 스킬 분량 실측 갱신 + §6 컨텍스트 관리 표 `/add-backlog` 행 추가 + OVERVIEW §4 본 리포 / 사용자 프로젝트 디렉토리 구조에 GLOSSARY.md / CHANGELOG_RULE.md / MOCKUP_RULE.md / add-backlog 미반영분 정합. 정합 순회 1차 결함 fix |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 정합 순회 2차 후속 정정. bin/taskery.js 헤더 주석 서브커맨드 목록에 `status` / `prune` 2행 추가 + package.json description *스킬 8종* → *9종* (npm 페이지 첫 화면) + plan/TASK-DOC.md §7 스킬 path *`<skill>.md`* → *`<skill>/SKILL.md`* (0.1.1 디렉토리 마이그레이션 후 갱신 누락분) + plan/DISTRIBUTION.md §5 manifest 예시 필드 순서를 실제 bin/init.js / bin/update.js writeManifest 호출 순서와 일치 + §11 동작 검증 표 본 세션 미실행 수치 인용 제거. package-lock.json 신규 추가 (0.1.2 멀티세션 Phase 1 commit에서 proper-lockfile 의존성 추가 시 누락된 lockfile 합류) |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 정합 순회 3차 최신 요구사항 기준 보강. README.md §자동 발동 예시에 `/add-backlog` 발화 패턴 한 줄 추가 (*"이 부분도 백로그에 추가해줘"* / *"나중에 할 일로 적어둬"*) + plan/OVERVIEW.md §9 *현재 상태 + 남은 작업* 본문에 *0.1.0 부트스트랩 시점 기록* 명시 박스 추가 (그 후 진척은 CHANGELOG.md 단일 진실 소스 link). 행위 변경 X — 외부 시각 9 스킬 정합 보강 + 시점 기록 명시 |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 정합 순회 5차 잔존 결함 정정. plan/DISTRIBUTION.md §3 `bin/taskery.js` 분량 *1,694 B* → *1,870 B* (2차 commit에서 헤더 주석에 `status` / `prune` 서브커맨드 2행 추가했으나 §3 분량 표 갱신 누락분) + §8 `package.json` 메타 예시 *0.1.0 → 0.1.2* / `"engines.git": ">=2.31.0"` 추가 / `"dependencies": { "proper-lockfile": "^4.1.2" }` 신규 추가 (실제 0.1.2 package.json 본문과 일치) + template/.claude/skills/project-init/SKILL.md Step 4 폴더 구조 본문 + Step 7 빈 골격 점검 본문의 *코어 룰 (TASK_DOC_RULE / GIT_RULE)* 2개 표기 → *(TASK_DOC_RULE / GIT_RULE / CHANGELOG_RULE / MOCKUP_RULE)* 4개로 갱신 (CHANGELOG_RULE / MOCKUP_RULE 신설 후 본 스킬 본문 누락분 정합). 행위 변경 X |
