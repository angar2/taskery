// 오케스트레이션 시험 — orca-dispatch-task(가짜 orca), report-task·wait-reports(실제 프로세스), task-orche 설치
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { installedRepo, fillDoc, BIN } = require('./helpers');

// 가짜 orca — 받은 인자를 줄마다 JSON으로 기록하고 terminal create·wait·send·show에 답한다.
// handle = term_<제목>. show는 show.json(handle → lastOutputAt 또는 "stale")을 읽는다. FAKE_WAIT_FAIL이면 wait 미충족
function fakeOrca(sb) {
  const bin = path.join(sb.root, 'fakebin');
  fs.mkdirSync(bin, { recursive: true });
  const log = path.join(sb.root, 'orca-calls.log');
  const show = path.join(sb.root, 'show.json');
  fs.writeFileSync(
    path.join(bin, 'orca'),
    `#!${process.execPath}
const fs = require('fs');
const argv = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(argv) + '\\n');
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const say = (o, code = 0) => { process.stdout.write(JSON.stringify(o)); process.exit(code); };
const cmd = argv[0] + ' ' + argv[1];
if (cmd === 'terminal create') say({ ok: true, result: { terminal: { handle: 'term_' + opt('--title') } } });
if (cmd === 'terminal wait') {
  if (process.env.FAKE_WAIT_FAIL) say({ ok: true, result: { wait: { handle: opt('--terminal'), satisfied: false, reason: 'timeout' } } }, 1);
  say({ ok: true, result: { wait: { handle: opt('--terminal'), satisfied: true } } });
}
if (cmd === 'terminal send') {
  // FAKE_TURN: never = 턴 시작이 관측되지 않음 · second = 첫 전송만 관측되지 않음 · 없으면 관측됨
  const cnt = ${JSON.stringify(path.join(sb.root, 'send-count'))};
  const n = (fs.existsSync(cnt) ? Number(fs.readFileSync(cnt, 'utf8')) : 0) + 1;
  fs.writeFileSync(cnt, String(n));
  const turn = process.env.FAKE_TURN === 'never' || (process.env.FAKE_TURN === 'second' && n === 1) ? [] : ['turn_started'];
  say({ ok: true, result: { send: { handle: opt('--terminal'), accepted: true, prompt: { provider: 'claude', stages: ['input_accepted', ...turn] } } } });
}
if (cmd === 'terminal read') say({ ok: true, result: { terminal: { handle: opt('--terminal'), tail: (process.env.FAKE_SCREEN || '').split('\\n'), source: 'screen' } } });
if (cmd === 'terminal show') {
  const map = fs.existsSync(${JSON.stringify(show)}) ? JSON.parse(fs.readFileSync(${JSON.stringify(show)}, 'utf8')) : {};
  const v = map[opt('--terminal')];
  if (v === undefined || v === 'stale') say({ ok: false, error: { code: 'terminal_handle_stale', message: 'terminal_handle_stale' } }, 1);
  say({ ok: true, result: { terminal: { handle: opt('--terminal'), lastOutputAt: v } } });
}
say({ ok: false, error: { message: 'fake orca: unknown ' + cmd } }, 1);
`,
  );
  fs.chmodSync(path.join(bin, 'orca'), 0o755);
  return {
    env: { PATH: `${bin}:${process.env.PATH}`, ORCA_TERMINAL_HANDLE: 'term_orche' },
    calls: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    setShow: (map) => fs.writeFileSync(show, JSON.stringify(map)),
  };
}

function run(sb, args, { cwd = sb.repo, extraEnv = {} } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const c = spawn(process.execPath, [BIN, ...args], { cwd, env: { ...sb.env, ...extraEnv } });
    let out = '';
    let all = '';
    c.stdout.on('data', (d) => {
      out += d;
      all += d;
    });
    c.stderr.on('data', (d) => (all += d));
    c.on('close', (code) => resolve({ code, out, all, args, ms: Date.now() - started }));
  });
}

function prep(sb, n, extra = []) {
  sb.ok(['prepare-task', `태스크 ${n}`, '--slug', `task-${n}`, '--type', 'feature', '--size', 'small', '--dev', 'claude', ...extra]);
}

