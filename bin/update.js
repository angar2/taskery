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

const {
  ENTRY_DOCS_MARKER,
  mergeGitignore,
  ingestActivePlan,
  migrateEntryDocs,
  planGitignore,
  planTestGuide,
} = require('./migrate');

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

  // 2.5. 0.7.0 진입 문서 재편 — **본 루프보다 먼저.**
  //   CLAUDE.md/AGENTS.md를 본 루프에 맡기면 '사용자 customize 검출' 프롬프트가 뜨는데,
  //   덮으면 리포 값이 .bak에만 남고 안 덮으면 구판 전문이 새 판과 함께 남아 규칙이 충돌한다.
  //   이행이 최종 상태까지 기록하고, 처리한 경로는 아래 루프에서 제외한다.
  const entryMig = migrateEntryDocs(cwd, templateDir, platforms, oldManifest);
  const entryHandled = new Set(entryMig.handled);
  for (const line of entryMig.notes) console.log(`  ${line}`);
  Object.assign(newFiles, entryMig.entries);

  // 3. 새 template 파일 분기 (rel = 설치 경로 installRel)
  for (const [rel, { hash: newHash, templateRel }] of Object.entries(newTemplateFiles)) {
    if (entryHandled.has(rel)) {
      // 2.5에서 이행 완료(또는 보류) — 본 루프가 다시 손대면 이행 결과를 덮는다.
      if (entryMig.held && oldFiles[rel]) newFiles[rel] = oldFiles[rel];
      continue;
    }
    if (isLocalOverride(rel)) {
      // template에 .local.md 들어가면 안 되지만 방어적 스킵
      console.log(`  skip (.local override 영역): ${rel}`);
      summary.skipped++;
      continue;
    }

    const src = path.join(templateDir, templateRel);
    const dst = path.join(cwd, rel);
    const oldEntry = oldFiles[rel];

    // .gitignore는 *절대 덮어쓰지 않는다* — 사용자 무시 규칙이 통째로 날아간다.
    // 없으면 복사, 있으면 빠진 줄만 덧붙인다(migrate.mergeGitignore).
    if (rel === '.gitignore') {
      const r = mergeGitignore(src, dst);
      newFiles[rel] = { hash: newHash, core: true, managed: true };
      if (!r.merged) { summary.new++; console.log(`  new: ${rel}`); }
      else if (r.added.length) { summary.autoUpdated++; console.log(`  merge: ${rel} — ${r.added.length}줄 추가 (기존 줄 보존)`); }
      else { summary.unchanged++; }
      continue;
    }

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

  // 활성 plan(0.7.0+) — 기존 값이 있으면 **반드시 그대로 보존**한다. newManifest는 아래에서
  // 명시 필드 목록으로 새로 조립되므로, 여기서 넘기지 않으면 update 한 번에 활성 plan이
  // 소리 없이 사라지고 구형 AGENT-GUIDE 폴백의 낡은 값으로 되돌아간다.
  const { activePlan, ingested: activePlanIngested } = ingestActivePlan(cwd, oldManifest);
  if (activePlanIngested) migration.activePlan = true;

  const newManifest = {
    version: getPackageVersion(),
    installed_at: oldManifest.installed_at,
    updated_at: new Date().toISOString(),
    projectId,
    platforms,
    stale_days,
    lock_timeout_ms,
    activePlan: activePlan ?? null,
    // 진입 문서 이행 완료 마커 — 있으면 다음 update가 이행을 재실행하지 않는다.
    entryDocs: entryMig.done ? ENTRY_DOCS_MARKER : (oldManifest.entryDocs ?? null),
    files: newFiles,
  };
  writeManifest(newManifest, manifestPath);

  // 5.5. 부수 이행 — .gitignore 누락 패턴 / TEST-GUIDE 이관. 둘 다 사용자 승인 후에만.
  const gi = planGitignore(cwd, platforms);
  if (gi.missing.length > 0) {
    console.log(`\n  taskery 자산 중 .gitignore에 없는 항목: ${gi.missing.join(', ')}`);
    console.log(`  (등록하지 않으면 이 파일들이 커밋에 섞여 들어갑니다.)`);
    if (await confirm(`  .gitignore에 추가할까?`)) {
      gi.apply();
      console.log(`    .gitignore 갱신 — ${gi.missing.length}개 패턴 추가`);
    }
  }

  const tg = planTestGuide(cwd);
  if (tg.conflict) {
    // 자동 병합은 사용자 파일을 훼손할 수 있어 하지 않는다. 다만 침묵하면 TEST-GUIDE에 쌓인
    // 내용이 아무도 안 읽는 채로 남으므로 반드시 알린다.
    console.log(
      `\n  ⚠ .project/TEST-GUIDE.md(폐지)와 .project/rules/TEST_RULE.local.md가 모두 있습니다.`,
    );
    console.log(`     TEST-GUIDE 쪽 내용은 이제 아무 스킬도 읽지 않습니다 — 필요한 항목을 직접 옮겨주세요.`);
  }
  if (tg.available) {
    console.log(`\n  .project/TEST-GUIDE.md는 0.7.0에서 폐지되고 역할이 TEST_RULE.local.md로 옮겨졌습니다.`);
    console.log(`  지금 옮기지 않으면 /task-plan·/task-dev가 기존 내용을 읽지 않습니다. (원본은 보존)`);
    if (await confirm(`  내용을 .project/rules/TEST_RULE.local.md로 이관할까?`)) {
      tg.apply();
      console.log(`    이관 완료 — .project/rules/TEST_RULE.local.md (원본 TEST-GUIDE.md 보존)`);
    }
  }

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
