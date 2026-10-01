// Orca 경로(가짜 orca 실행 파일)와 MCP 서버 시험 — 정의표의 명령이 같은 이름의 MCP 도구로 뜨는지
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { installedRepo, fillDoc } = require('./helpers');

// 가짜 orca — worktree create/rm를 git으로 흉내 내고 받은 인자를 기록한다
function fakeOrca(sb) {
  const bin = path.join(sb.root, 'fakebin');
  fs.mkdirSync(bin);
  const log = path.join(sb.root, 'orca.log');
  fs.writeFileSync(
    path.join(bin, 'orca'),
    `#!/bin/bash
echo "$*" >> "${log}"
if [ "$1 $2" = "worktree create" ]; then
  shift 2
  while [ $# -gt 0 ]; do case "$1" in --repo) REPO="\${2#path:}"; shift 2;; --name) NAME="$2"; shift 2;; --base-branch) BASE="$2"; shift 2;; *) shift;; esac; done
  git -C "$REPO" worktree add -q "${sb.root}/orca-wt/$NAME" -b "angar2/$NAME" "$BASE" >/dev/null 2>&1 || exit 1
  echo '{"ok":true}'
elif [ "$1 $2" = "worktree rm" ]; then
  shift 2
  while [ $# -gt 0 ]; do case "$1" in --worktree) WT="\${2#path:}"; shift 2;; *) shift;; esac; done
  MAIN=$(dirname "$(git -C "$WT" rev-parse --path-format=absolute --git-common-dir)")
  BR=$(git -C "$WT" symbolic-ref --short HEAD)
  git -C "$MAIN" worktree remove "$WT" && git -C "$MAIN" branch -d "$BR" >/dev/null 2>&1
  echo '{"ok":true}'
fi
`,
  );
  fs.chmodSync(path.join(bin, 'orca'), 0o755);
  return { env: { PATH: `${bin}:${process.env.PATH}`, ORCA_TERMINAL_HANDLE: 'term_test' }, log };
}

test('Orca 안 — orca worktree create --base-branch <부모> 후 브랜치 이름을 규칙대로 바꾸고, close-task는 orca worktree rm', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const orca = fakeOrca(sb);
  Object.assign(sb.env, orca.env);
  sb.ok(['prepare-task', 'Orca 태스크', '--slug', 'in-orca', '--type', 'feature', '--size', 'small', '--dev', 'claude']);
  const st = sb.state(1);
  assert.strictEqual(st.by, 'orca');
  assert.strictEqual(st.worktree, path.join(sb.root, 'orca-wt', 'TASK-001-in-orca'));
  assert.strictEqual(sb.git(['symbolic-ref', '--short', 'HEAD'], st.worktree), 'feature/claude_TASK-001_in-orca');
  assert.match(fs.readFileSync(orca.log, 'utf8'), new RegExp(`worktree create --repo path:${sb.repo} --name TASK-001-in-orca --base-branch dev --json`));
  assert.ok(fs.lstatSync(path.join(st.worktree, '.project')).isSymbolicLink());
  assert.match(sb.read(st.doc), /by=orca/);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'orca\n');
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  sb.ok(['merge-task', '1']);
  const out = sb.ok(['close-task', '1']);
  assert.match(out, /Orca 워크트리를 지웠다/);
  assert.match(out, /복구: git branch feature\/claude_TASK-001_in-orca/);
  assert.match(fs.readFileSync(orca.log, 'utf8'), /worktree rm --worktree path:/);
  assert.ok(!fs.existsSync(st.worktree));
});