test('orca-dispatch-task(Claude) — terminal create → wait tui-idle → 첫 지시문 send 순서, 실행 명령에 권한 옵션 없음, 메타 tab 기록', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  prep(sb, 1, ['--range', '끝까지', '--item', '1']);
  const st = sb.state(1);
  const orca = fakeOrca(sb);
  const out = sb.ok(['orca-dispatch-task', 'TASK-001', '--agent', 'claude', '--model', 'sonnet', '--note', 'BL-3과 BL-5는 같은 흐름이라 묶었다.'], { extraEnv: orca.env });
  assert.match(out, /TASK-001 태스크 세션을 띄웠다 — 탭 term_TASK-001/);

  const calls = orca.calls();
  assert.deepStrictEqual(
    calls.map((c) => c.slice(0, 2).join(' ')),
    ['terminal create', 'terminal wait', 'terminal send'],
  );
  assert.deepStrictEqual(calls[0], ['terminal', 'create', '--worktree', `path:${st.worktree}`, '--title', 'TASK-001', '--command', 'claude --model sonnet', '--json']);
  assert.deepStrictEqual(calls[1], ['terminal', 'wait', '--terminal', 'term_TASK-001', '--for', 'tui-idle', '--json']);
  const text = [
    '[오케스트레이션] taskery 태스크 TASK-001 「태스크 1」를 맡는다. 이 세션은 태스크 세션이다.',
    `- 태스크 문서: ${st.doc} — 먼저 읽는다.`,
    '- 시작: task-plan부터 한다. 태스크 만들기(task-init)와 워크트리 준비는 끝났다.',
    '- 진행 범위: 끝까지. 범위와 무관하게 사용자 확인·FAIL·풀지 못한 충돌에서는 멈춘다.',
    '- 보고: 마무리 완료(병합, 병합이 없는 태스크는 merge-task가 건너뛴 뒤)·사용자 확인 대기·질문·막힘 때 report-task TASK-001 "<한 줄>"을 부른다.',
    '- 마무리(merge-task)까지 끝나면 보고하고 멈춘다. 워크트리 정리와 태스크 닫기는 오케스트레이션이 한다.',
    '- 오케스트레이션이 전하는 말: BL-3과 BL-5는 같은 흐름이라 묶었다.',
  ].join('\n');
  assert.deepStrictEqual(calls[2], ['terminal', 'send', '--terminal', 'term_TASK-001', '--text', text, '--enter', '--wait-submit', '30', '--json']);
  assert.doesNotMatch(out, /알림/);
  assert.ok(fs.existsSync(path.join(st.worktree, st.doc)), '첫 지시문의 문서 경로는 워크트리에서 열린다');

  assert.strictEqual(sb.state(1).tab, 'term_TASK-001');
  assert.match(sb.read(st.doc), /<!-- taskery: .* by=taskery tab=term_TASK-001 -->/);
});

test('orca-dispatch-task(Codex) — codex -m <모델> --add-dir <본진>/.taskery, --note 없으면 마지막 줄 없음, 다시 띄우면 시작은 비어 있는 첫 단계', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  prep(sb, 1, ['--switch', 'plan,test']);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  const orca = fakeOrca(sb);
  sb.ok(['orca-dispatch-task', '1', '--agent', 'codex', '--model', 'gpt-5.6-terra'], { extraEnv: orca.env });
  const calls = orca.calls();
  assert.strictEqual(calls[0][calls[0].indexOf('--command') + 1], `codex -m gpt-5.6-terra --add-dir ${path.join(sb.repo, '.taskery')}`);
  const lines = calls[2][calls[2].indexOf('--text') + 1].split('\n');
  assert.strictEqual(lines.length, 6);
  assert.strictEqual(lines[2], '- 시작: task-test부터 한다. 태스크 만들기(task-init)와 워크트리 준비는 끝났다.');
  assert.strictEqual(lines[3], '- 진행 범위: 한 단계. 범위와 무관하게 사용자 확인·FAIL·풀지 못한 충돌에서는 멈춘다.');
});

