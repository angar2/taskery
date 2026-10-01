// approve-plan · test-code · test-scenario — 계획 끝 기록, 코드 테스트, 실사용 시나리오 결과(§5-3)
const L = require('./lib');

async function approvePlan(ctx, a) {
  const main = ctx.main;
  const num = L.parseTaskNum(a.task);
  const st = L.readState(main, num);
  if (st.closed) L.fail(`${L.taskLabel(num)}은 이미 닫혔다.`);
  const text = L.readDoc(main, st);
  const problems = [];
  if (!L.goalLine(text)) problems.push('`## 목표`가 비어 있다');
  const files = L.plannedFiles(text);
  if (!files.length) problems.push('`## 만질 파일`(medium·large는 `## Phase`의 `- 파일:` 포함)에 파일이 없다 — 한 줄에 `- 경로` 하나씩');
  if (L.sw(st, 'test')) {
    const n = L.parseCriteria(text).length;
    if (n < 1 || n > 5) {
      problems.push(`\`## 완료 기준\` 시나리오가 ${n}개다 — 테스트 켜짐이면 1~5개를 \`1. [AUTO] 시작 → 행동 → 기대하는 끝 상태\` 형식으로 적는다`);
    }
  }
  if (problems.length) L.fail(`approve-plan: ${L.taskLabel(num)} 태스크 문서를 고친 뒤 다시 부른다.\n${problems.map((p) => `- ${p}`).join('\n')}\n문서: ${L.docAbs(main, st)}`);
  st.approve = { at: L.nowIso(), files };
  L.writeState(main, st);
  L.syncDoc(main, st);
  const d = L.stageDurations(st);
  const next = L.sw(st, 'dev') ? '개발(task-dev)' : '테스트(task-test)';
  return `${L.taskLabel(num)} 계획을 기록했다 — 시작·기획 ${L.minutes(d.plan)}, 만질 파일 ${files.length}개.\n다음: ${next}.`;
}

// 등록된 코드 테스트를 dir에서 차례로 실행한다. 실패하면 멈춤 오류를 던진다
async function runCodeTests(main, dir) {
  const manifest = L.requireInstalled(main);
  const cmds = manifest.codeTest;
  if (cmds === 'none') return { none: true, ms: 0, outputs: [] };
  if (!Array.isArray(cmds) || cmds.length === 0) {
    L.fail(
      'test-code: 등록된 코드 테스트 명령이 없다. 리포를 보고 화면을 켜지 않는 코드 테스트 명령(린트·타입·빌드·단위 테스트)을 정해 ' +
        "`test-code --register \"<명령>\" [\"<명령>\" …]`으로 등록한 뒤 다시 부른다. 코드 테스트가 없는 리포면 `test-code --register none`.",
    );
  }
  let total = 0;
  const outputs = [];
  for (const cmd of cmds) {
    const r = await L.runShell(cmd, dir);
    total += r.ms;
    if (r.code !== 0) {
      L.fail(`test-code: 실패 — \`${cmd}\` (종료 코드 ${r.code})\n--- 출력 끝부분 ---\n${L.tail(r.out, 60)}\n---\n원인을 고친 뒤 다시 부른다.${overNotice(total, cmds)}`);
    }
    outputs.push({ cmd, out: r.out });
  }
  return { none: false, ms: total, outputs };
}

function overNotice(totalMs, cmds) {
  if (totalMs <= L.CODE_TEST_NOTICE_MS) return '';
  return (
    `\n알림: 코드 테스트가 3분을 넘었다(${L.minutes(totalMs)}) — 화면을 켜는 테스트가 섞였는지 확인한다.\n` +
    `지금 등록된 명령: ${cmds.map((c) => `\`${c}\``).join(', ')}\n` +
    '바꾸려면 `test-code --register "<명령>" …`으로 목록 전체를 다시 등록한다.'
  );
}

async function testCode(ctx, a) {
  const main = ctx.main;
  if (a.register) {
    const list = a.register.map((s) => String(s).trim()).filter(Boolean);
    if (!list.length) L.fail('test-code --register: 등록할 명령을 하나 이상 넣는다. 코드 테스트가 없는 리포면 `--register none`.');
    const manifest = L.requireInstalled(main);
    manifest.codeTest = list.length === 1 && list[0] === 'none' ? 'none' : list;
    L.writeManifest(main, manifest);
    return manifest.codeTest === 'none'
      ? '코드 테스트 없음으로 등록했다 — test-code는 코드 지문만 남기고 통과한다.'
      : `코드 테스트 명령 ${list.length}개를 등록했다(목록 전체를 바꿨다):\n${list.map((c) => `- ${c}`).join('\n')}`;
  }
  let st = null;
  let dir;
  if (a.task) {
    st = L.readState(main, L.parseTaskNum(a.task));
    if (st.closed) L.fail(`${L.taskLabel(st.num)}은 이미 닫혔다.`);
    dir = L.workDir(main, st);
  } else {
    dir = L.git(ctx.cwd, ['rev-parse', '--show-toplevel']);
  }
  const result = await runCodeTests(main, dir);
  const cmds = L.requireInstalled(main).codeTest;
  const lines = [];
  if (result.none) lines.push('코드 테스트 없음으로 등록된 리포 — 실행 없이 통과.');
  else {
    lines.push(`통과 — ${result.outputs.length}개 명령, ${L.minutes(result.ms)}.`);
    for (const o of result.outputs) lines.push(`--- \`${o.cmd}\` 출력 끝부분 ---\n${L.tail(o.out, 15) || '(출력 없음)'}`);
  }
  if (st) {
    st.testCode = { at: L.nowIso(), fingerprint: L.fingerprint(dir) };
    L.writeState(main, st);
    L.syncDoc(main, st);
    lines.push(`${L.taskLabel(st.num)} 개발 칸을 기록했다 — 개발 ${L.minutes(L.stageDurations(st).dev)}.`);
  }
  if (!result.none) lines.push(overNotice(result.ms, cmds).trim());
  return lines.filter(Boolean).join('\n');
}

