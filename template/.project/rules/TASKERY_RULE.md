# TASKERY_RULE — taskery 참고서

> 사용법이 막혔을 때 읽는 참고서다. 매번 읽지 않는다 — 평소에는 `AGENTS.md`와 그 단계의 스킬만 읽는다.
> taskery 패키지가 관리하는 파일이라 `update`로 갱신된다. 이 리포만의 규칙은 `*.local.md`에 적는다.

## 1. taskery란

작업을 태스크 단위로 열고 마무리하는 도구다. 판단(요구 정리·코드 작성·완료 기준 작성·충돌 해결)은 AI가 하고, 누가 해도 결과가 같은 일(번호 발급·분기·기록·커밋·병합·정리)은 명령이 한다.

## 2. 태스크의 다섯 단계

| 단계 | 스킬 | 부르는 명령 |
|---|---|---|
| 시작 | `task-init` | `prepare-task` |
| 기획 | `task-plan` | `approve-plan` |
| 개발 | `task-dev` | `test-code` |
| 테스트 | `task-test` | `test-scenario` |
| 마무리 | `task-close` | `verify-close` → `commit-task` → `merge-task` → `close-task` |

- **크기**(`small`·`medium`·`large`)는 태스크 문서에 얼마나 적나를 정한다. small은 커밋 하나, medium·large는 Phase마다 커밋 하나다.
- **스위치**(기획·개발·테스트)는 그 단계를 정식으로 거치나를 정한다. 기본은 모두 켜짐이다. 개발 꺼짐 태스크는 코드를 바꾸지 않고 병합을 건너뛴다. 개발과 테스트를 둘 다 끌 수는 없다.
- **진행 범위**는 사용자의 가장 최근 지시를 따른다. 말하지 않으면 한 단계, "~까지"면 그 단계까지, "끝까지"면 병합까지. 범위와 무관하게 눈으로 확인할 시나리오·테스트 FAIL·풀지 못한 충돌에서는 멈춘다.
- 태스크 상태는 열림·닫힘 둘뿐이다. 단계 표는 명령이 성공할 때만 채워진다.

## 3. 명령

명령은 MCP 도구가 있으면 도구로, 없으면 `npx @angar2/taskery <명령>`으로 부른다. 막히면 명령이 왜 멈췄고 무엇을 하라고 알려 준다.

| 명령 | 하는 일 |
|---|---|
| `status` | 열린 태스크·단계 표·단계별 시간·문서 경로·워크트리 경로, 플랜별 시작할 수 있는 태스크·읽지 못한 항목 |
| `plan-init <slug> [--title "<제목>"]` | 다음 플랜 번호로 `plans/<NNN>_<slug>/PLAN.md` 틀 |
| `prepare-task "<제목>" --slug --type --size [--switch] [--range] [--plan] [--item] [--from] [--dev] [--no-worktree] [--no-branch]` | 번호·브랜치·워크트리·태스크 문서·기록 |
| `approve-plan <TASK>` | 태스크 문서 검사 → 계획 끝 기록 |
| `test-code [TASK]` | 등록된 코드 테스트 실행. 태스크를 주면 개발 칸 기록 |
| `test-code --register "<명령>" …` | 코드 테스트 명령 목록 등록(부를 때마다 전체 교체). 없으면 `--register none` |
| `test-scenario <TASK> <번호> pass\|fail "증거"` | 시나리오 결과. 모두 끝나면 테스트 칸 |
| `test-scenario <TASK> <번호> accept "<사용자가 한 말>"` | FAIL을 알고 넘어가기로 한 사용자 판단 기록 |
| `verify-close <TASK>` | 마무리 검사만 |
| `commit-task <TASK>` | Phase별 코드 커밋 + 병합 확인 요약 |
| `merge-task <TASK>` | 병합 잠금 안에서 부모 최신으로 rebase → 병합 |
| `close-task <TASK>` | 워크트리·브랜치 정리 → 닫기 → 백로그 연결 표시 → 변경 기록 → 시간 보고 |
| `prune [--yes]` | 닫힌 태스크에 남은 워크트리·브랜치 정리. 기본은 항목마다 묻는다. 커밋 안 된 변경이 있는 곳은 건너뛴다 |
| `backlog-add "<제목>" [--type <종류>]` | 백로그 번호를 발급해 `BACKLOG.md` 열린 항목 맨 위에 빈 양식 |
| `backlog-get [BL-번호]` | 번호를 주면 그 항목 전문, 없으면 열린 항목 목록 |
| `backlog-mark <BL-번호> <TASK>` | `--from` 없이 연 태스크를 백로그 항목에 연결 |
| `orca-dispatch-task <TASK> --agent claude\|codex --model <모델> [--note "<한 줄>"]` | 오케스트레이션이 Orca 새 탭에 태스크 세션을 띄우고 첫 지시문을 보낸다(Orca 전용). 탭 handle은 태스크 문서 메타 `tab`에 남는다 |
| `report-task <TASK> "<한 줄>"` | 태스크 세션이 오케스트레이션에 보고 한 줄을 남긴다(`.project/reports.log`) |
| `wait-reports` | 오케스트레이션이 백그라운드 셸로 걸어 두는 대기. 안 읽은 보고가 생기면 출력하고 끝나고, 보고 없이 10분이면 오래 조용한 태스크 탭 목록과 함께 끝난다 (CLI만) |
| `init` · `update` · `add <claude\|codex>` | 설치 · 갱신 · 플랫폼 추가 (CLI만) |