test('orca-dispatch-task — Orca 밖이면 이유를 알리고 멈춘다(orca를 부르지 않음), 빠진 입력·모르는 에이전트는 거부', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  prep(sb, 1);
  const orca = fakeOrca(sb);
  let r = sb.tk(['orca-dispatch-task', '1', '--agent', 'claude', '--model', 'sonnet'], { extraEnv: { PATH: orca.env.PATH } });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /Orca 탭 안이 아니라 태스크 세션을 띄울 수 없다/);
  assert.strictEqual(orca.calls().length, 0);
  assert.strictEqual(sb.state(1).tab, undefined);

  r = sb.tk(['orca-dispatch-task', '1'], { extraEnv: orca.env });
  assert.match(r.all, /빠진 입력[\s\S]*--agent[\s\S]*--model/);
  r = sb.tk(['orca-dispatch-task', '1', '--agent', 'gemini', '--model', 'x'], { extraEnv: orca.env });
  assert.match(r.all, /--agent 'gemini'을 모른다/);
  assert.strictEqual(orca.calls().length, 0);
});

test('orca-dispatch-task — 준비 대기가 끝나지 않으면 첫 지시문을 보내지 않고 탭 handle·보낼 지시문을 알린다', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  prep(sb, 1);
  const orca = fakeOrca(sb);
  const r = sb.tk(['orca-dispatch-task', '1', '--agent', 'claude', '--model', 'sonnet'], { extraEnv: { ...orca.env, FAKE_WAIT_FAIL: '1' } });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /준비\(tui-idle\)가 되지 않아 첫 지시문을 보내지 않았다 — timeout/);
  assert.match(r.all, /--- 첫 지시문 ---\n\[오케스트레이션\] taskery 태스크 TASK-001/);
  assert.deepStrictEqual(orca.calls().map((c) => c[1]), ['create', 'wait']);
  assert.strictEqual(sb.state(1).tab, 'term_TASK-001', '열린 탭은 기록된다');
});

test('orca-dispatch-task 첫 지시문 삼킴(F1) — 턴 시작이 관측되지 않으면 화면을 보고, 지시문이 없으면 같은 지시문을 한 번 더 보낸다', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  for (const n of [1, 2, 3]) prep(sb, n);
  const orca = fakeOrca(sb);
  const reset = () => fs.rmSync(path.join(sb.root, 'send-count'), { force: true });
  const mine = (label) => orca.calls().filter((c) => c.includes(label) || c.includes(`term_${label}`));
  const textOf = (c) => c[c.indexOf('--text') + 1];

  // 첫 전송이 사라짐(빈 화면) → 화면 확인 → 같은 지시문 재전송 → 관측됨
  let out = sb.ok(['orca-dispatch-task', '1', '--agent', 'claude', '--model', 'm'], { extraEnv: { ...orca.env, FAKE_TURN: 'second' } });
  let calls = mine('TASK-001');
  assert.deepStrictEqual(calls.map((c) => c[1]), ['create', 'wait', 'send', 'read', 'send']);
  assert.deepStrictEqual(calls[3], ['terminal', 'read', '--terminal', 'term_TASK-001', '--screen', '--json']);
  assert.strictEqual(textOf(calls[4]), textOf(calls[2]), '같은 지시문');
  assert.match(out, /알림: 첫 전송은 턴 시작이 관측되지 않고 화면에도 없어 한 번 더 보냈다/);

  // 두 번 다 관측되지 않음 → 지금처럼 멈추고 알린다
  reset();
  let r = sb.tk(['orca-dispatch-task', '2', '--agent', 'claude', '--model', 'm'], { extraEnv: { ...orca.env, FAKE_TURN: 'never' } });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /첫 지시문을 두 번 보냈지만 턴 시작이 관측되지 않았다[\s\S]*--- 첫 지시문 ---\n\[오케스트레이션\] taskery 태스크 TASK-002/);
  assert.deepStrictEqual(mine('TASK-002').map((c) => c[1]), ['create', 'wait', 'send', 'read', 'send']);

  // 관측은 안 됐지만 화면에 지시문이 보임 → 다시 보내지 않는다
  reset();
  out = sb.ok(['orca-dispatch-task', '3', '--agent', 'claude', '--model', 'm'], {
    extraEnv: { ...orca.env, FAKE_TURN: 'never', FAKE_SCREEN: '> [오케스트레이션] taskery 태스크 TASK-003 「태스크 3」를\n맡는다.' },
  });
  assert.deepStrictEqual(mine('TASK-003').map((c) => c[1]), ['create', 'wait', 'send', 'read']);
  assert.match(out, /알림: 턴 시작은 관측되지 않았지만 탭 화면에 첫 지시문이 보인다/);
});

