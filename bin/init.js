#!/usr/bin/env node
// init — 리포 루트(또는 빈 폴더)에 taskery 1.0을 설치한다. 빈 폴더면 git 시작·빈 첫 커밋·부모 브랜치까지(§5-3)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./lib');
const I = require('./install');

async function selectPlatforms(asker) {
  const ans = await asker.ask('에이전트 플랫폼 선택 — 1) Claude Code  2) Codex  3) 둘 다 (기본 1): ', '1');
  if (ans === '2') return ['codex'];
  if (ans === '3') return ['claude', 'codex'];
  return ['claude'];
}

// 빈 폴더 — git 시작, exclude 등록, 빈 첫 커밋, 통합 브랜치 만들고 본진을 그 브랜치로
function startGit(cwd) {
  L.git(cwd, ['init', '-q']);
  L.ensureExclude(cwd);
  L.git(cwd, ['commit', '-q', '--allow-empty', '-m', 'chore: 첫 커밋']);
  const branch = L.parseGitRuleTable(I.readTemplate('.taskery/rules/GIT_RULE.md')).integration || 'dev';
  if (L.currentBranch(cwd) !== branch) L.git(cwd, ['checkout', '-q', '-b', branch]);
  return branch;
}

// 스택을 보고 빌드 결과 폴더를 제안한다 — 새 워크트리에 APFS 복제할 폴더(§7). Node는 npm ci라 등록하지 않는다
function proposeBuildOutput(main) {
  const found = [];
  const dirs = ['', ...fs.readdirSync(main, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name)];
  for (const d of dirs) {
    if (fs.existsSync(path.join(main, d, 'Cargo.toml'))) {
      found.push(path.posix.join(d, 'target'));
      if (d === '') break; // 루트 워크스페이스면 target 하나
    }
  }
  if (fs.existsSync(path.join(main, 'Package.swift'))) found.push('.build');
  // Xcode 프로젝트 — 기본 DerivedData는 리포 밖·워크트리마다 다른 곳이라 리포 안 고정 경로로 쓴다
  if (fs.readdirSync(main).some((n) => /\.(xcodeproj|xcworkspace)$/.test(n))) found.push('DerivedData');
  return found;
}

function checkRepo(cwd) {
  if (!fs.existsSync(path.join(cwd, '.git')) && !L.gitOk(cwd, ['rev-parse', '--git-dir'])) {
    L.fail('init: git이 없는 폴더에 파일이 이미 있다. 무엇을 첫 커밋에 넣을지(.env 같은 비밀값 포함 여부)는 사용자가 정할 일이라, `git init` 후 첫 커밋을 직접 만든 뒤 다시 부른다.');
  }
  if (!L.gitOk(cwd, ['rev-parse', '--verify', '-q', 'HEAD'])) {
    L.fail('init: 커밋이 없는 리포다. 무엇을 첫 커밋에 넣을지는 사용자가 정할 일이라, 첫 커밋을 직접 만든 뒤 다시 부른다.');
  }
  if (L.findMain(cwd) !== fs.realpathSync(cwd)) {
    L.fail(`init: 리포의 본진 루트에서 부른다 (본진: ${L.findMain(cwd)}).`);
  }
  const tracked = L.git(cwd, ['ls-files', '--', ...L.EXCLUDE_NAMES]);
  if (tracked) {
    const names = [...new Set(tracked.split('\n').map((f) => f.split('/')[0]))];
    L.fail(
      `init: git이 taskery 파일 이름을 이미 추적하고 있어 설치를 멈췄다: ${names.join(', ')}\n` +
        'taskery 파일은 모두 git 밖에 둔다. 추적 해제는 리포 이력을 바꾸는 일이라 사용자가 한다 — ' +
        '`git rm -r --cached <이름>`으로 추적을 해제해 커밋하거나 파일을 다른 곳으로 옮긴 뒤 다시 부른다.',
    );
  }
}

async function main() {
  const cwd = process.cwd();
  L.checkLegacyInstall(cwd);
  if (fs.existsSync(path.join(cwd, L.MANIFEST_NAME))) {
    L.fail('init: taskery가 이미 설치된 리포다. 갱신은 `npx @angar2/taskery update`.');
  }
  const notes = [];
  if (fs.readdirSync(cwd).length === 0) {
    const branch = startGit(cwd);
    notes.push(`빈 폴더 — git을 시작하고 빈 첫 커밋을 만든 뒤 본진을 ${branch} 브랜치로 옮겼다`);
  } else {
    checkRepo(cwd);
  }
  const main = L.findMain(cwd);
  const asker = I.makeAsker();
  try {
    const platforms = await selectPlatforms(asker);
    const files = {};
    for (const it of I.installPlan(platforms)) {
      const dst = path.join(main, it.dst);
      if (fs.existsSync(dst)) {
        if (it.kind === 'once') continue;
        const ans = await asker.ask(`'${it.dst}'가 이미 있다 — 덮어쓸까? (y/N) `, 'n');
        if (ans.toLowerCase() !== 'y') {
          notes.push(`건너뜀: ${it.dst} (기존 파일 유지)`);
          continue;
        }
      }
      const text = I.readTemplate(it.src);
      I.writeFile(main, it.dst, text);
      if (it.kind !== 'once') files[it.dst] = I.hashText(text);
    }
    notes.push(...I.writeConfigs(main, platforms));
    const buildOutput = proposeBuildOutput(main);
    if (buildOutput.length) {
      notes.push(`빌드 결과 폴더 등록: ${buildOutput.join(', ')} — 새 워크트리에 본진의 이 폴더를 APFS 복제한다(바꾸려면 .taskery/manifest.json의 buildOutput을 고친다)`);
      if (buildOutput.includes('DerivedData')) notes.push('코드 테스트 명령에 -derivedDataPath DerivedData를 붙인다');
    }
    const added = L.ensureExclude(main, buildOutput);
    if (added.length) notes.push(`.git/info/exclude — ${added.join(' ')}`);
    L.writeManifest(main, {
      version: L.getPackageVersion(),
      installed_at: new Date().toISOString(),
      projectId: crypto.randomBytes(4).toString('hex'),
      platforms,
      files,
      ...(buildOutput.length ? { buildOutput } : {}),
    });
    console.log(`taskery v${L.getPackageVersion()} 설치 완료 — ${main}`);
    console.log(`- 플랫폼: ${platforms.join(', ')}`);
    for (const n of notes) console.log(`- ${n}`);
    console.log('다음: 에이전트 세션에서 project-init 스킬로 프로젝트 정보·용어집·코드 테스트 등록·첫 플랜을 만든다.');
  } finally {
    asker.close();
  }
}

main().catch((e) => {
  console.error(e instanceof L.TaskeryError ? e.message : `taskery init 실패: ${e.stack || e.message}`);
  process.exit(1);
});
