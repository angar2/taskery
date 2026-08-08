#!/usr/bin/env node
// task 상태 전이 CLI — 7×7 유효전이 검증 후 헤더 상태 컬럼 치환 (잘못된 전이 거부)
/**
 * bin/set-status.js
 * `npx @angar2/taskery set-status <TASK-NNN> <state>` — task 헤더 상태 전이.
 *
 * 현재 상태를 코드로 읽고 TASK_DOC_RULE §1.2 유효전이표로 검증 → 통과 시 헤더 치환.
 * 잘못된 전이(예: draft→closed)는 거부. 같은 상태 재지정은 idempotent no-op.
 * task 문서 위치는 resolveTaskDocPath가 .gitignore 케이스로 단일 판정.
 *
 * closed 전이는 본 CLI가 거부 — `/task-close`(close 파이프라인)가 내부 setStatus로 처리.
 * stdout: { taskNum, from, to, changed, path }. 실패 시 stderr + exit 1.
 */

const path = require('path');

const {
  MANIFEST_NAME,
  readManifest,
  getMainWorktreePath,
  gitCapture,
  resolveTaskDocPath,
  setStatus,
  TRANSITIONS,
  getActiveTasks,
  getWorktreePath,
  getProjectId,
} = require('./lib');

async function main() {
  const [taskArg, state] = process.argv.slice(2);

  if (!taskArg || !state) {
    console.error('사용법: npx @angar2/taskery set-status <TASK-NNN> <state>');
    console.error(`state: ${Object.keys(TRANSITIONS).join(' | ')}`);
    process.exit(1);
  }
  const m = String(taskArg).match(/(\d+)/);
  if (!m) {
    console.error(`TASK 번호 파싱 실패 (받음: ${taskArg}). 예: TASK-007`);
    process.exit(1);
  }
  const taskNum = parseInt(m[1], 10);

  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, state)) {
    console.error(`알 수 없는 상태: ${state} (유효: ${Object.keys(TRANSITIONS).join(', ')})`);
    process.exit(1);
  }
  if (state === 'closed') {
    console.error(`closed 전이는 set-status가 아니라 '/task-close'(close 파이프라인)가 담당.`);
    process.exit(1);
  }

  let mainWt;
  try {
    mainWt = getMainWorktreePath();
  } catch (e) {
    console.error(`taskery set-status 실패: ${e.message}`);
    process.exit(1);
  }
  if (!readManifest(path.join(mainWt, MANIFEST_NAME))) {
    console.error(`${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`);
    process.exit(1);
  }

  // 현재 작업트리 toplevel = 미등록 케이스의 문서 base.
  const wtPath = gitCapture(process.cwd(), ['rev-parse', '--show-toplevel'], { allowFail: true }) || mainWt;

  let resolved = resolveTaskDocPath(mainWt, wtPath, { taskNum });

  // 미등록 케이스에서 메인 워크트리(또는 다른 task의 워크트리)에서 호출하면 문서가 그 트리에 없다.
  // 호출 위치를 강요하는 대신 SSoT에서 해당 task의 워크트리를 역조회해 한 번 더 찾는다
  // — 스킬이 "호출 위치 자유"를 전제하므로 CLI가 그 약속을 지켜야 한다.
  if (!resolved) {
    const hit = getActiveTasks(mainWt).find((t) => t.taskNum === taskNum);
    if (hit) {
      const owner = getWorktreePath(getProjectId(mainWt), hit);
      if (owner !== wtPath) resolved = resolveTaskDocPath(mainWt, owner, { taskNum });
    }
  }

  if (!resolved) {
    console.error(
      `TASK-${String(taskNum).padStart(3, '0')} 문서를 찾지 못함 (.project/tasks/*/ 아래 단일 파일/폴더 승격 모두 탐색 + 진행중 task 워크트리 역조회).`,
    );
    process.exit(1);
  }

  try {
    const result = await setStatus(resolved.file, state);
    process.stdout.write(JSON.stringify({ taskNum, ...result }) + '\n');
  } catch (e) {
    console.error(`taskery set-status 실패: ${e.message}`);
    process.exit(1);
  }
}

main();