태스크 명령(`approve-plan`~`merge-task`)에 `--range "<새 범위>"`를 붙이면 태스크 문서의 범위 메모만 바뀐다.

## 4. 코드 테스트와 실사용 테스트

- **코드 테스트**(개발 단계): 린트·타입·빌드·단위 테스트처럼 **앱·화면을 켜지 않는** 명령만 등록한다. 3분이 기준이고, 넘으면 명령이 알린다(끊지 않는다).
- **실사용 테스트**(테스트 단계): 완료 기준 시나리오를 실제로 해 본다. 앱 실행 방법은 `TEST_RULE.local.md`에 적는다. 증거(실행 출력·화면 캡처 경로·사용자 확인 시각) 없는 PASS는 없다.

## 5. 워크트리

- 모든 태스크는 브랜치와 워크트리를 분기한다. 태스크 수행은 그 워크트리 안에서 한다.
- 워크트리는 Orca 탭 안이면 Orca가, 아니면 `~/.taskery/worktrees/<projectId>/`에 taskery가 만든다.
- 부모 브랜치 = 본진(리포 원래 폴더)이 서 있는 브랜치다. 본진은 다른 태스크가 병합받는 자리라 부모 브랜치에 그대로 둔다.
- 생략은 사용자가 명시할 때만: `--no-worktree`(본진에서 브랜치만), `--no-branch`(본진의 현재 브랜치에서). 생략 태스크가 열려 있는 동안 본진이 부모 브랜치를 떠나 있거나 커밋 안 된 코드를 가지면, 다른 태스크의 `prepare-task`·`merge-task`가 원인 태스크를 알리고 멈춘다.
- 워크트리를 지우는 일은 태스크를 연 주인이 본진에서 `close-task`로 한다. 정리가 막혀 남은 것은 `prune`으로 정리한다.
- 새 워크트리 준비: `.taskery-manifest.json`의 `buildOutput`에 등록된 빌드 결과 폴더(예: Rust `target`)를 본진에서 APFS 복제(`cp -Rc`)로 심고, 워크트리마다 자기 폴더로 빌드한다. 등록이 없거나 APFS가 아니면 건너뛴다. `package-lock.json`이 있으면 `npm ci`를 한다. 등록은 `init`이 스택을 보고 적고(Xcode 프로젝트는 `DerivedData` — 코드 테스트 명령에 `-derivedDataPath DerivedData`를 붙인다), 바꿀 때는 매니페스트를 고친다. 등록한 폴더는 `.git/info/exclude`에 들어가 코드로 커밋되지 않는다. 끝난 태스크를 `close-task`로 닫을 때 그 워크트리의 빌드 결과 폴더를 본진으로 복제해 다음 태스크의 씨앗으로 쓴다.

