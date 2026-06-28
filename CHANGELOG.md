# Changelog

이 파일은 taskery의 모든 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 기반, 버전 운영은 [Semantic Versioning](https://semver.org/) 따른다.

---

## [Unreleased]

### 추가

- **`/run-team` 스킬 — agent teams 자동 병렬 멀티태스크 (Claude 전용 · PLAYBOOK §15 본구현)** — 다건 태스크를 리더 메인 세션 1개가 Claude의 agent teams 기능으로 팀원(독립 세션)에게 1건씩 분배해 자동 병렬 처리하는 고기능. 기존엔 사용자가 작업마다 세션을 직접 띄워 지시해야 했고, 세션 간 컨텍스트 격벽으로 충돌·중복 위험이 있었다. 상위 에이전트 생태계가 taskery를 *병렬 개발 도구*로 호출하기 위한 전제이기도 하다.
  - **세션 오케스트레이션만 추가** — 워크트리 격리는 `/task-init`이, 머지 직렬화·충돌 3단계는 `/task-close`가 그대로 담당. `/run-team`은 태스크 묶기 판단 + 팀원 분배 + 중단점 관리 + 머지 조율만 한다. `bin/` 코드 변경 0.
  - **팀원 = agent teams 팀원** (독립 세션·자체 컨텍스트·사용자 직접 접근). Task tool 서브에이전트 대체를 스킬 본문에서 영구 금지 — 둘은 다르다(서브에이전트는 리더 컨텍스트 내 워커라 사용자 직접 접근·독립 컨텍스트 불가).
  - **트리거 한정 발동** — 기본 플로우(1세션 1태스크)를 침범하지 않음. *"백로그 한 번에 진행해"* / *"팀에게 전부 독립으로 맡겨"* 류 발화에서만.
  - **두 가드** — 플랫폼(Claude) + 활성화(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). 미충족 시 팀을 만들지 말고 안내 후 중단(꺼진 채 헛도는 것 방지).
  - **중단점 = taskery 단계 경계** — 기본은 단계별 정지(팀원이 한 단계 후 idle → 리더 자동 통지), 사용자 지시 시 구간 자동. 되돌릴 수 없는 `/task-close`(dev 병합)는 게이트로 두기 권장. 각 팀원이 물리적으로 분리된 워크트리에서 작업하므로 agent teams의 "같은 파일 동시 편집 → 덮어쓰기" 제약이 구조적으로 회피된다.
  - **Claude 전용** — agent teams가 Codex에 없어 `template/.claude/skills/run-team/`에 직접 배치(`platformOf`가 `.claude/`를 claude로 분류 → Claude 선택 시에만 설치, Codex 미포함). `AGENTS.md`에 Codex 미지원 가드(단일 태스크 흐름 권유). 코어 카피 파일은 Claude 설치 시 +1.
  - 정합: `CLAUDE.md`(agent teams 섹션 + 스킬표) / `AGENTS.md`(가드) / `plan/SKILLS.md`·`OVERVIEW.md`·`PLATFORMS.md` / `README.md` / `PLAYBOOK.md` §15 적용 완료 표기.

---

## [0.3.1] - 2026-06-28

### 변경

- **task-test 검증을 "증거 기반 합격 기준"으로 강제 — 거짓 PASS 차단 (PLAYBOOK §12 본구현)** — 격리 테스터가 반증 가능한 합격 기준 없이 코드만 훑고 PASS를 찍던 문제를 토대부터 고쳤다. 특히 UX/UI에서 목업과 동떨어진 구현에 PASS가 찍혀 사용자가 재순회로 직접 QA를 떠안던 마찰을 제거한다. 문서·스킬만 수정(코드 자산 0).
  - **시험문제 형태 강제** — 모든 `[AUTO]` 시나리오 = [실행 명령/입력] + [구체적·관측 가능한 기대값] 한 쌍. 소원("정상 동작") 금지·장면 쪼개기·"고장 시 어떻게 걸리나" 잣대 (`task-plan`·`TASK_DOC_RULE` §2.5).
  - **방식↔정답지 매핑** — 요구사항 성격 → 필수 방식(재량 0) + 방식마다 다른 정답지·검사 주체 명시.
  - **격리 세션 게이트** — 문 앞 검사(자격 미달 시나리오 = 시험문제 결함 반려) / 증거 일치 시만 PASS(코드 정독 PASS 금지) / UNCERTAIN 2종(사람 검수 = 주관 정답지 / 검증 불가 = `[AUTO]`인데 기대값 구성 불가 = 시험문제 결함, 근거 의무) (`task-test`).
  - **시각 = 캡처-목업 자동 대조** — 승인 목업을 정답지로, 격리 세션이 화면 캡처 → 대조 → 어긋남 목록 → FAIL. 객관 깨짐은 자동, 미세 취향만 사람. 사용자는 흠 사냥 대신 "고쳐" 게이트만(라운드 상한 3, 코어 불변식 보존).
  - **상태전이 3갈래** — PASS → `tested` / 코드 결함 → `developing`(사용자 "고쳐") / 시험문제 결함 → Test Plan 보수(`task-plan`, 코드·status 보존, `testing` 유지) → 재검사. 되돌림용 새 status 신설 X(7상태 유지).
  - **플랫폼 패리티** — 위 검증 룰은 전부 `task-test` 격리 펜스(플랫폼 중립)에 들어가 클로드·코덱스에 동일 전달된다. 코덱스 `task-tester.toml`의 `developer_instructions`도 같은 룰의 기준선으로 갱신해(낡은 "task.md 하나만"·옛 `[USER]` 정의 제거) 두 플랫폼이 taskery 사용에서 같은 효과를 내도록 맞췄다.

### 추가

- **`.project/TEST-GUIDE.md` 신설 — 검증 방법 단일 소스** — 각 테스트 방식(데이터 조회 / API 호출 / E2E / 시각 실행)을 *이 프로젝트에서 실제로 어떻게 돌리나*를 기록하는 빈 골격 문서. FRICTION_LOG와 동일 모델(init 자동 카피 · manifest 추적 · `npx update` 일관). `/task-plan`이 사용자에게 확인받아 채우고 `/task-test` 격리 세션이 task.md와 함께 읽는다. 코어 카피 파일 25 → 26.

---

## [0.3.0] - 2026-06-27

### 변경

- **plan 단위를 "버전(vX.X)"에서 "기능 그룹(NNN_slug)"으로 재정의** — 기존엔 `/plan-init`이 버전 단위로 제품 전체(기획 문서 9종)를 통째 생성하고, 새 버전 = 이전 폴더 통째 복제 후 수정하는 구조라 버전업이 너무 무거워 plan-init이 사실상 1회성 죽은 스킬이 되고 모든 task가 첫 버전 폴더에만 쌓였다. plan을 *작업 묶음(기능 그룹)* 단위로 바꿔 자주 호출되게 했다.
  - **제품 관통 문서(SERVICE-POLICY · TECH-STACK · ARCHITECTURE · DATA-MODEL · API-SPEC · FEATURES · UX-UI) 위치를 plan 폴더 → `.project/` 루트로 이동** — 제품 문서는 plan에 귀속되지 않는 living 단일 홈. 기능 추적은 문서 내 *섹션 헤딩*으로 한다(plan 폴더로 역추적 X).
  - **문서 작성 책임 3분할** — `/project-init`이 그룹 A(정책·스택·구조)를 인터뷰로 작성 + 그룹 B(데이터·API·기능·UX)를 빈 골격 생성(1회성). `/plan-init`은 그 기능 그룹의 PLAN/ROADMAP 생성 + FEATURES/UX-UI에 *의도 레벨* 섹션 추가. DATA-MODEL/API-SPEC의 스키마·엔드포인트 *상세*는 `/task-plan`·`/task-dev`가 *구현 동반*으로 채운다(선기획 금지 — anti-waterfall 정합).
  - **plan 폴더 = `NNN_slug` 숫자 채번**(예: `001_mvp`, `002_compare-products`) — TASK-NNN과 결 맞춤. `bin/lib.js`에 `computeNextPlanNumber` 추가. 기존 `v*` 폴더 감지 시 plan-init이 새 plan 생성 전 경고 + 수동 이전 안내(legacy 게이트).
  - **카피포워드(이전 버전 통째 복제) 폐기** — 제품 문서가 루트 living이라 불필요. plan-init은 단일 흐름(새 plan 생성 + 전역 delta)만.
  - plan 규모는 가변 — 기능 그룹이 보편이나 MVP 같은 큰 묶음도 plan 하나로 가능.
- **task 폴더 승격을 사용자 명시 한정으로 변경** — 규모 `large`면 자동으로 `TASK-NNN/` 폴더를 만들던 기본 동작 제거. 실사용에서 자동 폴더 승격이 한 번도 필요 없었고 경로·일관성만 복잡하게 했다. 기본은 항상 단일 파일 `NNN_slug.md`, 사용자가 *"폴더로 만들어줘"* 할 때만 승격. 폴더 승격 기능 자체는 유지.

### 주의 (마이그레이션)

- **forward-only** — 이미 `plans/v1.0/`에 기획 문서 9종이 깔린 기존 프로젝트는 `npx @angar2/taskery update`가 사용자 파일을 보존한다(자동 이전 X). `/plan-init`이 `v*` legacy 폴더를 감지하면 새 plan 생성 전 경고하므로 채번 충돌·활성 plan 갈림은 차단된다. 수동 이전 = 제품 문서를 `.project/` 루트로 이동 + plan 폴더를 `NNN_slug`로 리네임 + `AGENT-GUIDE.md`의 활성 plan 값 갱신.

---

## [0.2.1] - 2026-06-25

### 추가

- **멀티세션 검수 환경 — dev 서버 포트 격리 + 검수 서버 자동 기동** — 여러 세션이 병렬로 검수용 dev 서버·터널을 띄울 때 포트 충돌·프로세스 상호 종료가 잦던 문제를 컨벤션으로 정리. ① 포트 결정적 격리(메인/dev = 기준 포트, task 워크트리 = 기준 포트 + TASK번호) ② 터널은 필요한 task만 자기 포트로 독립 ③ `/task-close`는 자기 포트 자원만 종료(광역 종료 금지) ④ `/task-dev`·`/task-test`가 사용자 검수 시점(task-dev 종료 / task-test UNCERTAIN·PASS 종료)에 검수 서버를 백그라운드 자동 기동 + URL 보고(매번 수동 지시 불필요, FAIL→수정 흐름은 제외). `GIT_RULE`에 "멀티세션 검수 환경" 섹션, `CLAUDE.md`·`AGENTS.md`에 `## 검수 실행 명령` 선언란, 두 task 스킬에 기동 단계 추가. 검수 서버가 없는 프로젝트(CLI/라이브러리)는 무관. (FRICTION 검토 F7)

### 변경

- **워크트리 실행 환경 주의 추가** — 워크트리에는 의존성·빌드 산출물이 없는데, 메인 워크트리에서 심링크로 끌어오면 개발 서버 등 *파일 접근을 워크트리 내부로 제한하는 도구*가 로딩 실패(빈 화면)를 일으킨다(빌드·테스트는 통과해 오진하기 쉬움). `GIT_RULE`에 "워크트리 실행 환경" 섹션 + `task-dev` 주의사항 포인터 추가 — 실행·검수하는 task는 심링크 대신 워크트리 안에 의존성을 실제로 마련하도록 안내(언어/생태계 중립 서술). (FRICTION 검토 F6)
- **백로그 완료 판정 룰 정비** — 백로그 체크박스 `[x]`를 두고 세션이 dev 머지 여부를 grep으로 대조하려다, `[x]`(처리됨)와 빈 grep(워크트리 진행 중이라 dev 미머지)의 충돌을 못 풀고 자기 grep을 의심해 재조회를 반복하는 마찰이 있었다. `CLAUDE.md`·`AGENTS.md` 백로그 섹션을 정비 — `[x]`는 *task로 옮김* 메모일 뿐 완료·머지와 무관함을 명시하고, 평소엔 완료 여부를 대조하지 않으며, 정말 필요한 경우에만 `taskery status`(진행 중이면 빈 grep이 정상) → dev grep 순으로 판정하도록 순서를 고정. (FRICTION 검토 F2)

### 수정

- **추적 변경 0 task close 시 채번 누락 방지** — `.project`가 gitignore된 프로젝트에서 *코드 변경 0 + 산출물이 task 문서뿐*인 docs/분석 task를 close하면, 작업 브랜치가 dev보다 앞선 커밋이 0개라 `--no-ff` 머지가 *Already up to date*가 되어 머지 커밋이 생성되지 않았다. 이후 브랜치 자동 삭제 시 `getNextTaskNumber`가 번호를 추적하지 못해 다음 task가 번호를 재사용·충돌할 수 있었다. `/task-close`에 Step 6-8(추적 마커 빈커밋)을 추가 — 머지 커밋이 생기지 않는 경우에 한해 `--allow-empty` 마커 1개를 생성해 분기·채번 정보를 보존한다. GIT_RULE에 동일 예외 명시. (FRICTION 검토 F1)

---

## [0.2.0] - 2026-06-22

### 추가

- **멀티 에이전트 플랫폼(Codex) 지원** — taskery를 Claude Code 외 Codex CLI에서도 사용 가능하게 확장. `init` 시 플랫폼을 선택(Claude Code / Codex / 둘 다)하고, 고른 플랫폼 자산만 독립 설치한다. 폴더가 갈려(`.claude/` vs `.agents/`+`.codex/`) 둘 다 선택해도 충돌 없이 공존.
  - **공통 소스 + 플랫폼별 조립 설치** — 양 플랫폼 내용까지 동일한 자산(스킬 9종 · `git-guard.sh`)은 `template/shared/`에 단일 소스로 보관하고, 설치 시점에 고른 플랫폼의 실제 경로로 매핑 복사(조립)한다. 사본 중복을 template에 두지 않음. 실측 diff로 동일성 확인(`closed-immutable.sh`만 코덱스 `apply_patch` 파싱이라 플랫폼별 분리).
  - `bin/add.js` 신설 — `npx @angar2/taskery add <platform>`으로 기존 설치에 다른 플랫폼 자산 추가 (멱등).
  - `template/.codex/` 신설 — `config.toml`(`[[hooks.PreToolUse]]` 등록) / `hooks/closed-immutable.sh`(apply_patch 재작성판) / `agents/task-tester.toml`(격리 검증 서브에이전트, `model` 명시).
  - `template/AGENTS.md` 신설 — Codex 진입 문서 (운영룰 자체 보유 + 코덱스 차이 명시).
  - `plan/PLATFORMS.md` 신설 — 멀티 플랫폼 지원의 단일 진실 소스 (자산 매핑 / 메커니즘 대응 / 설치 흐름 / 실측 검증).

### 변경

- **`template/` 구조 개편 — 공통 소스 단일화** — 스킬 9종과 `git-guard.sh`를 `template/.claude/`·`.agents/`에서 `template/shared/`로 이동(`git mv`, 내용 무변조). 설치 결과는 개편 전과 byte-identical (검증 완료 — 기존 Claude Code 사용 무손상).
- `bin/lib.js` — `resolveInstallPlan(templateFiles, platforms)` 신설 (설치 계획 `{templateRel, installRel, hash}`로 전개, shared는 플랫폼 경로로 1:N 매핑). `SHARED_DEST` 매핑 테이블. `platformOf`에 `shared` 분류 추가. `filterAssetsByPlatforms` 대체. init/update/add가 공유.
- `bin/init.js` / `update.js` / `add.js` — 설치 경로(installRel) 기준으로 전환. manifest `files` 키 = 설치 경로. update는 `platforms` 누락(0.1.x) 시 `["claude"]` 마이그레이션.
- `.taskery-manifest.json` — `platforms` 필드 추가 (init 선택 / add push / 0.1.x update 마이그레이션).
- `README.md` — 멀티 플랫폼 정합 (빠른 시작 플랫폼 선택·`add` / 디렉토리 구조 플랫폼 매핑표 / Hooks 등록 방식 / 진입 문서).
- `package.json` 0.1.3 → 0.2.0 (`description`·`keywords`에 Codex 반영).

---

## [0.1.3] - 2026-06-02

### 수정

- **stash FRICTION_LOG 2026-06-01 5건 마찰 일괄 정정 (4건 반영, F4 stash 도메인 자체 처리로 제외)** — 0.1.2 도입 프로젝트(stash) 사용 중 적발된 마찰을 taskery 코어 결함으로 식별하여 본 라운드에 일괄 처리. FRICTION_LOG 본문 명시 개선 방향만 반영(메인 자율 확장 금지). 사용자 메모리 영역 미수정(taskery는 다른 PC·다른 리포에서도 사용)
  - **F1 — UX/UI task의 Step 4.5 목업 confirm 우회 차단**: `template/.claude/skills/task-plan/SKILL.md` Step 4.5 #2 본문 강화 — UX/UI 포함 판단=O이면 *예외 없이* 발화 강제. 메인 효용 판단(*"이 케이스는 목업 효용 낮음"* / *"SF Symbol HTML 재현 X"* 등)으로 confirm 자체 생략 영구 금지. 효용 판단은 질문에 *곁들이는 의견*으로만 (생략 결정 대체 X — 목업 제작 여부는 *사용자 검수 방식 선택권*이라 *개발 자율 판단* 영역 X). `template/.project/rules/MOCKUP_RULE.md` §5 #2 정합 갱신
  - **F2 — 메인 워크트리 = dev 전용 룰 위반 차단 (심각)**: `template/CLAUDE.md` §3 워크트리 자가 진단 안에 *모호 발화 자의 해석 금지* #4 신설 (*"워크트리 없이"* / *"메인에서"* / *"이 자리에서"* 류 발화 = 코어 규칙 충돌 신호 → 즉시 정지 + 규칙 명시 + 1줄 confirm. 자의 해석 후 진행 영구 금지) + §멀티세션 워크트리 본문 강화 (메인 워크트리 HEAD를 dev에서 떼는 어떤 명령도 영구 금지: `git checkout <task-branch>` / `git switch <task-branch>` / `git reset` HEAD 이동 / `git rebase` HEAD 이동 등. *"잠깐만 메인에서"* / *"테스트 한 번만"* 같은 예외 발화도 거부). `template/.project/rules/GIT_RULE.md` §멀티세션 워크트리 정책 §메인 워크트리 = dev 전용 정합 갱신
  - **F3 — git-guard 변형 인식 강화 + 호출 위치 cwd 무관 동작 보장**: `template/.claude/hooks/git-guard.sh`에 `extract_target_path` 헬퍼 신설 — `git -C <경로>` / `git --git-dir=<경로>` (= 형태) / `git --git-dir <경로>` (공백) / `git --work-tree=<경로>` (= 형태) / `git --work-tree <경로>` (공백) 5종 변형 모두 인식해 *대상 경로의 브랜치*로 검사. 어느 cwd에서 호출하든 워크트리 브랜치 커밋이 *dev 직접 커밋*으로 오인되어 차단되던 마찰 해결. 차단 메시지에 *셸 prefix(`cd <경로> && git ...`) 형태는 hook 인식 X → `git -C <경로> ...` 형태 사용* 가이드 추가. `template/.claude/skills/task-close/SKILL.md` 호출 위치 정책 — *호출 위치 자유* (멀티세션 병렬 / 단일 메인 지휘 / 메인 spawn 서브 세션 모두 지원) + cwd 무관 동작 + 내부 git 명령 형태 강제 (`git -C "$WT_PATH" ...` / `git -C "$MAIN_WT" ...` 형태로만 발행, 셸 prefix·`--git-dir=`·`--work-tree=` 변형 영구 금지). `template/.project/rules/GIT_RULE.md` §Hook 안전망 + `plan/HOOKS.md` §4 정합 갱신
  - **F5 — Test Plan grep 동어반복 + end-to-end 회피 차단**: `template/.claude/skills/task-plan/SKILL.md` Step 5 가이드라인에 안티패턴 3종 추가 — (a) grep/Read-only 존재 확인 시나리오는 *보조 검증*(PASS 카운트 제외) (b) 요구사항당 *최소 1개 end-to-end 실동작 시나리오* 강제 (c) *무거운 검증 회피 영구 금지* (부담 이유로 grep 동어반복 대체 X, 최소 1회 실제 산출물 확인) + *요구사항 ↔ 시나리오 커버리지 점검 단계* 신설 (Test Plan 끝에 매트릭스 첨부 — *"누적/리셋 안 함"* 같은 요구사항 시나리오 누락 차단). `template/.claude/skills/task-test/SKILL.md` 수행 룰 #10 신설 — grep-only 시나리오 단독 PASS 단정 영구 금지 (실동작 시나리오 부재 시 UNCERTAIN/FAIL 판정 + 메인 보고). `template/.project/rules/TASK_DOC_RULE.md` §2.5 정합 갱신
  - **F4 — 워크트리 제거 시 외부 캐시 정리는 taskery 도메인 외 (제외)**: stash의 Xcode DerivedData 死 캐시 누적 마찰은 *프로젝트별 영역*. taskery는 범용 파이프라인 도구로 워크트리 제거까지가 책임 범위. 특정 케이스(Xcode 캐시)를 의식해 hook 진입점을 만드는 것조차 범용 도구 원칙 위반이므로 0.1.3 라운드에서 제외 — stash 영역에서 자체 처리
- `package.json` 0.1.2 → 0.1.3
- **0.1.3 정합 순회 — 본 라운드 변경에 영향받는 영역 일괄 정정 (cwd 무관 동작 정합 7곳 + 발행 후속 4곳)**:
  - cwd 무관 동작 정합 (F3 5종 변형 인식의 의도 = *호출 위치 자유 + cwd 무관 동작*. 특정 운영 모델 강제 X — 멀티세션 병렬 / 단일 메인 지휘 / 메인 spawn 서브 세션 모두 지원):
    - `template/.claude/skills/task-init/SKILL.md` Step 8 결과 보고 — 운영 모델 자유 명시 (워크트리 새 세션 / 메인 세션 그대로 / 메인 spawn 서브)
    - `template/.claude/skills/task-plan/SKILL.md` §멀티세션 메타 위치 — 워크트리 호출 default (멀티세션) + 호출 위치 자유 + cwd 무관 동작 명시
    - `template/.claude/skills/task-dev/SKILL.md` §멀티세션 메타 위치 — 동일 갱신
    - `template/.claude/skills/task-test/SKILL.md` §멀티세션 메타 위치 — 동일 갱신
    - `plan/SKILLS.md` §1 스킬 표 task-plan/dev/test 캡션 — *워크트리 호출 default (멀티세션) + cwd 무관*
    - `plan/SKILLS.md` §3.5 *호출 위치 정책 (0.1.3+ — cwd 무관 동작 보장)* 섹션 재작성 — 운영 모델 3가지(멀티세션 병렬 default / 단일 메인 지휘 / 메인 spawn 서브 세션) 모두 지원 + cwd 무관 동작 + 내부 명령 형태 강제 + 5종 변형 인식 명시
    - `README.md` §멀티세션 — 운영 방식 3가지(워크트리 새 세션 / 메인 1개 지휘 / 메인 spawn 서브) 자유 표기 (외부 평이체 정합)
  - 발행 후속 정합:
    - `plan/DISTRIBUTION.md` §5 manifest 예시 `"version": "0.1.2"` → *0.1.3*
    - `plan/HOOKS.md` 수정 이력 — 0.1.3 F3 §4 갱신 항목 기재
    - `plan/SKILLS.md` 수정 이력 — 0.1.3 F3 §1·§3.5 갱신 항목 기재
    - `plan/DISTRIBUTION.md` 수정 이력 — 0.1.3 manifest 버전 정합 항목 기재

---

## [0.1.2] - 2026-05-31

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
- **`/test-pipeline` 시뮬 9 task 라운드 발견 결함 5건 일괄 정정 (2026-05-31)** — `bin/lib.js` `getActiveTasks`: `--no-merged dev` 필터 제거 (분기 직후 빈 브랜치 = dev 동일 commit → *완전 머지 상태* 처리 → `getNextTaskNumber` 충돌 결함). `template/.claude/skills/task-init/SKILL.md` Step 4.1 같은 영역 본문 정합. `template/.claude/skills/task-close/SKILL.md` Step 1.3 *uncommitted 차단* 룰 제거 → *task-dev = git X / task-close = 자동 commit* taskery 정책 정합 + Step 6-3 *task-close가 uncommitted 변경분 정독 + Dev Plan Phase 매핑 → Phase별 commit 자동 생성* 책임 본문 강화 (자동 분리 코드 구현은 별도 라운드) + Step 4-b 자료 우선순위 1순위에 *plan 문서 (ROADMAP / FEATURES / ARCHITECTURE 등)* 추가 (task 문서와 동등 정독). `template/.claude/skills/task-test/SKILL.md` 수행 룰 9 추가 — *task.md 본문 메타 발언 (mismatch / aborted 의도 등)이 raw 시나리오 결과 판정 못 덮음* (결과 기반 판정 룰). `bin/taskery.js` prune `--help` / `-h` flag 처리 추가. `.gitignore` `.claude/` → `/.claude/` 루트 한정 정정 (template/.claude/는 배포물 영역)

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
| 2026-05-31 | `[Unreleased]` §수정 — `/test-pipeline` 시뮬 발견 결함 5건 일괄 정정 (lib.js getActiveTasks SSoT + task-init Step 4.1 + task-close Step 1.3/6-3/4-b + task-test 룰 9 + prune --help + .gitignore 루트 한정) |
| 2026-05-31 | `[Unreleased]` → `[0.1.2] - 2026-05-31` 발행 — 멀티세션 워크트리 + 백로그 + 충돌 해결 + `/test-pipeline` 발견 결함 정정 누적분 묶음 |
| 2026-05-30 | `[Unreleased]` §수정 보강 — 3차 검증 추가 누적 (closed-immutable.sh 주석 / plan/HOOKS §2·§3·§6 / plan/DECISIONS §5 / template/CLAUDE.md Hook 표 본문에 *spec-diffs / screenshots / mockup* 표기 일관성 정합 — mockup 누락 6건 보강) |
| 2026-05-30 | `[Unreleased]` §수정 보강 — 3차 검증 마지막 누적 (plan/DECISIONS §6 분산 원칙 표 — 스킬 path `<skill>.md` → `<skill>/SKILL.md` + CHANGELOG_RULE / MOCKUP_RULE 행 추가 + 테스트 명령 행 신설. plan/DISTRIBUTION §9 동기화 룰 예시 두 섹션 분리 정합. `/task-init` 블랙리스트 `Sources` 옛 표기 → `src / app / lib 등 프로젝트 소스 디렉토리` 언어/기술 중립 정합) |
| 2026-05-30 | `[Unreleased]` §수정 보강 — README.md 디렉토리 구조 표시에 신설 룰 / 자료 반영 (rules/ 안 CHANGELOG_RULE / MOCKUP_RULE + .project/ 직속 GLOSSARY.md + tasks/ 옆 BACKLOG / mockup 명시) |
| 2026-05-31 | `[Unreleased]` §추가 + §수정 — 0.1.2 백로그 스킬(`/add-backlog`) 신설 + 멀티세션 commit의 잘못 박힌 BACKLOG 경로 정정(글로벌 → 버전별). bin/lib.js 백로그 유틸 + CLAUDE.md 백로그 섹션 + 스킬 9종 표 + task-init §7.5 신규 + §4.2.5 신규 + task-close 노트 + GIT_RULE 출처 표 + plan/SKILLS.md §3.6 백로그 섹션 + §1 9종 표 + README 백로그 메모 단락 + 디렉토리 구조 9 skill + package.json 0.1.2 |
| 2026-05-31 | `[Unreleased]` §추가 정정 — `template/.project/BACKLOG.md 신규` 자기모순 항목 삭제 (표제는 *신규*인데 본문은 *plan-init이 생성, 별도 카피 불필요*로 모순. 실제 `template/.project/` 안 BACKLOG.md 파일 부재 — 신설된 적 없음). 정합 순회 1차 결함 fix |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 스킬 8종 → 9종 표기 갱신 (README §상세 문서 SKILLS.md 캡션 / template/CLAUDE.md 헤더 / plan/OVERVIEW.md §1·§3·§4·§6·§7 본문 다수 / plan/DECISIONS.md §9 결정 본문 / plan/SKILLS.md 제목+캡션) + bin/ 5 → 7 스크립트 표기 갱신 (OVERVIEW §4-1 디렉토리 / DISTRIBUTION §3 표 + status.js/prune.js 행 추가) + lib.js / status.js / prune.js / init.js / update.js / create.js / taskery.js 분량 갱신 (DISTRIBUTION §3) + 카피 대상 24 → 25 파일 / 8 → 9 스킬 본문 (DISTRIBUTION §4 + §8 files 배열) + proper-lockfile 외부 의존성 명시 (DISTRIBUTION §3) + plan/SKILLS.md §4 표 9 스킬 분량 실측 갱신 + §6 컨텍스트 관리 표 `/add-backlog` 행 추가 + OVERVIEW §4 본 리포 / 사용자 프로젝트 디렉토리 구조에 GLOSSARY.md / CHANGELOG_RULE.md / MOCKUP_RULE.md / add-backlog 미반영분 정합. 정합 순회 1차 결함 fix |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 정합 순회 2차 후속 정정. bin/taskery.js 헤더 주석 서브커맨드 목록에 `status` / `prune` 2행 추가 + package.json description *스킬 8종* → *9종* (npm 페이지 첫 화면) + plan/TASK-DOC.md §7 스킬 path *`<skill>.md`* → *`<skill>/SKILL.md`* (0.1.1 디렉토리 마이그레이션 후 갱신 누락분) + plan/DISTRIBUTION.md §5 manifest 예시 필드 순서를 실제 bin/init.js / bin/update.js writeManifest 호출 순서와 일치 + §11 동작 검증 표 본 세션 미실행 수치 인용 제거. package-lock.json 신규 추가 (0.1.2 멀티세션 Phase 1 commit에서 proper-lockfile 의존성 추가 시 누락된 lockfile 합류) |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 정합 순회 3차 최신 요구사항 기준 보강. README.md §자동 발동 예시에 `/add-backlog` 발화 패턴 한 줄 추가 (*"이 부분도 백로그에 추가해줘"* / *"나중에 할 일로 적어둬"*) + plan/OVERVIEW.md §9 *현재 상태 + 남은 작업* 본문에 *0.1.0 부트스트랩 시점 기록* 명시 박스 추가 (그 후 진척은 CHANGELOG.md 단일 진실 소스 link). 행위 변경 X — 외부 시각 9 스킬 정합 보강 + 시점 기록 명시 |
| 2026-05-31 | `[Unreleased]` §수정 추가 — 정합 순회 5차 잔존 결함 정정. plan/DISTRIBUTION.md §3 `bin/taskery.js` 분량 *1,694 B* → *1,870 B* (2차 commit에서 헤더 주석에 `status` / `prune` 서브커맨드 2행 추가했으나 §3 분량 표 갱신 누락분) + §8 `package.json` 메타 예시 *0.1.0 → 0.1.2* / `"engines.git": ">=2.31.0"` 추가 / `"dependencies": { "proper-lockfile": "^4.1.2" }` 신규 추가 (실제 0.1.2 package.json 본문과 일치) + template/.claude/skills/project-init/SKILL.md Step 4 폴더 구조 본문 + Step 7 빈 골격 점검 본문의 *코어 룰 (TASK_DOC_RULE / GIT_RULE)* 2개 표기 → *(TASK_DOC_RULE / GIT_RULE / CHANGELOG_RULE / MOCKUP_RULE)* 4개로 갱신 (CHANGELOG_RULE / MOCKUP_RULE 신설 후 본 스킬 본문 누락분 정합). 행위 변경 X |
| 2026-06-02 | `[Unreleased]` → `[0.1.3] - 2026-06-02` 발행 — stash FRICTION_LOG 2026-06-01 5건 마찰 일괄 정정 (F1·F2·F3·F5 반영, F4 stash 도메인 자체 처리로 제외). CLAUDE.md §3 모호 발화 자의 해석 금지 + §멀티세션 워크트리 메인 HEAD 떼기 금지 / git-guard.sh 5종 변형 인식 헬퍼 + 셸 prefix 가이드 / task-close 호출 위치 정책 — 운영 모델 자유(멀티세션 병렬 default / 단일 메인 지휘 / 메인 spawn 서브 세션) + cwd 무관 동작 + 내부 명령 형태 강제 / task-plan Step 4.5 #2 confirm 발화 강제 + Step 5 안티패턴 3종 + 요구사항 ↔ 시나리오 매트릭스 / task-test 수행 룰 #10 grep-only 보조 + 정합 갱신 4건(MOCKUP_RULE / GIT_RULE / plan-HOOKS / TASK_DOC_RULE) |
