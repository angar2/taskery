#!/usr/bin/env node
// plan(기능 그룹) 생성 CLI — 채번+폴더+ROADMAP/PLAN/BACKLOG 골격+AGENT-GUIDE 갱신 원자 실행
/**
 * bin/plan.js
 * `npx @angar2/taskery plan-init <slug> [--force]` — plan 생성.
 *
 * 채번(NNN) + legacy 게이트 + 폴더 mkdir(plans/<NNN_slug> + tasks/<NNN_slug>/{spec-diffs,screenshots,mockup})
 * + ROADMAP/PLAN/BACKLOG 골격 Write + AGENT-GUIDE 활성 plan 갱신을 코드가 수행.
 * 성공 시 JSON 한 줄 — { plan, nnn, planDir, tasksDir }. 이후 ROADMAP Stage 내용·PLAN 링크·
 * FEATURES/UX-UI delta는 LLM(plan-init 스킬)이 골격 placeholder를 채운다.
 *
 * legacy 폴더(NNN_ 아닌 plan 폴더) 잔존 + --force 없음 → exit 2 + { gated:true, legacyDirs }
 *   (스킬이 사용자 confirm 후 --force로 재호출). 그 외 실패 시 stderr + exit 1.
 */

const path = require('path');

const {
  MANIFEST_NAME,
  readManifest,
  getMainWorktreePath,
  initPlan,
} = require('./lib');

function main() {
  const argv = process.argv.slice(2);
  const positional = [];
  let force = false;
  for (const a of argv) {
    if (a === '--force') force = true;
    else if (!a.startsWith('--')) positional.push(a);
  }
  const slug = positional[0];

  if (!slug) {
    console.error('사용법: npx @angar2/taskery plan-init <slug> [--force]');
    console.error('예: npx @angar2/taskery plan-init compare-products');
    process.exit(1);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error(`slug은 영어 kebab-case (받음: ${slug})`);
    process.exit(1);
  }

  let mainWt;
  try {
    mainWt = getMainWorktreePath();
  } catch (e) {
    console.error(`taskery plan-init 실패: ${e.message}`);
    process.exit(1);
  }
  if (!readManifest(path.join(mainWt, MANIFEST_NAME))) {
    console.error(`${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`);
    process.exit(1);
  }

  let result;
  try {
    result = initPlan(mainWt, slug, { force });
  } catch (e) {
    console.error(`taskery plan-init 실패: ${e.message}`);
    process.exit(1);
  }

  if (result.gated) {
    // legacy 폴더 잔존 — 사용자 confirm 전 생성 금지. 스킬이 경고 + confirm 후 --force 재호출.
    console.error(
      `plans/에 NNN 채번이 아닌 폴더(${result.legacyDirs.join(', ')})가 있어 활성 plan이 갈릴 위험. ` +
        `수동 이전 후 진행하거나, 그대로 진행하려면 --force 추가.`,
    );
    process.stdout.write(JSON.stringify({ gated: true, legacyDirs: result.legacyDirs }) + '\n');
    process.exit(2);
  }

  process.stdout.write(
    JSON.stringify({
      plan: result.plan,
      nnn: result.nnn,
      planDir: result.planDir,
      tasksDir: result.tasksDir,
    }) + '\n',
  );
}

main();