## 6. taskery 파일 — 모두 git 밖, 본진에 한 벌

`.project/`·`AGENTS.md`·`CLAUDE.md`·`.claude/`·`.codex/`·`.mcp.json`·`.taskery-manifest.json`은 git이 추적하지 않는다(`.git/info/exclude`). 워크트리에는 `AGENTS.md`·`CLAUDE.md`가 복사되고 나머지는 본진을 가리키는 링크로 놓인다 — 어느 워크트리에서 고쳐도 본진의 한 벌이 바뀐다. 커밋 대상은 코드뿐이다.

```
.project/
├─ rules/        TASKERY_RULE · GIT_RULE · TASK_DOC_RULE · MOCKUP_RULE · CHANGELOG_RULE · TEST_RULE.local · DEV_RULE.local
├─ spec/         제품 문서 — 내용 있는 것만
├─ plans/<NNN>_<slug>/
│  ├─ PLAN.md    목표 + 태스크 목록
│  └─ tasks/     태스크 문서 (TASK_DOC_RULE)
├─ changelog/    월별 변경 기록 (CHANGELOG_RULE)
├─ PROJECT.md · GLOSSARY.md · BACKLOG.md · FRICTION_LOG.md
├─ reports.log   오케스트레이션 보고 (report-task가 쓴다)
└─ .state/       명령이 따로 저장하는 기록과 잠금 파일 — 읽거나 고치지 않는다
```

## 7. PLAN.md 태스크 목록

```markdown
## 태스크 목록
1. 로그인 화면 — 선행: 없음
2. 로그인 API 연결 — 선행: 1
```

- 한 줄 형식은 `<항목 번호>. <한 줄 설명> — 선행: <항목 번호들 또는 없음>`이다.
- `prepare-task --item <항목 번호>`로 열면 명령이 그 줄 끝에 `(TASK-012)`를 붙인다.
- `status`는 끝나지 않았고 열린 태스크가 없으며 선행 항목이 모두 끝난 항목을 시작할 수 있는 태스크로 보여 준다. 항목이 끝났다 = 줄 끝에 가장 최근 연결된 태스크가 마무리 기록(병합, 병합이 없는 태스크는 `commit-task` 완료)을 남기고 닫힌 것. 형식을 읽지 못한 줄은 '읽지 못한 항목'으로 따로 보여 준다.

## 8. 로컬 규칙

- 이 리포만의 규칙은 `.project/rules/<문서>.local.md`에 적는다. `update`는 `*.local.md`를 건드리지 않는다.
- `TEST_RULE.local.md` — 이 프로젝트의 앱 실행 방법(검수 서버·터널 포함)과 테스트 방식.
- `DEV_RULE.local.md` — 이 프로젝트의 구현 규칙.
- 코드·테스트 방식에 관한 새 규칙은 AI가 문장을 제안하고 사용자가 승인한 뒤 넣는다.

## 수정 이력

| 날짜 | 변경 사항 |
|---|---|
| 2026-10-01 | 1.0판 — 참고서로 다시 썼다. 7상태·멀티세션 내부 동작·훅·제품 관통 문서 7종·멀티리포 설명을 빼고, 다섯 단계·명령·워크트리·git 밖 파일·PLAN.md 목록 형식을 담았다 |
| 2026-10-01 | S3 — 오케스트레이션 명령 `orca-dispatch-task`·`report-task`·`wait-reports`와 `reports.log`를 더했다 |
| 2026-10-01 | S2 — `prune`·`backlog-*`·`prepare-task --from`·`status`의 시작할 수 있는 태스크, 새 워크트리 준비(빌드 결과 폴더 APFS 복제·exclude 등록·닫을 때 본진 씨앗 갱신·`npm ci`)를 더했다 |
