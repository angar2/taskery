#!/usr/bin/env node
/**
 * bin/update.js
 * `npx @angar2/taskery update` — template/ 최신 자산과 사용자 측 비교 + 머지 갱신.
 *
 * 머지 로직 (DISTRIBUTION.md §6):
 *   1. .taskery-manifest.json (cwd) 읽기 — 없으면 에러 ('init' 먼저)
 *   2. template/ 정독 → 새 해시 맵
 *   3. 각 파일 분기:
 *      a. 동일 (new == manifest) → 미터치
 *      b. 신규 (manifest에 없음) → 카피 + manifest에 추가
 *      c. 변경 (new != manifest):
 *         - 사용자 측 == manifest 해시 → 사용자 customize 없음 → 자동 갱신
 *         - 사용자 측 != manifest 해시 → 사용자 customize → *.bak 백업 + confirm
 *      d. 사라짐 (manifest에 있는데 template에 없음) → 사용자에게 경고만, 사용자 파일 보존
 *   4. *.local.md suffix → manifest에 없음 → 미터치 (방어)
 *   5. manifest 갱신 + 결과 요약
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const {
  MANIFEST_NAME,
  findTemplateDir,
  walkTemplate,
  sha256,
  copyFile,
  writeManifest,
  readManifest,
  getPackageVersion,
  isLocalOverride,
  generateProjectId,
  DEFAULT_STALE_DAYS,
  DEFAULT_LOCK_TIMEOUT_MS,
  DEFAULT_PLATFORMS,
  resolveInstallPlan,
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
  const templateDir = findTemplateDir();
  const manifestPath = path.join(cwd, MANIFEST_NAME);

  // 1. manifest 검사
  const oldManifest = readManifest(manifestPath);
  if (!oldManifest) {
    console.error(
      `taskery update: ${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`,
    );
    process.exit(1);
  }

  // 2. 설치된 플랫폼 자산만 갱신 대상 (platforms 누락 시 마이그레이션 기본값)
  //    설치 계획(installRel 기준)으로 전개 — shared/는 플랫폼 경로로 매핑된 상태.
  //    newTemplateFiles: installRel → { hash(소스), templateRel(복사 원본) }
  const platforms = Array.isArray(oldManifest.platforms)
    ? oldManifest.platforms
    : DEFAULT_PLATFORMS;
  const plan = resolveInstallPlan(walkTemplate(templateDir), platforms);
  const newTemplateFiles = {};
  for (const it of plan) {
    newTemplateFiles[it.installRel] = { hash: it.hash, templateRel: it.templateRel };
  }
  const oldFiles = oldManifest.files || {};

  console.log(`\ntaskery update`);
  console.log(`  현재 manifest 버전: ${oldManifest.version}`);
  console.log(`  새 패키지 버전: ${getPackageVersion()}\n`);

  const newFiles = {};
  const summary = { unchanged: 0, new: 0, autoUpdated: 0, customizedReplaced: 0, skipped: 0, removed: 0 };

  // 3. 새 template 파일 분기 (rel = 설치 경로 installRel)
  for (const [rel, { hash: newHash, templateRel }] of Object.entries(newTemplateFiles)) {
    if (isLocalOverride(rel)) {
      // template에 .local.md 들어가면 안 되지만 방어적 스킵
      console.log(`  skip (.local override 영역): ${rel}`);
      summary.skipped++;
      continue;
    }

    const src = path.join(templateDir, templateRel);
    const dst = path.join(cwd, rel);
    const oldEntry = oldFiles[rel];

    // a. 신규 — manifest에 없음
    if (!oldEntry) {
      copyFile(src, dst);
      newFiles[rel] = { hash: newHash, core: true, managed: true };
      summary.new++;
      console.log(`  new: ${rel}`);
      continue;
    }

    const oldManifestHash = oldEntry.hash;

    // b. 동일 — new == manifest → 미터치 (manifest 항목 그대로)
    if (newHash === oldManifestHash) {
      newFiles[rel] = oldEntry;
      summary.unchanged++;
      continue;
    }

    // c. 변경 — new != manifest
    // 사용자 측 해시 비교
    let userHash = null;
    if (fs.existsSync(dst)) {
      userHash = sha256(dst);
    }

    if (userHash === oldManifestHash) {
      // 사용자 customize 없음 → 자동 갱신
      copyFile(src, dst);
      newFiles[rel] = { hash: newHash, core: true, managed: true };
      summary.autoUpdated++;
      console.log(`  auto-update: ${rel}`);
    } else {
      // 사용자 customize 검출 — *.bak 백업 + confirm
      console.log(`\n  ⚠ ${rel} — 사용자 customize 검출`);
      console.log(`    manifest 해시: ${oldManifestHash}`);
      console.log(`    사용자 해시:   ${userHash}`);
      console.log(`    새 코어 해시:  ${newHash}`);
      const ok = await confirm(`    *.bak 백업 후 새 코어로 덮어쓸까?`);
      if (ok) {
        // .bak 백업
        if (fs.existsSync(dst)) {
          fs.copyFileSync(dst, dst + '.bak');
        }
        copyFile(src, dst);
        newFiles[rel] = { hash: newHash, core: true, managed: true };
        summary.customizedReplaced++;
        console.log(`    replaced (.bak 백업): ${rel}`);
      } else {
        // 사용자 customize 보존 — manifest 항목은 *그대로* 유지 (다음 update가 다시 비교)
        newFiles[rel] = oldEntry;
        summary.skipped++;
        console.log(`    skipped (사용자 보존): ${rel}`);
      }
    }
  }

  // 4. 사라짐 검사 — manifest에 있는데 새 template에 없음
  for (const rel of Object.keys(oldFiles)) {
    if (!(rel in newTemplateFiles)) {
      console.log(`  ⚠ removed in new version (사용자 파일 보존): ${rel}`);
      summary.removed++;
      // manifest에서도 제거 (next update 시 다시 검사 X)
    }
  }

  // 5. manifest 갱신 — 멀티세션(0.1.2+) / 플랫폼(0.2.0+) 필드 누락 시 자동 마이그레이션
  const migration = { projectId: false, stale_days: false, lock_timeout_ms: false, platforms: false };
  const projectId = oldManifest.projectId || (migration.projectId = true, generateProjectId());
  const stale_days =
    typeof oldManifest.stale_days === 'number'
      ? oldManifest.stale_days
      : (migration.stale_days = true, DEFAULT_STALE_DAYS);
  const lock_timeout_ms =
    typeof oldManifest.lock_timeout_ms === 'number'
      ? oldManifest.lock_timeout_ms
      : (migration.lock_timeout_ms = true, DEFAULT_LOCK_TIMEOUT_MS);
  if (!Array.isArray(oldManifest.platforms)) migration.platforms = true;

  const newManifest = {
    version: getPackageVersion(),
    installed_at: oldManifest.installed_at,
    updated_at: new Date().toISOString(),
    projectId,
    platforms,
    stale_days,
    lock_timeout_ms,
    files: newFiles,
  };
  writeManifest(newManifest, manifestPath);

  const migratedFields = Object.entries(migration)
    .filter(([, added]) => added)
    .map(([k]) => k);
  if (migratedFields.length > 0) {
    console.log(`  manifest 마이그레이션: ${migratedFields.join(', ')} 필드 추가`);
  }

  // 결과 보고
  console.log(`\n✅ taskery update 완료`);
  console.log(`   동일: ${summary.unchanged}, 신규: ${summary.new}, 자동 갱신: ${summary.autoUpdated}`);
  console.log(`   *.bak 후 갱신: ${summary.customizedReplaced}, 사용자 보존: ${summary.skipped}`);
  if (summary.removed > 0) {
    console.log(`   ⚠ 새 버전에서 사라진 파일: ${summary.removed} (사용자 파일 그대로 보존)`);
  }
  console.log();
}

main().catch((e) => {
  console.error(`taskery update 실패: ${e.message}`);
  process.exit(1);
});
