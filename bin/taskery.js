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
 *   fork    — task 분기 (채번+워크트리+브랜치 생성 init 락 원자 실행, 0.3.2+) + 골격 task.md 자동 생성(--size/--title)
 *   backlog-add/get/mark — 활성 plan BACKLOG.md 조작 (채번/조회/확인 마킹, 코드화)
 *   set-status — task 헤더 상태 전이 (7×7 유효전이 검증, 코드화)
 *   plan-init — plan 생성 (채번+폴더+ROADMAP/PLAN/BACKLOG 골격+AGENT-GUIDE 갱신, 코드화)
 *   close   — close 결정적 준비 (Phase커밋+status=closed+문서커밋+추적마커; 비가역 머지/정리는 스킬, 코드화)
 *   help    — 사용법 출력
 */

const { spawnSync } = require('child_process');
const path = require('path');

const sub = process.argv[2];

function runScript(scriptName, injectArgs = []) {
  // injectArgs: dispatcher가 스크립트에 주입하는 선행 인자(예: backlog 서브op). 그 뒤로 사용자 인자.
  const scriptPath = path.resolve(__dirname, scriptName);
  const r = spawnSync(process.execPath, [scriptPath, ...injectArgs, ...process.argv.slice(3)], {
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
  npx @angar2/taskery fork <type> <dev> <src> <slug> [--size <s> --title "<제목>" --promote]   task 분기 + 골격 생성 (통상 /task-init 경유)
  npx @angar2/taskery backlog-add --type <t> --title <제목> --slug <slug> --summary <개요> --target <대상영역>   백로그 추가
  npx @angar2/taskery backlog-get <BL-NNN>             백로그 항목 조회 (JSON)
  npx @angar2/taskery backlog-mark <BL-NNN> <TASK-NNN> 백로그 확인 마킹
  npx @angar2/taskery set-status <TASK-NNN> <state>    task 상태 전이 (유효전이 검증)
  npx @angar2/taskery plan-init <slug> [--force]       plan 생성 (채번+폴더+골격+활성plan 갱신)
  npx @angar2/taskery close <TASK-NNN>                 close 결정적 준비 (Phase커밋+status=closed+추적마커)
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
  case 'backlog-add':
    runScript('backlog.js', ['add']);
    break;
  case 'backlog-get':
    runScript('backlog.js', ['get']);
    break;
  case 'backlog-mark':
    runScript('backlog.js', ['mark']);
    break;
  case 'set-status':
    runScript('set-status.js');
    break;
  case 'plan-init':
    runScript('plan.js');
    break;
  case 'close':
    runScript('close.js');
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
