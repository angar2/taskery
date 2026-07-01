#!/usr/bin/env node
// task close 결정적 준비 CLI — Phase 커밋·status=closed·flows/문서 커밋·추적마커 (비가역 머지/정리는 스킬)
/**
 * bin/close.js
 * `npx @angar2/taskery close <TASK-NNN>` — close 결정적 준비.
 *
 * 게이트(status=tested) → Phase 커밋(D2 자동 매핑) → status=closed → flows/문서 커밋 → 추적마커까지
 * 코드가 수행하고 멈춘다. 이후 비가역(사전 rebase+충돌해결 / 머지 락 / dev --no-ff 머지 /
 * worktree remove / branch -d)은 스킬(task-close)이 git-guard hook + 복구출력 보호 하에 수행.
 *
 * stdout: { prepped, branch, wtPath, registered, commits, aheadOfDev }. exit 0.
 * 콜백(스킬이 LLM 판단 후 처리):
 *   - exit 3 + { blocked:'status', current }  — status가 tested 아님 (게이트 차단)
 *   - exit 2 + { blocked:'mapping', files, phases, reason } — Phase↔파일 매핑 모호 (수동 커밋 필요)
 * 그 외 실패 시 stderr + exit 1.
 */

const path = require('path');

const {
  MANIFEST_NAME,
  readManifest,
  getMainWorktreePath,
  closeTask,
} = require('./lib');

async function main() {
  const arg = process.argv[2];
  const m = String(arg || '').match(/(\d+)/);
  if (!m) {
    console.error('사용법: npx @angar2/taskery close <TASK-NNN>');
    process.exit(1);
  }
  const taskNum = parseInt(m[1], 10);

  let mainWt;
  try {
    mainWt = getMainWorktreePath();
  } catch (e) {
    console.error(`taskery close 실패: ${e.message}`);
    process.exit(1);
  }
  if (!readManifest(path.join(mainWt, MANIFEST_NAME))) {
    console.error(`${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`);
    process.exit(1);
  }

  let result;
  try {
    result = await closeTask(mainWt, { taskNum });
  } catch (e) {
    console.error(`taskery close 실패: ${e.message}`);
    process.exit(1);
  }

  if (result.blocked === 'status') {
    console.error(
      `close 게이트 차단 — status=${result.current} (tested 아님). /task-test 통과 후 재호출.`,
    );
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(3);
  }
  if (result.blocked === 'mapping') {
    console.error(
      `Phase↔파일 매핑 모호 (${result.reason}) — Dev Plan '파일' 필드 확인 후 수동 Phase 커밋 필요.`,
    );
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(2);
  }

  process.stdout.write(JSON.stringify(result) + '\n');
}

main();
