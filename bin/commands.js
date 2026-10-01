// 명령 정의표 — 이름·받는 값·할 일을 한 번만 적고, CLI 입구(taskery.js)와 MCP 도구(mcp.js)를 여기서 만든다(§5-3)
const L = require('./lib');
const { prepareTask } = require('./prepare');
const { approvePlan, testCode, testScenario } = require('./check');
const { verifyClose, commitTask, mergeTask, closeTask } = require('./finish');
const { status } = require('./status');
const { planInit } = require('./plan');

// 인자 종류: positional(순서대로) · string(--이름 값) · bool(--이름) · list(--이름 값 값 …)
const TASK = { name: 'task', positional: true, desc: '태스크 번호 (TASK-012 또는 12)' };
const RANGE = { name: 'range', desc: '사용자가 새로 말한 진행 범위 — 태스크 문서의 범위 메모만 바꾼다' };

const COMMANDS = [
  {
    name: 'status',
    summary: '열린 태스크·단계 표·단계별 시간·문서 경로·워크트리 경로를 보여 준다',
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
];

// 명령 실행 공통 — 본진을 찾고, --range가 있으면 범위 메모를 먼저 갱신한다
async function execute(cmd, args, { cwd = process.cwd(), main = null } = {}) {
  const ctx = { cwd, main: main || L.findMain(cwd) };
  if (args.range && args.task && cmd.args.includes(RANGE)) {
    const st = L.readState(ctx.main, L.parseTaskNum(args.task));
    L.updateRange(ctx.main, st, String(args.range));
  }
  return cmd.run(ctx, args);
}

module.exports = { COMMANDS, execute };
