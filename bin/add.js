#!/usr/bin/env node
// bin/add.js
// `npx @angar2/taskery add <platform>` — 기존 설치 리포에 다른 플랫폼 자산 추가.
//
// 동작:
//   1. <platform> 인자 검증 (claude | codex)
//   2. .taskery-manifest.json 필수 — 없으면 'init' 안내
//   3. 이미 manifest.platforms에 있으면 변경 없이 종료
//   4. 해당 플랫폼 전용 자산만 카피 (공통 .project/는 init이 이미 설치)
//   5. manifest.platforms push + files 갱신

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const {
  MANIFEST_NAME,
  findTemplateDir,
  walkTemplate,
  copyFile,
  writeManifest,
  readManifest,
  getPackageVersion,
  resolveInstallPlan,
  PLATFORMS,
} = require('./lib');

async function confirm(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${msg} (y/N) `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y');
    });
  });
}

async function main() {
  const cwd = process.cwd();
  const platform = (process.argv[2] || '').trim();

  // 1. 플랫폼 인자 검증
  if (!PLATFORMS.includes(platform)) {
    console.error(
      `taskery add: 플랫폼 인자 필요 (${PLATFORMS.join(' | ')}). 예: npx @angar2/taskery add codex`,
    );
    process.exit(1);
  }

  // 2. manifest 필수
  const manifestPath = path.join(cwd, MANIFEST_NAME);
  const manifest = readManifest(manifestPath);
  if (!manifest) {
    console.error(
      `taskery add: ${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`,
    );
    process.exit(1);
  }

  // 3. 이미 설치된 플랫폼?
  const platforms = Array.isArray(manifest.platforms) ? manifest.platforms : ['claude'];
  if (platforms.includes(platform)) {
    console.log(`taskery add: '${platform}' 이미 설치됨 — 변경 없음.`);
    process.exit(0);
  }

  // 4. 해당 플랫폼 전용 + 공통(shared/) 자산만 카피 (agnostic은 init이 이미 설치)
  const templateDir = findTemplateDir();
  const templateFiles = walkTemplate(templateDir);
  const plan = resolveInstallPlan(templateFiles, [platform], { includeAgnostic: false });

  console.log(`\ntaskery v${getPackageVersion()} add ${platform}`);
  console.log(`카피 대상: ${plan.length}개 파일\n`);

  const files = { ...(manifest.files || {}) };
  let copied = 0;
  let skipped = 0;

  for (const { templateRel, installRel, hash } of plan) {
    const src = path.join(templateDir, templateRel);
    const dst = path.join(cwd, installRel);
    if (fs.existsSync(dst)) {
      const ok = await confirm(`  '${installRel}' 이미 존재 — 덮어쓸까?`);
      if (!ok) {
        console.log(`    skip: ${installRel}`);
        skipped++;
        continue;
      }
    }
    copyFile(src, dst);
    files[installRel] = { hash, core: true, managed: true };
    copied++;
    console.log(`  copy: ${installRel}`);
  }

  // 5. manifest 갱신
  manifest.platforms = [...platforms, platform];
  manifest.files = files;
  manifest.updated_at = new Date().toISOString();
  writeManifest(manifest, manifestPath);

  console.log(`\n✅ taskery add ${platform} 완료 (카피 ${copied} / 스킵 ${skipped})`);
  console.log(`   platforms: ${manifest.platforms.join(', ')}`);
  if (platform === 'codex') {
    console.log(`   다음: Codex 최초 1회 '/hooks'로 hook trust 승인 (.codex/config.toml)`);
    console.log(`         AGENTS.md 정독 (코덱스 진입점)`);
  }
}

main().catch((e) => {
  console.error(`taskery add 실패: ${e.message}`);
  process.exit(1);
});