const RESULTS = ['pass', 'fail', 'accept'];

function lastEntry(st, n) {
  const list = (st.scenarios && st.scenarios[n]) || [];
  return list[list.length - 1] || null;
}

async function testScenario(ctx, a) {
  const main = ctx.main;
  const num = L.parseTaskNum(a.task);
  const st = L.readState(main, num);
  if (st.closed) L.fail(`${L.taskLabel(num)}은 이미 닫혔다.`);
  const criteria = L.parseCriteria(L.readDoc(main, st));
  const n = parseInt(a.number, 10);
  if (!criteria.length) L.fail('test-scenario: 태스크 문서 `## 완료 기준`에 시나리오가 없다.');
  if (!(n >= 1 && n <= criteria.length)) L.fail(`test-scenario: 시나리오 번호는 1~${criteria.length} 중 하나다 (받음: '${a.number}').`);
  const result = String(a.result || '').toLowerCase();
  if (!RESULTS.includes(result)) L.fail("test-scenario: 결과는 pass · fail · accept 중 하나다.");
  const text = String(a.text || '').trim();
  if (!text) {
    L.fail(
      result === 'accept'
        ? 'test-scenario accept: FAIL을 알고 넘어가자고 한 사용자의 말을 그대로 넣는다.'
        : 'test-scenario: 증거(실행 출력, 화면 캡처 경로, 또는 사용자 확인 시각)를 넣는다. 증거 없는 PASS는 적지 않는다.',
    );
  }
  if (result === 'accept') {
    const last = lastEntry(st, n);
    if (!last || last.result !== 'fail') L.fail(`test-scenario accept: 시나리오 ${n}의 마지막 결과가 FAIL일 때만 받는다.`);
  }
  const at = L.nowIso();
  st.scenarios = st.scenarios || {};
  st.scenarios[n] = st.scenarios[n] || [];
  st.scenarios[n].push(result === 'accept' ? { result, quote: text, at } : { result, evidence: text, at });
  const label = result === 'pass' ? 'PASS' : result === 'fail' ? 'FAIL' : 'FAIL 수락';
  const body = result === 'accept' ? `사용자: "${text}"` : text;

  // 모든 시나리오가 PASS거나 FAIL 뒤 accept면 테스트 칸을 채운다
  let complete = true;
  let accepted = false;
  for (let i = 1; i <= criteria.length; i++) {
    const last = lastEntry(st, i);
    if (!last || last.result === 'fail') complete = false;
    else if (last.result === 'accept') accepted = true;
  }
  if (complete) st.testDone = { at, accepted };
  else delete st.testDone;
  L.writeState(main, st);
  L.appendResult(main, st, `- 시나리오 ${n} · ${label} · ${body} · ${L.clock(at)}`);
  L.syncDoc(main, st);

  const out = [`${L.taskLabel(num)} 시나리오 ${n}: ${label} 기록.`];
  if (complete) out.push(`모든 시나리오가 끝났다 — 테스트 칸을 채웠다(${L.minutes(L.stageDurations(st).test)}${accepted ? ', FAIL 수락' : ''}). 다음: 마무리(task-close).`);
  else {
    const left = [];
    for (let i = 1; i <= criteria.length; i++) {
      const last = lastEntry(st, i);
      if (!last) left.push(`${i}(결과 없음)`);
      else if (last.result === 'fail') left.push(`${i}(FAIL)`);
    }
    out.push(`남은 시나리오: ${left.join(', ')}`);
  }
  return out.join('\n');
}

module.exports = { approvePlan, testCode, testScenario, runCodeTests, lastEntry };
