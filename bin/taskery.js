#!/usr/bin/env node
/**
 * bin/taskery.js
 * `npx taskery <subcommand>` — 진입점 dispatcher.
 *
 * 서브커맨드:
 *   init    — 현재 디렉토리에 taskery 자산 카피 + manifest 생성
 *   update  — 최신 버전 fetch + manifest 비교 + 머지 갱신
 *   help    — 사용법 출력
 */

const { spawnSync } = require('child_process');
const path = require('path');

const sub = process.argv[2];

function runScript(scriptName) {
  const scriptPath = path.resolve(__dirname, scriptName);
  const r = spawnSync(process.execPath, [scriptPath, ...process.argv.slice(3)], {
    stdio: 'inherit',
  });
  process.exit(r.status ?? 1);
}

function help() {
  console.log(`taskery v${require('./lib').getPackageVersion()}

사용법:
  npx taskery init      현재 디렉토리에 taskery 자산 설치
  npx taskery update    최신 버전 fetch + 머지 갱신
  npx taskery help      도움말

새 프로젝트 시작:
  npx create-taskery <project-name>

상세: https://github.com/<...>/taskery
`);
}

switch (sub) {
  case 'init':
    runScript('init.js');
    break;
  case 'update':
    runScript('update.js');
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    help();
    break;
  default:
    console.error(`taskery: 알 수 없는 서브커맨드 '${sub}'.`);
    help();
    process.exit(1);
}