test('Orca 안 포기 — 병합 안 된 브랜치여도 orca worktree rm으로 워크트리를 지우고, Orca가 남긴 브랜치는 남겼다고 알림', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const orca = fakeOrca(sb);
  Object.assign(sb.env, orca.env);
  sb.ok(['prepare-task', '포기할 태스크', '--slug', 'give-up', '--type', 'feature', '--size', 'small', '--dev', 'claude']);
  const st = sb.state(1);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'wip\n');
  sb.git(['commit', '-qam', 'wip'], st.worktree);
  const out = sb.ok(['close-task', '1']);
  assert.match(fs.readFileSync(orca.log, 'utf8'), /worktree rm --worktree path:/);
  assert.match(out, /Orca 워크트리를 지웠다/);
  assert.match(out, /병합되지 않아 남겼다/);
  assert.ok(!fs.existsSync(st.worktree));
  assert.ok(sb.git(['branch', '--list', st.branch]), '병합 안 된 브랜치는 남는다');
  assert.match(out, /포기/);
});

// MCP 서버와 줄 단위 JSON-RPC로 대화한다
function mcpSession(cwd, env) {
  const child = spawn(process.execPath, [path.resolve(__dirname, '..', 'bin', 'mcp.js')], { cwd, env });
  let buf = '';
  const waiting = new Map();
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      if (waiting.has(msg.id)) {
        waiting.get(msg.id)(msg);
        waiting.delete(msg.id);
      }
    }
  });
  let id = 0;
  return {
    request(method, params) {
      const myId = ++id;
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: myId, method, params }) + '\n');
      return new Promise((resolve) => waiting.set(myId, resolve));
    },
    notify(method, params) {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
    },
    close() {
      child.kill();
    },
  };
}

test('MCP — 정의표의 명령이 같은 이름의 도구로 뜨고, 같은 인자로 부르면 CLI와 같은 일을 한다', async (t) => {
  const sb = installedRepo();
  const s = mcpSession(sb.repo, sb.env);
  t.after(() => {
    s.close();
    sb.cleanup();
  });
  await s.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  s.notify('notifications/initialized', {});
  const list = await s.request('tools/list', {});
  const names = list.result.tools.map((x) => x.name).sort();
  assert.deepStrictEqual(names, ['approve-plan', 'backlog-add', 'backlog-get', 'backlog-mark', 'close-task', 'commit-task', 'merge-task', 'orca-dispatch-task', 'plan-init', 'prepare-task', 'prune', 'report-task', 'status', 'test-code', 'test-scenario', 'verify-close']);
  const prep = list.result.tools.find((x) => x.name === 'prepare-task');
  assert.ok(prep.inputSchema.properties['no-worktree'], 'CLI 옵션과 같은 이름');
  let r = await s.request('tools/call', { name: 'prepare-task', arguments: { name: '빠짐' } });
  assert.strictEqual(r.result.isError, true);
  assert.match(r.result.content[0].text, /빠진 입력/);
  r = await s.request('tools/call', { name: 'prepare-task', arguments: { name: 'MCP 태스크', slug: 'via-mcp', type: 'feature', size: 'small', dev: 'codex' } });
  assert.ok(!r.result.isError, r.result.content[0].text);
  assert.strictEqual(sb.state(1).branch, 'feature/codex_TASK-001_via-mcp');
  fillDoc(sb, 1);
  r = await s.request('tools/call', { name: 'approve-plan', arguments: { task: 'TASK-001' } });
  assert.ok(!r.result.isError, r.result.content[0].text);
  fs.writeFileSync(path.join(sb.state(1).worktree, 'src/app.txt'), 'mcp\n');
  for (const [name, args] of [
    ['test-code', { task: '1' }],
    ['test-scenario', { task: '1', number: 1, result: 'pass', text: '확인' }],
    ['verify-close', { task: '1' }],
    ['commit-task', { task: '1' }],
    ['merge-task', { task: '1' }],
    ['close-task', { task: '1' }],
  ]) {
    r = await s.request('tools/call', { name, arguments: args });
    assert.ok(!r.result.isError, `${name}: ${r.result.content[0].text}`);
  }
  assert.strictEqual(sb.read('src/app.txt'), 'mcp\n');
  r = await s.request('tools/call', { name: 'status', arguments: {} });
  assert.match(r.result.content[0].text, /열린 태스크 없음/);
});
