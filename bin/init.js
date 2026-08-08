#!/usr/bin/env node
/**
 * bin/init.js
 * `npx @angar2/taskery init` 본체 — 현재 디렉토리에 template/ 자산 카피 + manifest 생성.
 *
 * 동작:
 *   1. cwd에 .taskery-manifest.json 이미 있으면 경고 + confirm
 *   2. template/ 안 *모든 파일* cwd로 카피 (디렉토리 자동 생성)
 *   3. *.local.md 사용자 오버라이드 충돌 검사 (덮어쓰지 X)
 *   4. .taskery-manifest.json 작성 (version + installed_at + files{path,hash,core,managed} 맵)
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
  generateProjectId,
  DEFAULT_STALE_DAYS,
  DEFAULT_LOCK_TIMEOUT_MS,
  resolveInstallPlan,
  gitignorePatternsFor,
} = require('./lib');

const { ENTRY_DOCS_MARKER } = require('./migrate');

async function confirm(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${msg} (y/N) `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y');
    });
  });
}

// 에이전트 플랫폼 선택 — 고른 것만 독립 설치 (공통 .project/는 항상)
async function selectPlatforms() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      `\n에이전트 플랫폼 선택:\n  1) Claude Code\n  2) Codex\n  3) 둘 다\n선택 (1/2/3, 기본 1): `,
      (ans) => {
        rl.close();
        const c = ans.trim() || '1';
        if (c === '2') resolve(['codex']);
        else if (c === '3') resolve(['claude', 'codex']);
        else resolve(['claude']);
      },
    );
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

  // 2. 플랫폼 선택 + template/ 정독 → 설치 계획 전개 (공통 shared/는 플랫폼 경로로 매핑)
  const platforms = await selectPlatforms();
  const templateFiles = walkTemplate(templateDir);
  const plan = resolveInstallPlan(templateFiles, platforms);

  console.log(`\ntaskery v${getPackageVersion()} init`);
  console.log(`대상: ${cwd}`);
  console.log(`플랫폼: ${platforms.join(', ')}`);
  console.log(`카피 대상: ${plan.length}개 파일\n`);

  // 3. 카피 + manifest 빌드 (manifest 키 = 설치 경로 installRel)
  const manifestFiles = {};
  let copied = 0;
  let skipped = 0;

  for (const { templateRel, installRel, hash } of plan) {
    const src = path.join(templateDir, templateRel);
    const dst = path.join(cwd, installRel);

    // .local.md suffix는 사용자 영역 — taskery template에는 없어야 정상이지만 방어적으로 스킵
    if (isLocalOverride(installRel)) {
      console.log(`  skip (.local override 영역): ${installRel}`);
      skipped++;
      continue;
    }

    // 사용자 .local.md 충돌 검사 — 사용자가 직접 만든 *.local.md 보호
    // 본 init은 신규 설치 default, 충돌 거의 없지만 update 흐름과 일관성 유지
    if (fs.existsSync(dst)) {
      const ok = await confirm(`  '${installRel}' 이미 존재 — 덮어쓸까?`);
      if (!ok) {
        console.log(`    skip: ${installRel}`);
        skipped++;
        continue;
      }
    }

    copyFile(src, dst);
    manifestFiles[installRel] = { hash, core: true, managed: true };
    copied++;
    console.log(`  copy: ${installRel}`);
  }

  // 4. manifest 작성 — 멀티세션(0.1.2+): projectId / stale_days / lock_timeout_ms 포함
  const manifest = {
    version: getPackageVersion(),
    installed_at: new Date().toISOString(),
    projectId: generateProjectId(),
    platforms,
    stale_days: DEFAULT_STALE_DAYS,
    lock_timeout_ms: DEFAULT_LOCK_TIMEOUT_MS,
    activePlan: null, // /plan-init이 채운다 (0.7.0+ 활성 plan SSoT)
    entryDocs: ENTRY_DOCS_MARKER, // 신규 설치는 이미 새 진입 문서 체계 — update가 이행을 시도하지 않도록
    files: manifestFiles,
  };
  writeManifest(manifest, manifestPath);

  // 4.5. .gitignore prompt (stash FRICTION_LOG #26 반영)
  //   공개 repo면 내부 워크플로 파일 노출 회피 — taskery 내부 영역 .gitignore 등록 제안.
  //   사용자 NO면 패스 (그대로 둠). 이미 등록되어 있으면 스킵.
  const gitignorePath = path.join(cwd, '.gitignore');
  const taskeryPatterns = gitignorePatternsFor(platforms);
  const addGitignore = await confirm(
    `\ntaskery 내부 파일(${taskeryPatterns.join(', ')})을 .gitignore에 등록할까?\n  (공개 repo면 권장 — 내부 워크플로 파일 노출 회피)`,
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

  // 4.7. MCP 서버 등록 — Claude는 .mcp.json 생성(첫 세션 승인 게이트), Codex는 명령 안내.
  //   MCP 도구 8종 = lib core의 구조화 입구(CLI와 동일 함수). 미등록 환경은 npx CLI가 폴백.
  if (platforms.includes('claude')) {
    const mcpJsonPath = path.join(cwd, '.mcp.json');
    let mcpConfig = { mcpServers: {} };
    if (fs.existsSync(mcpJsonPath)) {
      // 기존 .mcp.json의 다른 서버 보존 — taskery 항목만 머지.
      try {
        mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
      } catch (e) {
        mcpConfig = { mcpServers: {} };
      }
      if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
    }
    if (!mcpConfig.mcpServers.taskery) {
      mcpConfig.mcpServers.taskery = { command: 'npx', args: ['-y', '@angar2/taskery', 'mcp'] };
      fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
      console.log(`  .mcp.json — taskery MCP 서버 등록 (첫 세션에서 승인 필요)`);
    } else {
      console.log(`  .mcp.json — taskery 서버 이미 등록됨, 스킵`);
    }
  }

  // 5. 결과 보고
  console.log(`\n✅ taskery init 완료`);
  console.log(`   카피: ${copied}개 / 스킵: ${skipped}개`);
  console.log(`   플랫폼: ${platforms.join(', ')}`);
  console.log(`   manifest: ${MANIFEST_NAME}\n`);
  console.log(`다음 단계:`);
  let step = 1;
  // 진입 문서 본문은 AGENTS.md 한 벌 — CLAUDE.md는 `@AGENTS.md` 임포트 한 줄이라 채울 것이 없다.
  console.log(`  ${step++}. AGENTS.md 정독 + 프로젝트 메타 + 검증/테스트 명령 채우기`);
  console.log(`     (.project/rules/TASKERY_RULE.md = taskery 사용 설명서 — 세션이 필독)`);
  if (platforms.includes('claude')) {
    console.log(`  ${step++}. Claude 첫 세션에서 taskery MCP 서버 승인 (.mcp.json — 구조화 도구 8종; 미승인 시 npx CLI 폴백)`);
  }
  if (platforms.includes('codex')) {
    console.log(`  ${step++}. Codex 최초 1회 '/hooks'로 hook trust 승인 (.codex/config.toml — git-guard / closed-immutable)`);
    console.log(`     + MCP 등록: codex mcp add taskery -- npx -y @angar2/taskery mcp`);
  }
  console.log(`  ${step++}. 에이전트 진입 → '/project-init' → '/plan-init <기능그룹>' → '/task-init'\n`);
}

main().catch((e) => {
  console.error(`taskery init 실패: ${e.message}`);
  process.exit(1);
});
