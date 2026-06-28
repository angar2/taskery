#!/usr/bin/env node
/**
 * bin/taskery.js
 * `npx @angar2/taskery <subcommand>` — 진입점 dispatcher.
 *
 * 서브커맨드:
 *   init    — 현재 디렉토리에 taskery 자산 카피 + manifest 생성 (플랫폼 선택)
 *   add     — 기존 설치 리포에 플랫폼 자산 추가 (claude | codex)
 *   update  — 최신 버전 fetch + manifest 비교 + 머지 갱신
 *   status  — 멀티세션 현황 요약 (진행중 태스크 / 워크트리 / 머지 락, 0.1.2+)
 *   prune   — stale 워크트리 / 브랜치 대화형 정리 (0.1.2+)
 *   fork    — task 분기 (채번+워크트리+브랜치 생성을 init 락으로 원자 실행, 0.3.2+)
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
  npx @angar2/taskery init      현재 디렉토리에 taskery 자산 설치 (플랫폼 선택)
  npx @angar2/taskery add <p>   기존 설치에 플랫폼 추가 (claude | codex)
  npx @angar2/taskery update    최신 버전 fetch + 머지 갱신
  npx @angar2/taskery status    멀티세션 현황 (진행중 태스크 / 워크트리 / 머지 락)
  npx @angar2/taskery prune     stale 워크트리 / 브랜치 대화형 정리
  npx @angar2/taskery fork <type> <dev> <src> <slug>   task 분기 (통상 /task-init 경유)
  npx @angar2/taskery help      도움말

새 프로젝트 시작:
  npx -p @angar2/taskery create-taskery <project-name>

상세: https://github.com/angar2/taskery
`);
}

switch (sub) {
  case 'init':
    runScript('init.js');
    break;
  case 'add':
    runScript('add.js');
    break;
  case 'update':
    runScript('update.js');
    break;
  case 'status':
    runScript('status.js');
    break;
  case 'prune':
    if (process.argv[3] === '--help' || process.argv[3] === '-h') {
      console.log(`taskery prune — stale 워크트리 / 브랜치 대화형 정리

사용법:
  npx @angar2/taskery prune

설명:
  .taskery-manifest.json의 stale_days (기본 30일) 기준으로 비활성 워크트리 + 브랜치를 대화형 정리합니다.
  케이스 분기: A (워크트리 + 브랜치 모두 stale) / B (브랜치만 stale) / C (워크트리 폴더 잔존) / D (정합 영역).
  각 케이스마다 y/n/k 선택 가능 (y = 삭제 / n = 건너뜀 / k = 보존 명시).

상세: https://github.com/angar2/taskery
`);
      break;
    }
    runScript('prune.js');
    break;
  case 'fork':
    runScript('fork.js');
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