test('orca-dispatch-task 동시 호출 — 태스크 3개를 한꺼번에 띄워도 각자 자기 탭·자기 지시문·자기 메타', async (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  for (const n of [1, 2, 3]) prep(sb, n);
  const orca = fakeOrca(sb);
  const results = await Promise.all([1, 2, 3].map((n) => run(sb, ['orca-dispatch-task', String(n), '--agent', n === 3 ? 'codex' : 'claude', '--model', 'm'], { extraEnv: orca.env })));
  for (const r of results) assert.strictEqual(r.code, 0, r.all);
  const calls = orca.calls();
  assert.strictEqual(calls.length, 9);
  for (const n of [1, 2, 3]) {
    const label = `TASK-00${n}`;
    const handle = `term_${label}`;
    const mine = calls.filter((c) => c.includes(handle) || c.includes(label));
    assert.deepStrictEqual(mine.map((c) => c[1]), ['create', 'wait', 'send'], label);
    const text = mine[2][mine[2].indexOf('--text') + 1];
    assert.match(text, new RegExp(`^\\[오케스트레이션\\] taskery 태스크 ${label} 「태스크 ${n}」`));
    assert.match(text, new RegExp(`report-task ${label} "<한 줄>"`));
    assert.strictEqual(sb.state(n).tab, handle);
    assert.match(sb.read(sb.state(n).doc), new RegExp(`tab=${handle} -->`));
  }
});

