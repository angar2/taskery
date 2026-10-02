// orca-dispatch-task · report-task · wait-reports — 오케스트레이션의 띄우기·보고·보고 받기(§5-3, §5-4)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib');

const AGENTS = ['claude', 'codex'];
// 보고 없이 기다리는 시간이자 '오래 조용한 탭'의 기준. 환경 변수는 시험 전용 통로다
const WAIT_MS = Number(process.env.TASKERY_WAIT_REPORTS_MS) || 10 * 60 * 1000;
const POLL_MS = Math.min(1000, WAIT_MS);
// 첫 지시문을 보낸 뒤 턴 시작을 지켜보는 시간(orca terminal send --wait-submit)
const SUBMIT_WAIT_SEC = 30;

function reportsFile(main) {
  return path.join(main, '.taskery', 'reports.log');
}

function readPosFile(main) {
  return path.join(L.stateDir(main), 'reports-read.json');
}

// orca 명령을 --json으로 부르고 result를 돌려준다. 종료 코드가 0이 아니어도 JSON이 ok면 돌려준다(terminal wait 미충족)
function orca(args) {
  let out = '';
  let err = '';
  try {
    out = execFileSync('orca', [...args, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = (e.stdout || '').toString();
    err = ((e.stderr || '').toString().trim() || e.message).split('\n')[0];
  }
  let j = null;
  try {
    j = JSON.parse(out);
  } catch (e) {
    j = null;
  }
  if (j && j.ok) return j.result;
  const why = (j && j.error && (j.error.message || j.error.code)) || err || out.trim() || '알 수 없는 오류';
  throw new L.TaskeryError(`orca ${args.slice(0, 2).join(' ')} 실패: ${why}`);
}

// 셸에 그대로 넘길 수 있게 감싼다(--command는 탭의 셸에 입력된다)
function shq(v) {
  return /^[A-Za-z0-9_.\/:=@%+-]+$/.test(v) ? v : `'${String(v).replace(/'/g, `'\\''`)}'`;
}

// 에이전트 실행 명령 — 권한·승인 옵션은 붙이지 않는다(사용자 설정 그대로, I5)
function agentCommand(main, agent, model) {
  if (agent === 'claude') return `claude --model ${shq(model)}`;
  return `codex -m ${shq(model)} --add-dir ${shq(path.join(main, '.taskery'))}`;
}

// 단계 표에서 비어 있는 첫 단계의 스킬 — 새 태스크면 task-plan
function startSkill(st) {
  if (!st.approve) return 'task-plan';
  if (L.sw(st, 'dev') && !st.testCode) return 'task-dev';
  if (L.sw(st, 'test') && !st.testDone) return 'task-test';
  return 'task-close';
}

function oneLine(text) {
  return String(text).replace(/\s*\n\s*/g, ' ').trim();
}

// 첫 지시문 틀(§5-4) — 마지막 줄은 --note를 줬을 때만
function firstInstruction(st, note) {
  const label = L.taskLabel(st.num);
  const lines = [
    `[오케스트레이션] taskery 태스크 ${label} 「${st.title}」를 맡는다. 이 세션은 태스크 세션이다.`,
    `- 태스크 문서: ${st.doc} — 먼저 읽는다.`,
    `- 시작: ${startSkill(st)}부터 한다. 태스크 만들기(task-init)와 워크트리 준비는 끝났다.`,
    `- 진행 범위: ${st.range}. 범위와 무관하게 사용자 확인·FAIL·풀지 못한 충돌에서는 멈춘다.`,
    `- 보고: 마무리 완료(병합, 병합이 없는 태스크는 merge-task가 건너뛴 뒤)·사용자 확인 대기·질문·막힘 때 report-task ${label} "<한 줄>"을 부른다.`,
    '- 마무리(merge-task)까지 끝나면 보고하고 멈춘다. 워크트리 정리와 태스크 닫기는 오케스트레이션이 한다.',
  ];
  if (note && oneLine(note)) lines.push(`- 오케스트레이션이 전하는 말: ${oneLine(note)}`);
  return lines.join('\n');
}

// 지시문을 보내고 턴 시작이 관측됐는지 돌려준다. 받지 않았으면 refused. 관측할 수 없는 곳(영수증 없음·provider가 보고 못 함)은 보낸 것으로 본다
function sendPrompt(handle, text) {
  const r = orca(['terminal', 'send', '--terminal', handle, '--text', text, '--enter', '--wait-submit', String(SUBMIT_WAIT_SEC)]);
  const send = (r && r.send) || {};
  if (send.accepted === false) return { refused: send.refusedReason || '거부' };
  const p = send.prompt;
  return { observed: !p || (p.stages || []).includes('turn_started') || ['unsupported', 'old-host'].includes(p.provider) };
}

// 탭 화면에 첫 지시문 첫머리가 보이나 — 보이면 들어간 것이라 다시 보내지 않는다
function onScreen(handle, marker) {
  try {
    const r = orca(['terminal', 'read', '--terminal', handle, '--screen']);
    const screen = ((r && r.terminal && r.terminal.tail) || []).join('').replace(/\s+/g, '');
    return screen.includes(marker.replace(/\s+/g, ''));
  } catch (e) {
    return false;
  }
}

async function orcaDispatchTask(ctx, a) {
  const main = ctx.main;
  if (!L.inOrca()) {
    L.fail(
      'orca-dispatch-task: Orca 탭 안이 아니라 태스크 세션을 띄울 수 없다(Orca 전용 — Orca 환경 변수 ORCA_TERMINAL_HANDLE이 없다). ' +
        'Orca 탭에서 연 오케스트레이션 세션에서 부르거나, 사용자가 그 태스크의 워크트리에서 직접 세션을 연다.',
    );
  }
  L.requireInstalled(main);
  const missing = [];
  if (!a.task) missing.push('<task> — 태스크 번호 (첫 번째 인자)');
  if (!a.agent) missing.push(`--agent — ${AGENTS.join(' · ')}`);
  if (!a.model) missing.push('--model — 에이전트 모델 (사용자가 정한 것)');
  if (missing.length) L.fail(`orca-dispatch-task: 빠진 입력이 있다.\n${missing.map((m) => `- ${m}`).join('\n')}`);
  if (!AGENTS.includes(a.agent)) L.fail(`orca-dispatch-task: --agent '${a.agent}'을 모른다. ${AGENTS.join(' · ')} 중 하나를 넣는다.`);
  const num = L.parseTaskNum(a.task);
  const st = L.readState(main, num);
  const label = L.taskLabel(num);
  if (st.closed) L.fail(`${label}은 이미 닫혔다.`);
  const dir = L.workDir(main, st);
  if (!fs.existsSync(dir)) L.fail(`orca-dispatch-task: ${label}의 워크트리가 없다(${dir}). 'status'로 확인한다.`);

  const command = agentCommand(main, a.agent, String(a.model));
  const created = orca(['terminal', 'create', '--worktree', `path:${dir}`, '--title', label, '--command', command]);
  const handle = created && created.terminal && created.terminal.handle;
  if (!handle) L.fail(`orca-dispatch-task: ${label} 탭을 열었지만 Orca가 탭 handle을 돌려주지 않았다. 'orca terminal list'로 확인한다.`);

  // 탭 handle을 메타에 기록한다 — 첫 지시문을 보내기 전이라 태스크 세션의 기록과 겹치지 않는다
  const fresh = L.readState(main, num);
  fresh.tab = handle;
  L.writeState(main, fresh);
  L.syncDoc(main, fresh);

  const text = firstInstruction(fresh, a.note);
  const manual = `탭 화면을 'orca terminal read --terminal ${handle}'로 확인하고, 준비되면 아래 첫 지시문을 'orca terminal send --terminal ${handle} --text "<첫 지시문>" --enter'로 보낸다.\n--- 첫 지시문 ---\n${text}`;
  let waited;
  try {
    waited = orca(['terminal', 'wait', '--terminal', handle, '--for', 'tui-idle']);
  } catch (e) {
    L.fail(`orca-dispatch-task: ${label} 탭(${handle})을 열었지만 준비를 기다리지 못해 첫 지시문을 보내지 않았다 — ${e.message}\n${manual}`);
  }
  if (waited && waited.wait && waited.wait.satisfied === false) {
    const why = waited.wait.reason || waited.wait.status || '준비 대기 미충족';
    L.fail(`orca-dispatch-task: ${label} 탭(${handle})을 열었지만 준비(tui-idle)가 되지 않아 첫 지시문을 보내지 않았다 — ${why}\n${manual}`);
  }
  const send = () => {
    let r;
    try {
      r = sendPrompt(handle, text);
    } catch (e) {
      L.fail(`orca-dispatch-task: ${label} 탭(${handle})에 첫 지시문을 보내지 못했다 — ${e.message}\n${manual}`);
    }
    if (r.refused) L.fail(`orca-dispatch-task: ${label} 탭(${handle})이 첫 지시문을 받지 않았다 — ${r.refused}\n${manual}`);
    return r.observed;
  };
  // 턴 시작이 관측되지 않으면 화면을 보고, 지시문이 보이지 않을 때만 한 번 더 보낸다(준비 전 입력이 사라진 경우)
  let sendNote = null;
  if (!send()) {
    if (onScreen(handle, text.split('\n')[0].split(' ').slice(0, 4).join(' '))) {
      sendNote = '턴 시작은 관측되지 않았지만 탭 화면에 첫 지시문이 보인다 — 탭에서 진행을 확인한다.';
    } else if (send()) {
      sendNote = '첫 전송은 턴 시작이 관측되지 않고 화면에도 없어 한 번 더 보냈다.';
    } else {
      L.fail(`orca-dispatch-task: ${label} 탭(${handle})에 첫 지시문을 두 번 보냈지만 턴 시작이 관측되지 않았다.\n${manual}`);
    }
  }
  return [
    `${label} 태스크 세션을 띄웠다 — 탭 ${handle}`,
    `- 실행: ${command}`,
    `- 폴더: ${dir}`,
    `- 첫 지시문을 보냈다(시작: ${startSkill(fresh)}, 범위: ${fresh.range}).`,
    ...(sendNote ? [`- 알림: ${sendNote}`] : []),
    '다음: wait-reports를 백그라운드 셸로 걸어 둔다.',
  ].join('\n');
}

async function reportTask(ctx, a) {
  const main = ctx.main;
  L.requireInstalled(main);
  if (!a.task || !a.text || !oneLine(a.text)) L.fail('report-task: 태스크 번호와 보고 한 줄을 넣는다. 예: report-task TASK-012 "병합 완료"');
  const line = `${L.clock(L.nowIso())} ${L.taskLabel(L.parseTaskNum(a.task))} ${oneLine(a.text)}`;
  // 한 줄을 한 번의 append로 쓴다 — 여러 태스크 세션이 동시에 보고해도 줄이 섞이지 않는다
  fs.appendFileSync(reportsFile(main), `${line}\n`);
  return `보고를 남겼다: ${line}`;
}

function readPos(main) {
  try {
    return JSON.parse(fs.readFileSync(readPosFile(main), 'utf8')).offset || 0;
  } catch (e) {
    return 0;
  }
}

// 읽은 위치 뒤의 완성된 줄들을 읽고 위치를 옮긴다. 파일이 줄었으면(지웠으면) 처음부터 읽는다
function takeUnread(main) {
  const file = reportsFile(main);
  if (!fs.existsSync(file)) return [];
  const buf = fs.readFileSync(file);
  let pos = readPos(main);
  if (pos > buf.length) pos = 0;
  const end = buf.lastIndexOf(0x0a) + 1;
  if (end <= pos) return [];
  const lines = buf.slice(pos, end).toString('utf8').split('\n').filter((l) => l.trim());
  L.writeJsonAtomic(readPosFile(main), { offset: end });
  return lines;
}

// 오래 조용한 태스크 탭 — 열린 태스크 중 탭 기록이 있고 마지막 출력이 기다린 시간보다 오래된 것
function quietTabs(main) {
  const out = [];
  for (const st of L.listStates(main)) {
    if (st.closed || !st.tab) continue;
    const label = L.taskLabel(st.num);
    try {
      const r = orca(['terminal', 'show', '--terminal', st.tab]);
      const last = r && r.terminal && r.terminal.lastOutputAt;
      if (last && Date.now() - last >= WAIT_MS) out.push(`- ${label} 탭 ${st.tab} — 마지막 출력 ${L.minutes(Date.now() - last)} 전`);
    } catch (e) {
      out.push(`- ${label} 탭 ${st.tab} — 탭을 읽지 못했다(${e.message.replace(/^orca terminal show 실패: /, '')})`);
    }
  }
  return out;
}

async function waitReports(ctx) {
  const main = ctx.main;
  L.requireInstalled(main);
  const until = Date.now() + WAIT_MS;
  for (;;) {
    const lines = takeUnread(main);
    if (lines.length) return lines.join('\n');
    if (Date.now() >= until) break;
    await new Promise((r) => setTimeout(r, Math.min(POLL_MS, Math.max(0, until - Date.now()))));
  }
  const quiet = quietTabs(main);
  return [`보고 없이 ${L.minutes(WAIT_MS)}이 지났다.`, `오래 조용한 탭: ${quiet.length ? '' : '없음'}`.trimEnd(), ...quiet].join('\n');
}

module.exports = { orcaDispatchTask, reportTask, waitReports, firstInstruction };
