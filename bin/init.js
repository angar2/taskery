#!/usr/bin/env node
/**
 * bin/init.js
 * `npx @angar2/taskery init` 본체 — 현재 디렉토리에 template/ 자산 카피 + manifest 생성.
 *
 * 동작:
 *   1. cwd에 .taskery-manifest.json 이미 있으면 경고 + confirm
 *   2. template/ 안 *모든 파일* cwd로 카피 (디렉토리 자동 생성)
 *   3. *.local.md 사용자 오버라이드 충돌 검사 (덮어쓰지 X)
 *   4. .taskery-manifest.json 박음 (version + installed_at + files{path,hash,core,managed} 맵)
 *   5. 결과 요약 출력 + 다음 단계 안내 (`/project-init`)
 */

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
  isLocalOverride,
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

  // 1. 기존 manifest 검사
  if (fs.existsSync(manifestPath)) {
    const ok = await confirm(
      `${MANIFEST_NAME} 이미 존재 — taskery 이미 설치된 디렉토리. 'update' 사용 권장. 그래도 init 강행할까?`,
    );
    if (!ok) {
      console.log('취소 — 종료.');
      process.exit(0);
    }
  }

  // 2. template/ 정독 + 해시 맵
  const templateFiles = walkTemplate(templateDir);
  const fileEntries = Object.entries(templateFiles);

  console.log(`\ntaskery v${getPackageVersion()} init`);
  console.log(`대상: ${cwd}`);
  console.log(`카피 대상: ${fileEntries.length}개 파일\n`);

  // 3. 카피 + manifest 빌드
  const manifestFiles = {};
  let copied = 0;
  let skipped = 0;

  for (const [rel, hash] of fileEntries) {
    const src = path.join(templateDir, rel);
    const dst = path.join(cwd, rel);

    // .local.md suffix는 사용자 영역 — taskery template에는 없어야 정상이지만 방어적으로 스킵
    if (isLocalOverride(rel)) {
      console.log(`  skip (.local override 영역): ${rel}`);
      skipped++;
      continue;
    }

    // 사용자 .local.md 충돌 검사 — 사용자가 직접 만든 *.local.md 보호
    // 본 init은 신규 설치 default, 충돌 거의 없지만 update 흐름과 일관성 유지
    if (fs.existsSync(dst)) {
      const ok = await confirm(`  '${rel}' 이미 존재 — 덮어쓸까?`);
      if (!ok) {
        console.log(`    skip: ${rel}`);
        skipped++;
        continue;
      }
    }

    copyFile(src, dst);
    manifestFiles[rel] = { hash, core: true, managed: true };
    copied++;
    console.log(`  copy: ${rel}`);
  }

  // 4. manifest 박음
  const manifest = {
    version: getPackageVersion(),
    installed_at: new Date().toISOString(),
    files: manifestFiles,
  };
  writeManifest(manifest, manifestPath);

  // 4.5. .gitignore prompt (stash FRICTION_LOG #26 반영)
  //   공개 repo면 내부 워크플로 파일 노출 회피 — taskery 내부 영역 .gitignore 등록 제안.
  //   사용자 NO면 패스 (그대로 둠). 이미 등록되어 있으면 스킵.
  const gitignorePath = path.join(cwd, '.gitignore');
  const taskeryPatterns = [
    '.project/',
    '.claude/',
    'CLAUDE.md',
    '.taskery-manifest.json',
  ];
  const addGitignore = await confirm(
    `\ntaskery 내부 파일(.project/, .claude/, CLAUDE.md, .taskery-manifest.json)을 .gitignore에 등록할까?\n  (공개 repo면 권장 — 내부 워크플로 파일 노출 회피)`,
  );
  if (addGitignore) {
    const existing = fs.existsSync(gitignorePath)
      ? fs.readFileSync(gitignorePath, 'utf8').split('\n')
      : [];
    const existingSet = new Set(existing.map((l) => l.trim()));
    const newPatterns = taskeryPatterns.filter((p) => !existingSet.has(p));
    if (newPatterns.length > 0) {
      const needsLeadingNewline =
        existing.length > 0 && existing[existing.length - 1] !== '';
      const block = [
        needsLeadingNewline ? '' : null,
        '# taskery 내부 파일',
        ...newPatterns,
        '',
      ].filter((l) => l !== null);
      fs.appendFileSync(gitignorePath, block.join('\n'));
      console.log(`  .gitignore 갱신 — ${newPatterns.length}개 패턴 추가`);
    } else {
      console.log(`  .gitignore — taskery 패턴 이미 등록됨, 스킵`);
    }
  } else {
    console.log(`  .gitignore — 사용자 선택으로 패스`);
  }

  // 5. 결과 보고
  console.log(`\n✅ taskery init 완료`);
  console.log(`   카피: ${copied}개 / 스킵: ${skipped}개`);
  console.log(`   manifest: ${MANIFEST_NAME}\n`);
  console.log(`다음 단계:`);
  console.log(`  1. CLAUDE.md 정독 + 프로젝트 메타 + 검증 명령 채우기`);
  console.log(`  2. Claude Code 진입 → '/project-init' 호출 → '.project/' 진입 문서 골격 생성`);
  console.log(`  3. '/plan-init <vX.X>' 호출 → 9 기획 문서 작성`);
  console.log(`  4. '/task-init' 호출 → 첫 task 시작\n`);
}

main().catch((e) => {
  console.error(`taskery init 실패: ${e.message}`);
  process.exit(1);
});
