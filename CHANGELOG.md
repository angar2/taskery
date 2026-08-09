# Changelog

이 파일은 taskery의 모든 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 기반, 버전 운영은 [Semantic Versioning](https://semver.org/) 따른다.

---

## [Unreleased]

## [0.8.1] - 2026-08-09

0.7.0의 진입 문서 이행(`bin/migrate.js`)이 실사용 리포 2곳(`stash`·`recordion`)의 `AGENTS.md`를 손상시킨 것을 수선했다. 뿌리는 한 줄짜리 실수가 아니라 **리포 값을 품는 파일을 템플릿과의 바이트 일치로 관리하려 한 것**이다 — 값이 들어간 순간 일치가 불가능하므로, 이행이 끝난 뒤의 `AGENTS.md`는 갱신하면 값이 사라지고 갱신하지 않으면 구판에 고착되는 두 결말밖에 없었다.

### 변경

- **`AGENTS.md`를 매 update 재조립 대상으로 전환** — 1회성 이행을 없애고, `update`가 호출될 때마다 **현 문서에서 리포 내용을 건져 새 템플릿에 끼워넣는다**. `AGENTS.md`는 update의 4 분기(해시 동일성 판정)에서 **항상 제외**된다. 조립식은 *새 템플릿 헤딩·인용문 + 현 문서의 리포 내용*이며, 값 줄·표·산문은 판정 대상이 아니라 전부 보존된다. 인용문만 판정해 **과거 전 버전 템플릿 문안(고정 목록) 또는 현재 템플릿에 있으면** taskery 소유로 보고 새 문안으로 교체하고, **어느 쪽에도 없으면 리포 소유로 보존**한다. 판정 실패는 보존 쪽으로 실패한다 — 목록에 없으면 남긴다. 결과적으로 손상된 리포는 다음 `update` 한 번으로 자동 복구되고, 이후 버전에서 템플릿 지침이 바뀌어도 리포 값은 그대로 둔 채 지침만 갈린다.

### 수정

- **이행이 절을 통째로 이식해 폐지된 문서 링크가 부활하던 문제** — 옮겨야 할 것은 리포 값인데 절 본문 전체를 떼어 새 템플릿 본문을 버리고 갈아끼웠다. 그 결과 구판 설명문이 새 판을 덮었고, 특히 **같은 update가 폐지시킨 `.project/TEST-GUIDE.md`를 가리키는 링크가 되살아나** 존재하지 않는 파일을 참조하게 됐다. 이제 taskery 문안만 걷어내고 리포 내용은 전량 보존하며, 리포가 직접 쓴 문장 안의 죽은 경로는 우리가 수행한 이름 변경에 한해 1:1로 치환하고(`TEST-GUIDE.md` → `rules/TEST_RULE.local.md`) 치환한 줄을 출력한다.
- **manifest에 조립 전 템플릿 해시를 기록하던 문제** — 값을 주입한 파일을 써 놓고 해시는 주입 전 템플릿에서 계산해, 실제 파일과 영구 불일치했다. 매 `update`마다 손대지 않은 파일이 *"사용자 customize 검출"*로 오검출됐다. 이제 **조립 결과물**의 해시를 기록한다. 이 수정은 위 재조립 전환과 반드시 함께여야 한다 — 재조립 없이 해시만 맞추면 다음 update가 *"사용자가 안 고쳤다"*로 판정해 백업도 확인도 없이 리포 값을 덮어쓴다.
- **구형 `.project/AGENT-GUIDE.md`가 이관 후에도 남던 문제** — 활성 plan을 manifest로 이관하고도 원본을 정리하지 않아 같은 정보를 두 곳에 보유했고, manifest 값이 비는 순간 구형 폴백이 낡은 값을 되살릴 수 있었다. 이제 이관이 확인되면 `AGENT-GUIDE.md.obsolete`로 이름을 바꿔 폴백 경로에서 제외한다(내용은 보존하며 삭제하지 않는다).
- **리포 값 칸 밖의 내용이 조용히 사라지던 문제** — 재조립이 상시 동작이 되면서, 값 4개 절 밖에 사람이 적어 둔 줄이 경고 없이 소실될 수 있었다. 이제 결과물에 싣지 않은 줄을 전량 출력하고 원본 위치(`AGENTS.md.bak`)를 알린다. 최초 이행 시에는 억제한다 — 그때의 미반영분은 전량이 구 taskery 문서 본문이라 경고가 아니라 노이즈다(0.6.1 기준 88줄).

## [0.8.0] - 2026-08-09

0.7.0을 실사용한 리포에서 올라온 마찰 5건을 한 번에 수선했다. 공통 원인은 **결정적으로 강제할 수 있는 것을 세션의 준수에 맡겨 둔 것**이다 — 문서 갱신·표기 규격·시험지 출제 모두 "잘 지키자"는 지시만 있고 코드가 검사하지 않았다.

### 추가

- **`/task-close` 문서 게이트 — PLAN 체크리스트·수정 이력 누락 시 차단** — 태스크를 닫을 때 갱신해야 할 문서 목록이 스킬 본문의 점검표로만 있어, 세션이 건너뛰어도 close가 그대로 통과했다. 이제 `close`가 **모든 변이(mutation) 앞에서** 두 곳을 grep으로 검사한다 — 로드맵 출처(`ST-N`/`RM-NNN`) 태스크의 `PLAN.md` 체크리스트, 그리고 `spec-diffs/`가 가리키는 각 문서의 `## 수정 이력`. 누락 시 `blocked:'docs'`(npx exit 4)로 멈추며 빠진 파일 목록을 돌려준다. **게이트가 모든 변이 앞이라 차단 시점에 커밋도 상태 전이도 일어나지 않는다** — 문서를 채운 뒤 그대로 재호출하면 된다. 검사 대상이 없는 경우(백로그·직접 요청 출처, `spec-diffs` 부재, 대상 문서 부재)는 통과한다 — 게이트의 실패 방향은 *막는 쪽이 아니라 놓치는 쪽*이다.
- **CHANGELOG 자동 작성 — `close`가 항목을 직접 append** — 프로젝트 CHANGELOG 갱신이 세션 준수에 의존해 자주 누락됐다. 이제 `close`가 항목 1개를 직접 쓴다(헤더는 task 문서 H1 제목, 날짜, 헤더 유형, 변경 요약은 Dev Plan Phase 명 목록). 단일 `CHANGELOG.md`와 월별 `<YYYY-MM>.md` 두 형식을 모두 지원하고 파일이 없으면 생성하며, 최신 항목을 맨 위에 삽입한다. `[TASK-NNN]` 중복 가드가 있어 콜백 후 재호출해도 항목이 겹치지 않는다. 세션은 요약을 보강하고 싶을 때만 편집한다.
- **`/task-plan` 출제 분리 — Test Plan을 격리 서브에이전트가 출제** — 구현자가 출제를 겸하면 요구사항을 오독했을 때 *같은 오독이 문제지와 답안지에 함께* 들어가 검증이 오독을 잡지 못한다. 해석 여지가 있는 태스크(유형이 feature/improvement/bug이면서 동작이 자명하지 않은 경우)는 Test Plan을 격리 서브에이전트 **B**가 출제한다 — 입력은 Requirements 합의문 전문·승인된 목업·`TEST_RULE.local.md`뿐이고, **B 기동 시점에 Dev Plan은 존재하지 않는다**(구현 관점의 유입이 구조적으로 불가능). B 원문은 `<NNN>_<slug>_test-plan-origin.md`로 그대로 보존한다. 메인의 수정권은 **방식 칸만**, 그것도 `TEST_RULE.local.md` 등재 경로로 교체할 때만이며, 시나리오 칸과 PASS 기준 칸은 불가침이다. 원문과 달라지는 모든 칸에는 플래그(`【A수정|사용자결정|보수 · 원안: "…"】`)를 단다.
- **`/task-test` 시험지 오염 대조 + 음성 대조** — 위 분리의 실효를 담보하는 두 수행 룰을 신설했다. **오염 대조**: 원문이 있으면 검증 전에 칸 단위로 대조해, 플래그 없는 차이는 무조건 오염으로 반려한다(방식 교체를 빙자해 기대값이 함께 바뀐 경우도 오염). **음성 대조**: 핵심 시나리오 최소 1개는 구현을 일시 되돌린 상태에서 *실제로 FAIL함*을 확인한 뒤 즉시 원복하고 그 사실을 통과 근거에 포함한다 — 통과만 보면 무력한 테스트를 알 수 없기 때문이다. 코드 수정 금지 원칙의 유일한 예외이며 원복 흔적 0이 의무다. 메인은 격리 세션 전후로 워크트리 스냅샷(추적 변경·목록·미추적 파일 내용 해시)을 대조해 원복 실패를 잡는다.
- **`.codex/agents/test-plan-author.toml`** — 출제 분리의 코덱스 기준선. 클로드의 격리 호출과 동일 효과를 보장한다.

### 변경

- **점유 스위트에 "출구"를 강제** — 화면·입력을 점유하는 자동화(XCUITest·headed 브라우저 E2E 등)를 Test Plan에 넣을 때, 기존 지침은 격리 실행 경로가 없으면 `[USER]`로 강등하라고만 해 매번 같은 자리에서 왕복이 반복됐다. 이제 `/task-plan`이 5단계로 출구를 확정한다 — `TEST_RULE.local.md` *테스트 실행 환경* 절 확인 → 격리 경로 있음이면 `[AUTO]` → *"매번 승인"* 결정이 기록돼 있으면 승인 표기(질문 없음) → 아무 기록도 없을 때만 1회 질문 → **어느 답이든 절에 기록**한다. 격리 경로를 두지 않기로 한 결정도 *"없음 — 매번 승인(사용자 결정 YYYY-MM-DD)"*로 남겨 미결정 상태와 구분한다. 대상은 점유 *동작* 스위트에 한정되며, 시각 캡처 방식은 기존 원칙(경로 없으면 조용히 `[USER]` 폴백) 그대로다.
- **`CHANGELOG_RULE` 개정 — 작성 주체를 close CLI로** — 위 자동 append에 맞춰 §2 항목 형식·필수 필드와 §4 task-close 흐름을 고쳤다. CLI 자동 작성분이 기본이고 세션·사용자는 보강만 한다(closed 잠금은 task 문서에만 걸리므로 changelog는 자유 편집 대상이다).

### 수정

- **`- 파일:` 다중 파일 표기를 close 파서가 경로 하나로 읽던 문제** — `- 파일: a.ts · b.ts · c.ts`처럼 한 Phase에 여러 파일을 적으면 파서가 쉼표만 분리해 줄 전체를 경로 하나로 읽었고, 결국 `blocked:'mapping'`으로 멈춰 Phase 커밋을 손으로 만들어야 했다. 이제 쉼표와 가운뎃점(`·`)으로 분리하고, `- 파일:` 다음의 들여쓴 하위 목록도 수집하며, `(신규)`·`(수정)` 류 꼬리 괄호 주석을 제거한다. 경로 문자인 `/`는 분할자로 쓰지 않는다. 단일 파일 표기는 동작이 그대로다. 표기 규격 자체가 없던 것이 근본 원인이라 `/task-plan` Dev Plan 템플릿과 `GIT_RULE`에 규격(권장=들여쓴 목록, 허용=쉼표·가운뎃점 한 줄)을 명문화하고, `blocked:'mapping'` 메시지에 표기 확인 힌트를 넣었다.
- **`update` 이관이 `TEST_RULE.local.md` 필수 절을 만들지 않던 문제** — 0.7.0의 `TEST-GUIDE.md` → `TEST_RULE.local.md` 이관은 기존 본문만 옮겨, `TEST-GUIDE`에 없던 필수 절(*테스트 실행 환경* / *범위·방식 정책*)이 통째로 빠진 채 남았다. 이제 이관 시 없는 절만 골격으로 덧붙이고(헤딩은 접두 일치로 검사), 어떤 절을 추가했는지 이관 완료 출력에 알린다.

## [0.7.0] - 2026-08-09

0.6.1까지 사용법·규칙·리포 값이 진입 문서와 스킬 본문에 흩어져 있어, 세션이 *taskery를 어떻게 쓰는가*를 이해할 단일 문서가 없었다. 문서 체계를 재편해 **진입 문서는 지침만, 사용법은 `TASKERY_RULE.md` 한 곳**으로 모으고, 활성 plan의 단일 진실을 마크다운에서 manifest로 옮겼다. 기존 설치본은 `npx @angar2/taskery update`가 리포 값을 이식하며 이행한다.

### 추가

- **`.project/rules/TASKERY_RULE.md` — taskery 사용 설명서 (코어 룰 5번째)** — 세션이 taskery 자체를 이해할 단일 문서가 없었다. 어느 상황에 어느 규칙을 쓰는지, 규칙이 없을 때 어떻게 새로 만드는지가 어디에도 적혀 있지 않아 진입 문서와 스킬 본문에 조각조각 흩어져 있었다. task 라이프사이클(7상태·어느 스킬을 언제) · plan/task/백로그 관계 · 스킬 10종 · 멀티세션 워크트리 · 문서 체계 지도 · `.local.md` 커스텀 체계 · **규칙 신설 절차** · 폴더 구조 · 동기화·멀티리포를 한 문서에 모았다. 진입 문서는 이 문서를 *필독하라*고 지시할 뿐 사용법을 담지 않는다. 상세 절차는 각 `SKILL.md`가, git 정책은 `GIT_RULE`이 계속 담당한다(경계를 머리말에 명문화).
- **규칙 신설 절차** — 트리거 2종(사용자가 언급·불만 / 세션이 작업 중 인지) → **판단**(모든 리포에서 재발할 taskery 결함이면 `/log-friction`, 이 리포 특성이면 해당 `.local.md`) → **반드시 사용자에게 질문** → 승인 시 생성. `/task-close`의 마찰 감지 단계에도 같은 갈래를 배선했다(임의 생성 금지).
- **`plan-switch` 서브커맨드** — `npx @angar2/taskery plan-switch <NNN_slug>`. 대상 plan 폴더 실재를 검증한 뒤 활성 plan을 전환한다. 활성 plan이 문서에서 manifest로 옮겨가면서 필요해진 입구.
- **`status`에 활성 plan 출력** — 진입 문서와 스킬들이 *"활성 plan은 `status`로 확인"*이라 지시하는데 정작 CLI가 그 값을 출력하지 않았다(MCP 도구만 반환). 미설정이면 다음 행동(`/plan-init` 또는 `plan-switch`)까지 안내한다.
- **`/project-init`에 리포 로컬 룰 초안 생성 + 진입 문서 값 채우기** — `TEST_RULE.local.md`·`DEV_RULE.local.md`는 프로젝트마다 달라 공통 배포가 불가능하지만 **모든 리포에 있어야 한다**(없으면 세션이 그 리포 방식을 모른 채 일반론으로 진행). 리포를 분석해 초안을 제시하고 승인 후 생성한다. 더해 `AGENTS.md`의 리포 값 4칸(메타·검증·테스트·검수 명령)을 채우는 단계를 신설했다 — 0.6.1까지 이 칸을 채우는 주체가 어느 스킬에도 없어 placeholder가 남으면 `/task-dev`·`/task-close` 게이트가 실행할 명령을 찾지 못했다.

### 변경

- **활성 plan의 단일 진실을 문서에서 `.taskery-manifest.json`으로 이관** — `getActiveVersion`이 `.project/AGENT-GUIDE.md`의 마크다운 헤딩을 파싱하던 구조는 주석·서식 변화에 취약했다(recordion에서 자기 골격을 자기가 못 읽어 `scaffoldError` 6회). 이제 `activePlan` 필드가 기준이고, **구형 문서는 읽기 폴백으로만 남는다** — `update` 전 리포도 그대로 동작한다. `update`가 구형 값을 1회 이식하며, 이식 후에도 파일은 삭제하지 않는다.
- **진입 문서 단일화 — `AGENTS.md`가 본문, `CLAUDE.md`는 임포트 한 줄** — 같은 내용을 두 파일에 미러링해 한쪽만 고쳐지는 드리프트가 있었다. `AGENTS.md`를 플랫폼 무관 자산으로 올려 항상 설치하고, `CLAUDE.md`는 `@AGENTS.md` 한 줄로 축약했다(Claude Code는 `AGENTS.md`를 자동 로드하지 않으므로 임포트가 필요). 새 `AGENTS.md`는 **에이전트 최상위 지침 + 이 리포의 값**만 담는다 — taskery 사용과 규칙 준수를 강제하는 문구, `TASKERY_RULE.md` 필독 지시, 그리고 규칙·사용법을 이 문서에 추가하지 말라는 가드.
- **`AGENT-GUIDE.md` 폐지** — 활성 plan은 manifest로, 사용법 성격의 내용은 `TASKERY_RULE.md`로 흡수했다. `/project-init`이 더 이상 생성하지 않고, 스킬들은 `status`로 활성 plan을 확인한다. 기존 설치본의 파일은 **삭제하지 않는다**(사용자 파일 불가침).
- **`TEST-GUIDE.md` 폐지 → `TEST_RULE.local.md`로 통합** — *어떻게 실행하나*(TEST-GUIDE)와 *무엇을 얼마나 검증하나*(TEST_RULE.local)를 나눠 둔 구조가 실사용에서 계속 헷갈렸고, 위치도 `.project/` 루트라 룰이 아닌데 룰처럼 보였다. 한 문서로 합치고 `.project/rules/`로 옮겼다. `update`가 기존 내용을 1회 이관 제안한다(원본 보존). 구형 리포용 폴백도 남긴다.
- **`FRICTION_LOG.md` 생성형 전환** — 빈 템플릿을 배포하지 않고 `/log-friction`이 첫 기록 시 만든다.
- **`.local.md` 구속력 명문화** — 코어 룰 4종 머리말에 통일 문안을 넣었다: 로컬 조항은 코어와 **동등한 구속력**을 가지며, 겹치면 로컬이 최우선이고 **겹치지 않는 로컬 조항도 그대로 준수**한다. 로컬이 뒤집을 수 없는 안전선(멀티세션 불변식·git은 `/task-close`만·destructive 승인·상태 전이 검증)도 함께 명시.

### 수정

- **`update`가 `.gitignore`를 통째로 덮어쓰던 문제** — `template/.gitignore`가 관리 자산인데 실사용 리포는 대부분 이 파일을 manifest에 들고 있지 않아(init 이전부터 존재), `update`의 *신규* 분기가 그대로 복사해 사용자의 `node_modules`·빌드 산출물·프로젝트 고유 무시 규칙을 전부 지웠다. 이제 **덮어쓰지 않고 빠진 줄만 덧붙인다**. 0.6.1 이하에도 있던 결함이다.
- **`set-status`가 호출 위치에 의존하던 문제** — 미등록 케이스에서 메인 워크트리에서 부르면 task 문서를 찾지 못해 실패했다. 스킬들이 *"호출 위치 자유"*를 전제하므로 1차 탐색 실패 시 진행중 task의 워크트리를 역조회해 재탐색한다.
- **task 자동 선택이 메인 워크트리에서 오판하던 지시** — `/task-plan`·`/task-dev`·`/task-test`가 인자 없이 호출됐을 때 `ls .project/tasks/<NNN_slug>/`로 후보를 찾게 돼 있었는데, 미등록 케이스(기본값)에서는 task 문서가 각 워크트리 안에만 있어 메인에서는 *"진행할 task가 없다"*고 잘못 종료했다. `status`의 진행중 목록을 기준으로 바꾸고 그 이유를 함께 적었다.
- **진입 문서 미기입 가드** — `## 검증 명령`이 placeholder(`<예: …>`)로 남아 있어도 `/task-dev`·`/task-test`가 그대로 실행을 시도했다. 값이 placeholder이거나 비어 있으면 실행하지 않고 `/project-init` 안내 후 중단한다.
- **스킬 표기 오류 4건** — `registered` 기본값이 실제(`false`)와 반대로 읽히던 *"(퍼블릭 리포 default)"* 딱지 제거 / task 문서 *"6 섹션"*을 실제(헤더 표 + 본문 5 섹션)와 일치 / `/plan-init`이 존재하지 않는 제품 관통 문서를 수정하라던 지시에 부재 시 처리 명시 + 글로벌 `BACKLOG.md` 생성 책임 명시 / `/project-init`의 실행 불가능한 커밋 경로(task 워크트리와 메인 워크트리가 달라 성립하지 않음) 제거.

## [0.6.1] - 2026-08-08

두 실사용 프로젝트(stash·recordion)의 FRICTION_LOG 28행을 전수 평가해 13건으로 정리하고, 그중 **스킬 지시문으로 닫히는 7건**을 반영했다. 코드(`bin/`) 변경 0 — 전부 `template/` 자산이므로 `npx @angar2/taskery update`로 받는다.

### 추가

- **프로젝트별 로컬 룰 입구 — `DEV_RULE.local.md` / `TEST_RULE.local.md`** — 프로젝트마다 구현·테스트 방식이 다른데 공통 규칙만 강제되던 문제를 닫는다. `.local.md` 보호(`isLocalOverride` — `npx update` 미터치)는 이미 구현돼 있었으나 **이를 읽는 스킬이 하나도 없어** 파일을 만들어도 무시됐다(스킬 9종 전체 grep 0건). 이제 `/task-dev`(구현·테스트 실행)·`/task-test`·`/task-plan`(검증 범위·방식)·`/task-close`(`GIT_RULE.local.md`)가 각 룰을 읽고 겹치는 조항은 **로컬 우선** 적용한다. 격리 세션 prompt에도 `TEST_RULE.local.md` 경로를 전달하므로 독립 검증도 같은 규칙을 따른다(파일 부재 시 그 줄 제외). 코어 `DEV_RULE.md`·`TEST_RULE.md`는 두지 않는다 — 코어 규칙의 원본은 스킬 본문이고, 코어 파일을 만들면 이중 유지보수가 된다.
  - **로컬 룰이 뒤집을 수 없는 안전선** 명시: 멀티세션 불변식(머지 락 · 메인 워크트리 테스트 금지 · git은 `/task-close`만) · destructive 명령 사용자 승인 · 상태 전이 유효성.
  - 죽은 룰 배선 복구 — `MOCKUP_RULE.md`는 `project-init`만 언급하고 정작 목업을 만드는 `/task-plan`이 읽지 않았다. `CHANGELOG_RULE.md`도 마찬가지로 `/task-close`의 문서 갱신 단계에 연결했다.
- **`TEST-GUIDE.md`에 *테스트 실행 환경* 절** — UI를 실제 조작하는 스위트를 사용자의 화면·입력을 뺏지 않고 돌리는 경로(창 숨김·헤드리스 플래그 / 컨테이너·가상 디스플레이 / VM / CI 러너)를 프로젝트가 선언하는 자리. 본 문서(*어떻게 실행하나*)와 `TEST_RULE.local.md`(*무엇을 얼마나 검증하나*)의 역할 구분을 머리말에 명시.

### 변경

- **테스트 재실행 범위 비례 — 전체 스위트는 태스크당 원칙 1회** — `/task-dev` Step 6.5의 *"`## 테스트 명령`을 전부 실행"*이 **구현 완료 1회 게이트**를 뜻하는데 그렇게 읽히지 않아, 검수 피드백으로 한 줄 고칠 때마다 전체 E2E를 재실행하는 낭비가 반복됐다(recordion TASK-009 한 태스크에서 6회 이상, 사용자 대기 수십 분). *수정 루프 국면*(검수 피드백 / `/task-test` FAIL 재진입)을 별도 국면으로 정의: ① 매 사이클은 린트·타입체크 + 변경이 닿는 테스트만 ② 전체 게이트는 국면 끝 1회 ③ 러너가 빌드를 포함하지 않으면 빌드 선행(옛 산출물로 돌면 없는 버그를 쫓는다) ④ 무관한 테스트가 깨질 때만 범위 확대 ⑤ 회귀 누락은 국면 끝 1회 + 격리 세션의 이중 게이트가 방어 ⑥ **`/task-test`로 바로 이어가면 국면 끝 1회도 생략** — 격리 세션이 같은 스위트를 다시 전부 실행하므로 연달아 두 번 도는 셈이다(그때의 `developed` 전이 근거를 함께 명시). 더해 **테스트 신설도 요구 범위에 비례** — 기존 스펙이 덮는 영역을 중복 검증하는 테스트를 새로 만들지 않는다(스위트가 커질수록 이후 모든 task의 비용이 늘어난다).
- **화면·입력 점유 스위트 자동 실행 금지** — 실제 앱을 띄워 UI를 조작하는 스위트(XCUITest·headed 브라우저 E2E 등)가 자동 게이트에서 돌아 사용자가 컴퓨터를 쓰지 못하는 마찰이 두 프로젝트에서 반복됐다(stash TASK-097 입력 강탈, recordion 창 수십 회 표시). `## 테스트 명령`이 단일 진실 소스라는 원칙은 유지하되 실행 방식을 3분기로 규정: *격리 실행 경로 선언됨* → 그 경로로 자동 실행 / *경로 없고 비점유 부분만 한정 실행 가능* → 그것만 실행 / *한정 수단도 없음* → **자동 실행 금지, 소요·영향을 예고하고 승인 후 실행**. 격리 세션에도 같은 제약(룰 17)을 걸고, 실행하지 않은 시나리오는 **`UNCERTAIN(실행 보류)`**(신설 3번째 종류)로 리턴해 결과 형식·메인 분기·상태 전이까지 경로를 연결했다(승인 실행 / 나중에 / 격리 경로 마련 / 보류인 채 마무리 4갈래). `/task-plan`도 점유 스위트를 `[AUTO]`로 두려면 격리 경로를 요구해 왕복을 예방한다.
- **`/task-close`에 문서 갱신 훑기 단계(Step 2.5) 신설** — PLAN.md task 체크리스트가 5태스크 연속 비어 있었고, 26개 문서에 `## 수정 이력`이 하나도 없었으며, CHANGELOG는 6태스크 내내 빈 채였다(recordion). 세 건 모두 *갱신 주체가 어느 스킬에도 없다*는 같은 원인이다. 검증 게이트 뒤·`close` 호출 앞에 점검 6항(PLAN 체크리스트 / ROADMAP Stage / `changelog/<YYYY-MM>.md` **없으면 생성** / 제품·plan 문서 수정이력 / 후속 후보는 `backlog_add` 도구 / spec-diff 정합)을 두고, 등록·미등록 케이스별 편집 위치를 명시했다(미등록분은 close의 문서 커밋이 수거).
- **격리 검증 실효성 강화 — 픽스처 현실성·어서션 정면성** — 격리 세션을 2회·16분 돌리고도 결함 4건을 놓친 사례(픽스처가 정수 시각만 심어 소수 불일치가 가려짐), 어서션이 요구사항 *옆*을 겨눠 통로가 열린 채 스펙 113개가 전부 통과한 사례를 반영. 펜스 룰 15·16 신설 — 픽스처가 실제 산출물과 형식·정밀도가 같은지 의심하고 **실제 writer로 재생성해 재실행한 결과로 판정**, 기대값이 요구사항을 **정면으로** 겨누는지 확인(버튼 `disabled` 확인 같은 우회 지표는 PASS 기준이 될 수 없다). `/task-plan`에도 같은 기준 + **흐름 계층 시나리오**(상태 함수를 엮는 순서에서 나는 결함) 조항, `/task-dev`에 **신규 테스트 음성대조**(구현을 일시 되돌려 실제 FAIL하는지 확인) 추가.
- **시각 `[AUTO]` 분류에 실행 경로 조건** — 목업이 있다는 사실만으로 `[AUTO]`(캡처-목업 대조)가 성립한다고 단정해, 캡처 도구가 없는 프로젝트에서 `/task-test`가 *시험문제 결함*으로 반려하는 왕복이 있었다(stash TASK-098). 목업 존재는 *정답지* 확보이지 *실행 경로* 확보가 아니다. `TEST-GUIDE`의 *시각 실행* 절에 캡처 경로가 있을 때만 `[AUTO]`(원칙)이고 없으면 `[USER]` 폴백이며, 시각 방식만은 경로가 없다고 사용자에게 도구 도입을 요구하며 멈추지 않는다. 격리 세션 룰 4·14에도 같은 단서를 걸어 계획 단계의 분류를 뒤집지 않도록 했다.
- **USER 검수 가이드 형식** — 검수 항목이 축약어로만 쓰여 사용자가 읽지 못한 마찰을 반영. 각 항목은 **왜 필요한지 → 화면 어디를 어떻게 조작하는지 → 무엇이 보이면 정상/문제인지** 세 요소를 담고, 토큰·경로 같은 재료는 *"네 것을 넣어라"* 대신 **세션이 리포에서 찾아 값 또는 위치를 제공**한다. 사용자가 스크린샷을 주면 체크리스트 전 항목과 1:1 대조한다(물어본 항목만 답하다 이미 찍혀 있던 결함을 놓친 사례).
- **검수 서버 중복 기동 방지** — `Port … is in use` 경고를 지나쳐 앱을 두 개 띄우고, 정리할 때 부모 프로세스만 종료해 창이 남은 마찰이 재발했다. 기동 전 포트·프로세스 확인 + 종료 시 자식 프로세스까지 정리를 `/task-dev`·`/task-test` 기동 지점 3곳과 `GIT_RULE` §멀티세션 검수 환경에 명시.

### 수정

- **`/task-init` 반환 필드 목록에 `parent` 누락** — 0.6.0에서 `fork`·`task_init`이 `parent`(부모 브랜치)를 반환하도록 바뀌었으나 스킬 문서가 갱신되지 않아, 기재된 목록과 실제 반환이 어긋나 있었다.
- **`/task-init`의 존재하지 않는 `ROADMAP §4` 참조** — `plan-init`이 생성하는 ROADMAP에는 그런 절이 없다. *"ROADMAP의 해당 Stage 확인(출처가 `ST-N`일 때)"*로 정정.

## [0.6.0] - 2026-07-11

### 변경

- **기점 브랜치 파라미터화 — `dev` 하드코딩 제거 (부모 브랜치 기록·재사용)** — task의 분기·되병합 기준을 `dev` 고정에서 **`/task-init` 시점의 현재 브랜치(= 부모 브랜치)**로 일반화했다. 개인은 그대로 `dev`에 서서 쓰면 동작이 동일하고, 회사·팀·로드맵처럼 통합 브랜치가 `dev`가 아닌 환경(`voyager`/`master`/`dev_feat_x` 등)에서는 그 브랜치에 서서 시작하면 taskery가 거기서 분기해 거기로 되병합한다. taskery는 *부모 브랜치 안쪽*(항상 본인 소유 브랜치 → 항상 로컬 `--no-ff`)만 담당하고, 부모→상위(dev/voyager/master, PR 포함) 승격은 사용자 몫이다(taskery는 PR을 다루지 않음). 설계 = [plan/PLAYBOOK.md](plan/PLAYBOOK.md) §16.
  - **부모 브랜치를 task 문서 헤더에 기록** — git은 브랜치의 분기 출처를 저장하지 않으므로, `/task-init`(fork)이 현재 브랜치를 붙잡아 헤더에 적고 `/task-close`가 그 값을 읽어 되병합한다. 이를 위해 task 헤더가 **5컬럼 → 6컬럼**(`부모 브랜치`를 `상태` 앞에 삽입 — 상태를 마지막 셀로 유지). 0.6.0 이전 문서(5컬럼)는 부모 칸이 없으므로 close 시 `dev`로 폴백(하위호환).
  - **채번을 리포 전역으로 견고화** — `getNextTaskNumber`가 닫힌 태스크 번호를 찾을 때 특정 부모(`git log dev`) 대신 모든 ref(`git log --all`)를 스캔한다. 부모가 여러 개여도 서로 다른 부모에 병합된 번호를 놓치지 않는다(TASK-NNN은 전역 식별자).
  - **"메인 워크트리 = dev 전용" → "메인 워크트리 = 부모 브랜치 고정"** — 안전 불변식(진행 중 태스크가 있는 동안 메인 워크트리 HEAD를 옮기지 않음, task 브랜치는 워크트리에서만)은 유지하고, 브랜치 이름 고정만 해제. `CLAUDE.md`/`AGENTS.md`/`GIT_RULE`/`TASK_DOC_RULE`/스킬(task-init·task-close·task-plan·plan-init·add-backlog) 정합. git-guard의 main/dev 직접 커밋 차단은 안전선으로 유지.
  - `fork`/`close` CLI·MCP 도구(`task_init`/`task_close`) 반환에 `parent` 추가, `close`의 `aheadOfDev` → `aheadOfParent`.

### 수정

- **`closed-immutable` 훅 상태 추출 정규식 — 6컬럼 헤더 미인식** — 훅(`.claude`·`.codex` 양판)이 status를 5컬럼 고정 정규식으로 추출해, 6컬럼 헤더(0.6.0)에선 매치에 실패해 **`closed` task 재수정 차단이 걸리지 않을** 위험이 있었다. status는 표의 *마지막 셀*이라는 사실을 이용해 5·6컬럼 양쪽을 잡도록 교정(`(?:[^|]*\|){4,5}` + 마지막 status 셀).

## [0.5.0] - 2026-07-01

### 추가

- **Tier 3 — MCP 서버(`bin/mcp.js`, 구조화 도구 8종)** — `bin/lib.js` core 함수를 MCP 도구로 노출: `backlog_add` / `backlog_get` / `backlog_mark` / `set_status` / `plan_init` / `task_init` / `task_close` / `status`. AI가 `npx` stdout 텍스트를 파싱하던 것을 네이티브 구조화 입출력 + 게이트 강제(전이·종료 조건)로 대체한다. CLI(`bin/*.js`)와 **동일 core를 공유**하므로 로직 중복 0 — MCP 도구 = CLI 명령의 다른 입구. 신규 런타임 의존성 `@modelcontextprotocol/sdk`(^1.29)·`zod`(inputSchema). `init`이 Claude용 `.mcp.json` 자동 등록(첫 세션 승인 게이트), Codex는 `codex mcp add taskery -- npx -y @angar2/taskery mcp` 안내. 미등록 환경은 npx CLI가 폴백.
  - `task_close`는 **결정적 준비만**(Phase 커밋·status=closed·추적 마커) — 비가역 절차(dev `--no-ff` 머지·워크트리/브랜치 정리)와 충돌 해결은 안전상 스킬에 잔존(close-A 경계, git-guard hook + 복구 출력 보호).

### 변경

- **Tier 1·2 — 결정적 로직 코드화(CLI + core 함수)** — 백로그 추가/조회/마킹, 상태 전이(7×7 유효전이표 검증), plan 생성(채번+골격), task 문서 골격 자동 생성, close 준비(Phase 자동 커밋·상태 전이)를 `backlog`(add/get/mark)·`set-status`·`plan-init`·`fork`·`close` CLI + lib 함수(`parseTaskHeader`·`resolveTaskDocPath`·`scaffoldTaskDoc`·`setStatus`·`TRANSITIONS`·`splitUncommittedByPhase`·`closeTask`)로 이관. AI가 마크다운 절차를 읽고 손으로 파싱·계산·Write 재현하던 것을 코드 호출로 대체 → 토큰 절감 + 형식 드리프트 차단 + 락 강제. 스킬 7종(add-backlog·plan-init·task-init·task-plan·task-dev·task-test·task-close)을 결정적 절차를 걷어낸 얇은 판단 지시로 재배선(예: task-init 262→76줄).

### 수정

- **`getNextTaskNumber` 순차 채번 리셋 버그** — dev 머지 히스토리 fallback grep이 `TASK-[0-9]\+ --extended-regexp`였는데, ERE에서 `\+`는 *리터럴 +* 라 "TASK-001"을 못 잡았다. 그 결과 `/task-close`로 활성 브랜치가 사라진 뒤 채번이 1로 리셋돼, 닫고 시작하는 순차 작업이 전부 `TASK-001`로 충돌했다(0.4.0부터 잠복 — 1세션 순차 다작업에서 노출). 정규식을 `TASK-[0-9]+`로 교정. [`project_task_init_number_race`의 *병렬* fork 락과 별건인 *순차* 충돌].

## [0.4.0] - 2026-06-29

### 추가

- **`/run-team` 스킬 — agent teams 자동 병렬 멀티태스크 (Claude 전용 · PLAYBOOK §15 본구현)** — 다건 태스크를 리더 메인 세션 1개가 Claude의 agent teams 기능으로 팀원(독립 세션)에게 1건씩 분배해 자동 병렬 처리하는 고기능. 기존엔 사용자가 작업마다 세션을 직접 띄워 지시해야 했고, 세션 간 컨텍스트 격벽으로 충돌·중복 위험이 있었다. 상위 에이전트 생태계가 taskery를 *병렬 개발 도구*로 호출하기 위한 전제이기도 하다.
  - **세션 오케스트레이션만 추가** — 워크트리 격리는 `/task-init`이, 머지 직렬화·충돌 3단계는 `/task-close`가 그대로 담당. `/run-team`은 태스크 묶기 판단 + 팀원 분배 + 중단점 관리 + 머지 조율만 한다. `bin/` 코드 변경 0.
  - **팀원 = agent teams 팀원** (독립 세션·자체 컨텍스트·사용자 직접 접근). Task tool 서브에이전트 대체를 스킬 본문에서 영구 금지 — 둘은 다르다(서브에이전트는 리더 컨텍스트 내 워커라 사용자 직접 접근·독립 컨텍스트 불가).
  - **트리거 한정 발동** — 기본 플로우(1세션 1태스크)를 침범하지 않음. *"백로그 한 번에 진행해"* / *"팀에게 전부 독립으로 맡겨"* 류 발화에서만.
  - **두 가드** — 플랫폼(Claude) + 활성화(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). 미충족 시 팀을 만들지 말고 안내 후 중단(꺼진 채 헛도는 것 방지).
  - **중단점 = taskery 단계 경계** — 기본은 단계별 정지(팀원이 한 단계 후 idle → 리더 자동 통지), 사용자 지시 시 구간 자동. 되돌릴 수 없는 `/task-close`(dev 병합)는 게이트로 두기 권장. 각 팀원이 물리적으로 분리된 워크트리에서 작업하므로 agent teams의 "같은 파일 동시 편집 → 덮어쓰기" 제약이 구조적으로 회피된다.
  - **Claude 전용** — agent teams가 Codex에 없어 `template/.claude/skills/run-team/`에 직접 배치(`platformOf`가 `.claude/`를 claude로 분류 → Claude 선택 시에만 설치, Codex 미포함). `AGENTS.md`에 Codex 미지원 가드(단일 태스크 흐름 권유). 코어 카피 파일은 Claude 설치 시 +1.
  - 정합: `CLAUDE.md`(agent teams 섹션 + 스킬표) / `AGENTS.md`(가드) / `plan/SKILLS.md`·`OVERVIEW.md`·`PLATFORMS.md` / `README.md` / `PLAYBOOK.md` §15 적용 완료 표기.

### 수정

- **task-init TASK 번호 채번 레이스 차단 — `fork` 명령 신설 (병렬 task-init 안전)** — `/task-init`이 번호 읽기(Step 4.1)와 워크트리·브랜치 생성(Step 6)을 분리해 수행하던 탓에, 병렬 task-init(예: `/run-team` 팀원 동시 분기) 시 둘 사이 락이 없어 같은 번호를 읽고 각자 브랜치를 만드는 TOCTOU 레이스가 있었다(잠복 버그 — 1세션 1태스크에선 안 드러남, agent teams 병렬이 최초 노출: `TASK-001` 3중복). 상위 에이전트 생태계가 taskery를 *병렬 개발 도구*로 호출하려면 필수 차단 대상.
  - **`npx @angar2/taskery fork <type> <dev> <src> <slug>` 신설** (`bin/fork.js` + `lib.forkTask`) — 채번 → 워크트리·브랜치 생성을 `~/.taskery/<projectId>.init.lock`(기존 `withMetaLock`) 안에서 **원자 실행**. 동시 호출은 직렬화돼 각자 늘어난 번호를 본다. SSoT 안전망(같은 출처 진행중 거부)도 같은 락 안으로 일원화(racy 중복검사 제거).
  - **`/task-init` 정합** — Step 4.1 인라인 채번 셸 + Step 6 직접 `git worktree add` 제거 → `fork` 호출로 교체. 확정 NNN은 fork 반환 JSON에서 수령(confirm 시점엔 미정). `run-team`·`GIT_RULE`(template) 충돌 차단/생성 메커니즘 설명 정합.
  - 검증: 병렬 `fork` 5건 → 번호 `1~5` 유일 + 워크트리·브랜치 각 5 (락 없는 동시 읽기는 `[1,1,1,1,1]`로 레이스 재현 확인).

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
