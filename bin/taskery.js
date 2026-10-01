#!/usr/bin/env node
// taskery CLI 입구 — 설치 명령(init·update·add)·mcp는 각 스크립트로, 나머지는 명령 정의표에서 만든다
const path = require('path');
const { spawnSync } = require('child_process');
const { COMMANDS, execute } = require('./commands');
const L = require('./lib');

const INSTALL = { init: 'init.js', update: 'update.js', add: 'add.js', mcp: 'mcp.js' };

function usage(cmd) {
  const pos = cmd.args.filter((a) => a.positional).map((a) => `<${a.name}>`);
  const opts = cmd.args
    .filter((a) => !a.positional)
    .map((a) => (a.type === 'bool' ? `[--${a.name}]` : a.type === 'list' ? `[--${a.name} <값> …]` : `[--${a.name} <값>]`));
  return [cmd.name, ...pos, ...opts].join(' ');
}

function help() {
  const lines = [`taskery v${L.getPackageVersion()}`, '', '설치:'];
  lines.push('  init                현재 리포(또는 빈 폴더)에 taskery를 설치한다');
  lines.push('  update              설치된 파일을 이 버전으로 갱신한다');
  lines.push('  add <claude|codex>  플랫폼을 추가한다');
  lines.push('  mcp                 MCP 서버를 띄운다(.mcp.json·.codex/config.toml이 부른다)');
  lines.push('', '명령:');
  for (const c of COMMANDS) {
    lines.push(`  ${usage(c)}`);
    lines.push(`      ${c.summary}`);
  }
  return lines.join('\n');
}

function parseArgs(cmd, argv) {
  const out = {};
  const positional = cmd.args.filter((a) => a.positional);
  let pi = 0;
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const name = tok.slice(2);
      const def = cmd.args.find((a) => !a.positional && a.name === name);
      if (!def) L.fail(`${cmd.name}: 모르는 옵션 --${name}.\n사용법: ${usage(cmd)}`);
      if (def.type === 'bool') out[name] = true;
      else if (def.type === 'list') {
        const vals = [];
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) vals.push(argv[++i]);
        out[name] = vals;
      } else {
        if (i + 1 >= argv.length) L.fail(`${cmd.name}: --${name}에 값을 넣는다.`);
        out[name] = argv[++i];
      }
    } else {
      if (pi >= positional.length) L.fail(`${cmd.name}: 인자가 너무 많다 ('${tok}').\n사용법: ${usage(cmd)}`);
      out[positional[pi++].name] = tok;
    }
  }
  return out;
}

async function main() {
  const sub = process.argv[2];
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(help());
    return 0;
  }
  if (INSTALL[sub]) {
    const r = spawnSync(process.execPath, [path.join(__dirname, INSTALL[sub]), ...process.argv.slice(3)], { stdio: 'inherit' });
    return r.status ?? 1;
  }
  const cmd = COMMANDS.find((c) => c.name === sub);
  if (!cmd) {
    console.error(`taskery: 모르는 명령 '${sub}'.\n\n${help()}`);
    return 1;
  }
  const asker = cmd.interactive ? require('./install').makeAsker() : null;
  try {
    const out = await execute(cmd, parseArgs(cmd, process.argv.slice(3)), { ask: asker && asker.ask });
    if (out) console.log(out);
    return 0;
  } catch (e) {
    console.error(e instanceof L.TaskeryError ? e.message : `taskery ${sub} 실패: ${e.stack || e.message}`);
    return 1;
  } finally {
    if (asker) asker.close();
  }
}

main().then((code) => process.exit(code));
