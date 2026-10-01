// 명령 정의표 — 이름·받는 값·할 일을 한 번만 적고, CLI 입구(taskery.js)와 MCP 도구(mcp.js)를 여기서 만든다(§5-3)
const L = require('./lib');
const { prepareTask } = require('./prepare');
const { approvePlan, testCode, testScenario } = require('./check');
const { verifyClose, commitTask, mergeTask, closeTask } = require('./finish');
const { status } = require('./status');
const { planInit } = require('./plan');
const { backlogAdd, backlogGet, backlogMark } = require('./backlog');
const { prune } = require('./prune');
const { orcaDispatchTask, reportTask, waitReports } = require('./orche');

// 인자 종류: positional(순서대로) · string(--이름 값) · bool(--이름) · list(--이름 값 값 …)
const TASK = { name: 'task', positional: true, desc: '태스크 번호 (TASK-012 또는 12)' };
const RANGE = { name: 'range', desc: '사용자가 새로 말한 진행 범위 — 태스크 문서의 범위 메모만 바꾼다' };

const COMMANDS = [
  {
    name: 'status',
    summary: '열린 태스크·단계 표·단계별 시간·문서 경로·워크트리 경로, 플랜별 시작할 수 있는 태스크를 보여 준다',
    args: [],
    run: status,
  },
  {
    name: 'plan-init',
    summary: '다음 플랜 번호로 .project/plans/<NNN>_<slug>/PLAN.md 틀을 만든다',
    args: [
      { name: 'slug', positional: true, desc: '플랜 이름 — 영문 kebab-case (필수)' },
      { name: 'title', desc: '플랜 제목 (없으면 slug)' },
    ],
    run: planInit,
  },
  {
    name: 'prepare-task',
    summary: '태스크를 연다 — 번호·브랜치·워크트리·태스크 문서·기록',
    args: [
      { name: 'name', positional: true, desc: '태스크 제목 한 줄 (필수)' },
      { name: 'slug', desc: '영문 kebab-case — 브랜치·문서 파일 이름 (필수)' },
      { name: 'type', desc: 'feature · bug · improve · refactor · docs · chore (필수)' },
      { name: 'size', desc: 'small · medium · large (필수)' },
      { name: 'switch', desc: '켜진 스위치 목록, 예 plan,dev,test (기본 모두 켜짐)' },
      { name: 'range', desc: '사용자가 말한 진행 범위 그대로 (기본 한 단계)' },
      { name: 'plan', desc: '플랜 폴더 이름 (플랜이 하나면 생략)' },
      { name: 'item', desc: 'PLAN.md 태스크 목록의 항목 번호' },
      { name: 'from', desc: '옮겨 오는 백로그 번호 목록, 예 BL-3,BL-7' },
      { name: 'dev', desc: '작업자 식별자 (GIT_RULE.md 브랜치 이름에 작업자 칸이 있을 때 필수)' },
      { name: 'no-worktree', type: 'bool', desc: '워크트리 생략 — 사용자가 명시했을 때만' },
      { name: 'no-branch', type: 'bool', desc: '브랜치·워크트리 생략 — 사용자가 명시했을 때만' },
    ],
    run: prepareTask,
  },
  {
    name: 'approve-plan',
    summary: '태스크 문서(목표·만질 파일·완료 기준)를 검사하고 계획 끝을 기록한다',
    args: [TASK, RANGE],
    run: approvePlan,
  },
  {
    name: 'test-code',
    summary: '등록된 코드 테스트를 실행한다(태스크를 주면 개발 칸 기록). --register로 명령 목록을 등록·교체한다',
    args: [
      { ...TASK, desc: '태스크 번호 (없으면 기록 없이 결과만)' },
      { name: 'register', type: 'list', desc: '코드 테스트 명령 목록 — 부를 때마다 목록 전체를 바꾼다. 없으면 none' },
      RANGE,
    ],
    run: testCode,
  },
  {
    name: 'test-scenario',
    summary: '완료 기준 시나리오 결과를 기록한다 — pass|fail "증거" 또는 accept "<사용자가 한 말>"',
    args: [
      TASK,
      { name: 'number', positional: true, desc: '시나리오 번호' },
      { name: 'result', positional: true, desc: 'pass · fail · accept' },
      { name: 'text', positional: true, desc: 'pass·fail은 증거, accept는 사용자가 한 말' },
      RANGE,
    ],
    run: testScenario,
  },
  { name: 'verify-close', summary: '마무리 검사만 한다', args: [TASK, RANGE], run: verifyClose },
  { name: 'commit-task', summary: 'Phase별 코드 커밋만 하고 병합 확인 요약을 낸다', args: [TASK, RANGE], run: commitTask },
  { name: 'merge-task', summary: '병합 잠금 안에서 부모 최신으로 rebase한 뒤 병합한다', args: [TASK, RANGE], run: mergeTask },
  { name: 'close-task', summary: '워크트리·브랜치를 정리하고 태스크를 닫는다(주인이 본진에서)', args: [TASK], run: closeTask },
  {
    name: 'prune',
    summary: '닫힌 태스크에 남은 워크트리·브랜치를 정리한다 — 기본은 항목마다 묻는다',
    args: [{ name: 'yes', type: 'bool', desc: '묻지 않고 정리 — 사용자가 명시했을 때만. 커밋 안 된 변경이 있는 곳은 건너뛴다' }],
    interactive: true,
    run: prune,
  },
  {
    name: 'backlog-add',
    summary: '백로그 번호를 발급해 BACKLOG.md 열린 항목 맨 위에 빈 양식을 넣는다',
    args: [
      { name: 'title', positional: true, desc: '항목 제목 한 줄 (필수)' },
      { name: 'type', desc: 'bug · improve · feature · refactor · docs · chore' },
    ],
    run: backlogAdd,
  },
  {
    name: 'backlog-get',
    summary: '번호를 주면 그 항목 전문, 없으면 열린 항목 목록(번호·종류·제목·상태)',
    args: [{ name: 'id', positional: true, desc: '백로그 번호 (BL-3 또는 3)' }],
    run: backlogGet,
  },
  {
    name: 'backlog-mark',
    summary: '--from 없이 연 태스크를 백로그 항목에 연결한다(연결 태스크 칸·상태 진행)',
    args: [
      { name: 'id', positional: true, desc: '백로그 번호 (BL-3 또는 3)' },
      { name: 'task', positional: true, desc: '태스크 번호 (TASK-012 또는 12)' },
    ],
    run: backlogMark,
  },
  {
    name: 'orca-dispatch-task',
    summary: 'Orca 새 탭에 태스크 세션을 띄우고 첫 지시문을 보낸다(Orca 전용). 탭 handle은 태스크 문서 메타에 기록한다',
    args: [
      TASK,
      { name: 'agent', desc: 'claude · codex (필수)' },
      { name: 'model', desc: '에이전트 모델 — 사용자가 정한 것 (필수)' },
      { name: 'note', desc: '첫 지시문 끝에 붙일 오케스트레이션의 말 한 줄' },
    ],
    run: orcaDispatchTask,
  },
  {
    name: 'report-task',
    summary: '태스크 세션이 오케스트레이션에 보고 한 줄을 남긴다(.project/reports.log)',
    args: [TASK, { name: 'text', positional: true, desc: '보고 한 줄 (필수)' }],
    run: reportTask,
  },
  {
    name: 'wait-reports',
    summary: '안 읽은 보고가 생기면 그 줄들을 출력하고 끝난다. 보고 없이 10분이면 오래 조용한 태스크 탭 목록과 함께 끝난다(백그라운드 셸로 건다)',
    args: [],
    cliOnly: true,
    run: waitReports,
  },
];

// 명령 실행 공통 — 본진을 찾고, --range가 있으면 범위 메모를 먼저 갱신한다
// ask는 묻는 명령(prune)에 CLI가 넘기는 질문 함수다. MCP에는 없다
async function execute(cmd, args, { cwd = process.cwd(), main = null, ask = null } = {}) {
  const ctx = { cwd, main: main || L.findMain(cwd), ask };
  if (args.range && args.task && cmd.args.includes(RANGE)) {
    const st = L.readState(ctx.main, L.parseTaskNum(args.task));
    L.updateRange(ctx.main, st, String(args.range));
  }
  return cmd.run(ctx, args);
}

module.exports = { COMMANDS, execute };