test('report-task 동시 기록 — 여러 태스크 세션(워크트리·본진)이 한꺼번에 보고해도 줄이 섞이거나 빠지지 않는다', async (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  prep(sb, 1);
  prep(sb, 2);
  const wt1 = sb.state(1).worktree;
  const jobs = [];
  for (let i = 1; i <= 20; i++) {
    const n = (i % 2) + 1;
    jobs.push(run(sb, ['report-task', `TASK-00${n}`, `보고 ${i} ${'가'.repeat(200)}`], { cwd: n === 1 ? wt1 : sb.repo }));
  }
  const results = await Promise.all(jobs);
  for (const r of results) assert.strictEqual(r.code, 0, r.all);
  const lines = sb.read('.taskery/reports.log').trim().split('\n');
  assert.strictEqual(lines.length, 20);
  for (const l of lines) assert.match(l, /^\d{4}-\d\d-\d\d \d\d:\d\d TASK-00[12] 보고 \d+ 가{200}$/);
  assert.deepStrictEqual(lines.map((l) => parseInt(l.match(/보고 (\d+)/)[1], 10)).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.ok(!fs.existsSync(path.join(wt1, '.taskery', 'reports.log')) || fs.lstatSync(path.join(wt1, '.taskery')).isSymbolicLink(), '워크트리에서 쓴 보고도 본진 한 벌에');

  sb.ok(['report-task', '1', '질문:\n색은 무엇으로?']);
  assert.match(sb.read('.taskery/reports.log').trim().split('\n').pop(), /TASK-001 질문: 색은 무엇으로\?$/);
  assert.match(sb.tk(['report-task', '1']).all, /보고 한 줄을 넣는다/);
});

test('wait-reports — 안 읽은 보고가 있으면 바로 출력하고 끝나며, 읽은 위치를 기억해 다음에는 새 보고만', async (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  prep(sb, 1);
  sb.ok(['report-task', '1', '첫 보고']);
  sb.ok(['report-task', '1', '둘째 보고']);
  const short = { TASKERY_WAIT_REPORTS_MS: '1500' };
  let r = await run(sb, ['wait-reports'], { extraEnv: short });
  assert.strictEqual(r.code, 0, r.all);
  assert.deepStrictEqual(r.out.trim().split('\n').map((l) => l.replace(/^\S+ \S+ /, '')), ['TASK-001 첫 보고', 'TASK-001 둘째 보고']);
  assert.ok(r.ms < 1500, '기다리지 않고 끝난다');

  // 기다리는 중에 보고가 오면 그 줄을 출력하고 끝난다
  const waiting = run(sb, ['wait-reports'], { extraEnv: { TASKERY_WAIT_REPORTS_MS: '20000' } });
  await new Promise((res) => setTimeout(res, 1200));
  sb.ok(['report-task', '1', '병합 완료']);
  r = await waiting;
  assert.strictEqual(r.code, 0, r.all);
  assert.deepStrictEqual(r.out.trim().split('\n').map((l) => l.replace(/^\S+ \S+ /, '')), ['TASK-001 병합 완료']);
  assert.ok(r.ms >= 1200 && r.ms < 8000, `보고가 온 뒤 곧 끝난다 (${r.ms}ms)`);

  // 새 보고가 없으면 기다린 시간이 지나 끝난다
  r = await run(sb, ['wait-reports'], { extraEnv: short });
  assert.strictEqual(r.code, 0, r.all);
  assert.match(r.out, /^보고 없이 1분 미만이 지났다\.\n오래 조용한 탭: 없음/);
  assert.ok(r.ms >= 1500, '기다린 뒤 끝난다');
});

test('wait-reports 시간 초과 — 열린 태스크 탭 중 마지막 출력이 오래된 것과 읽지 못한 탭을 함께 보여 준다', async (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  for (const n of [1, 2, 3, 4]) prep(sb, n);
  const orca = fakeOrca(sb);
  for (const n of [1, 2, 3, 4]) sb.ok(['orca-dispatch-task', String(n), '--agent', 'claude', '--model', 'm'], { extraEnv: orca.env });
  sb.ok(['close-task', '4']);
  const now = Date.now();
  orca.setShow({ 'term_TASK-001': now - 60 * 60 * 1000, 'term_TASK-002': now + 60 * 1000, 'term_TASK-003': 'stale', 'term_TASK-004': now - 60 * 60 * 1000 });
  const r = await run(sb, ['wait-reports'], { extraEnv: { ...orca.env, TASKERY_WAIT_REPORTS_MS: '1000' } });
  assert.strictEqual(r.code, 0, r.all);
  assert.match(r.out, /보고 없이 1분 미만이 지났다\.\n오래 조용한 탭:/);
  assert.match(r.out, /- TASK-001 탭 term_TASK-001 — 마지막 출력 60분 전/);
  assert.match(r.out, /- TASK-003 탭 term_TASK-003 — 탭을 읽지 못했다\(terminal_handle_stale\)/);
  assert.doesNotMatch(r.out, /TASK-002/, '최근에 출력한 탭은 빠진다');
  assert.doesNotMatch(r.out, /TASK-004/, '닫힌 태스크는 빠진다');
});

test('설치 — task-orche 스킬이 Claude·Codex 양쪽에 깔리고, Codex taskery MCP 등록에 자동 승인(approve)이 있다. wait-reports는 CLI 도움말에만', (t) => {
  const sb = installedRepo({ platform: '3' });
  t.after(() => sb.cleanup());
  for (const root of ['.claude/skills', '.codex/skills']) {
    const text = sb.read(`${root}/task-orche/SKILL.md`);
    assert.match(text, /^---\nname: task-orche\n/);
    assert.match(text, /## 운영 방식\n\n아래는 상황에 따라 고를 수 있는 길이다\. 정해진 절차가 아니다\./);
    assert.match(text, /- `prepare-task`, `orca-dispatch-task`, `wait-reports`, `close-task`/);
  }
  assert.match(sb.read('.codex/config.toml'), /\[mcp_servers\.taskery\][\s\S]*default_tools_approval_mode = "approve"\ntool_timeout_sec = 3600\n/);
  const help = sb.ok(['help']);
  assert.match(help, /wait-reports\n/);
  assert.match(help, /orca-dispatch-task <task> \[--agent <값>\] \[--model <값>\] \[--note <값>\]/);
});

test('코드 지문 임시 인덱스(F3) — 시스템 임시 폴더에 쓸 수 없어도 test-code·verify-close가 되고, 본진 .state/에 남는 것이 없다', (t) => {
  const sb = installedRepo();
  const locked = path.join(sb.root, 'locked-tmp');
  fs.mkdirSync(locked);
  fs.chmodSync(locked, 0o555);
  t.after(() => {
    fs.chmodSync(locked, 0o755);
    sb.cleanup();
  });
  prep(sb, 1);
  const st = sb.state(1);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'changed\n');
  const sandboxed = { cwd: st.worktree, extraEnv: { TMPDIR: locked } };
  sb.ok(['test-code', '1'], sandboxed);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인'], sandboxed);
  sb.ok(['verify-close', '1'], sandboxed);
  const left = fs.readdirSync(path.join(sb.repo, '.taskery', '.state')).filter((f) => f.startsWith('taskery-index-'));
  assert.deepStrictEqual(left, []);
  assert.strictEqual(fs.readdirSync(locked).length, 0);
});
