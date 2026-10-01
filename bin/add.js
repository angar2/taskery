#!/usr/bin/env node
// add — 설치된 리포에 플랫폼(claude·codex)의 스킬·설정을 더한다
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const I = require('./install');

function main() {
  const platform = (process.argv[2] || '').trim();
  if (!I.PLATFORMS.includes(platform)) L.fail(`add: 플랫폼을 넣는다 (${I.PLATFORMS.join(' | ')}). 예: npx @angar2/taskery add codex`);
  const main = L.findMain(process.cwd());
  const manifest = L.readManifest(main);
  if (!manifest) L.fail("add: taskery가 설치돼 있지 않다. 'npx @angar2/taskery init'을 먼저 부른다.");
  const platforms = Array.isArray(manifest.platforms) ? manifest.platforms : ['claude'];
  if (platforms.includes(platform)) {
    console.log(`'${platform}'은 이미 설치돼 있다 — 바꾼 것 없음.`);
    return;
  }
  const files = { ...(manifest.files || {}) };
  const notes = [];
  for (const it of I.installPlan([platform], { agnostic: false })) {
    if (fs.existsSync(path.join(main, it.dst))) {
      notes.push(`건너뜀: ${it.dst} (기존 파일 유지)`);
      continue;
    }
    const text = I.readTemplate(it.src);
    I.writeFile(main, it.dst, text);
    files[it.dst] = I.hashText(text);
  }
  notes.push(...I.writeConfigs(main, [platform]));
  L.writeManifest(main, { ...manifest, platforms: [...platforms, platform], files, updated_at: new Date().toISOString() });
  console.log(`taskery add ${platform} 완료`);
  for (const n of notes) console.log(`- ${n}`);
}

try {
  main();
} catch (e) {
  console.error(e instanceof L.TaskeryError ? e.message : `taskery add 실패: ${e.stack || e.message}`);
  process.exit(1);
}
