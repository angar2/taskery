// init·update·add 시험 — 빈 폴더 git 시작, exclude 등록, 설정 파일, 거부 조건, 재조립
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { sandbox } = require('./helpers');

test('빈 폴더 init — git 시작·빈 첫 커밋·dev로 이동·exclude·설치 파일·훅 0개', (t) => {
  const sb = sandbox();
  t.after(() => sb.cleanup());
  const out = sb.ok(['init'], { input: '1\n' });
  assert.match(out, /빈 폴더/);
  assert.strictEqual(sb.git(['symbolic-ref', '--short', 'HEAD']), 'dev');
  assert.strictEqual(sb.git(['rev-list', '--count', 'HEAD']), '1');
  assert.strictEqual(sb.git(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']), '', '첫 커밋은 빈 커밋');
  const exclude = sb.read('.git/info/exclude');
  for (const n of ['/.taskery', '/.claude', '/.codex', '/.mcp.json', '/AGENTS.md', '/CLAUDE.md']) {
    assert.ok(exclude.split('\n').includes(n), `exclude에 ${n}`);
  }
  assert.strictEqual(sb.git(['status', '--porcelain']), '', '설치가 추적 파일을 바꾸지 않는다');
  for (const f of ['AGENTS.md', 'CLAUDE.md', '.taskery/BACKLOG.md', '.taskery/rules/GIT_RULE.md', '.taskery/rules/TASKERY_RULE.md', '.taskery/rules/TASK_DOC_RULE.md', '.taskery/rules/CHANGELOG_RULE.md', '.taskery/rules/MOCKUP_RULE.md', '.taskery/rules/TEST_RULE.local.md', '.taskery/rules/DEV_RULE.local.md', '.claude/skills/task-init/SKILL.md', '.claude/skills/task-close/SKILL.md']) {
    assert.ok(fs.existsSync(path.join(sb.repo, f)), f);
  }
  assert.ok(!fs.existsSync(path.join(sb.repo, '.claude', 'hooks')), '훅 없음');
  assert.ok(!fs.existsSync(path.join(sb.repo, '.claude', 'skills', 'run-team')), 'run-team 없음');
  const settings = JSON.parse(sb.read('.claude/settings.json'));
  assert.deepStrictEqual(settings, { permissions: { additionalDirectories: [path.join(sb.repo, '.taskery')] } });
  assert.ok(JSON.parse(sb.read('.mcp.json')).mcpServers.taskery);
  const m = JSON.parse(sb.read('.taskery/manifest.json'));
  assert.deepStrictEqual(m.platforms, ['claude']);
  assert.match(m.projectId, /^[0-9a-f]{8}$/);
  assert.ok(!Object.keys(m.files).some((f) => f.endsWith('.local.md')), '로컬 규칙 틀은 갱신 대상이 아니다');
  const again = sb.tk(['init'], { input: '1\n' });
  assert.notStrictEqual(again.code, 0);
  assert.match(again.all, /이미 설치된/);
});

test('init 거부 — 파일만 있고 git 없음 / 커밋 없음 / taskery 이름 추적 중', (t) => {
  const sb = sandbox();
  t.after(() => sb.cleanup());
  sb.write('a.txt', 'x');
  let r = sb.tk(['init'], { input: '1\n' });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /첫 커밋을 직접/);
  sb.git(['init', '-q']);
  r = sb.tk(['init'], { input: '1\n' });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /커밋이 없는 리포/);
  sb.write('AGENTS.md', '# 내 지침\n');
  sb.git(['add', '-A']);
  sb.git(['commit', '-q', '-m', 'init']);
  r = sb.tk(['init'], { input: '1\n' });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /추적하고 있어 설치를 멈췄다: AGENTS\.md/);
  assert.ok(!fs.existsSync(path.join(sb.repo, '.taskery', 'manifest.json')));
});

test('기존 리포 init — Codex 포함: .codex/config.toml 자동 승인, .codex/skills, 브랜치 그대로', (t) => {
  const sb = sandbox();
  t.after(() => sb.cleanup());
  sb.git(['init', '-q', '-b', 'main']);
  sb.write('README.md', 'hi\n');
  sb.git(['add', '-A']);
  sb.git(['commit', '-q', '-m', 'init']);
  sb.ok(['init'], { input: '3\n' });
  assert.strictEqual(sb.git(['symbolic-ref', '--short', 'HEAD']), 'main', '기존 리포는 브랜치를 옮기지 않는다');
  const toml = sb.read('.codex/config.toml');
  assert.match(toml, /\[mcp_servers\.taskery\]/);
  assert.match(toml, /default_tools_approval_mode = "approve"/);
  assert.ok(fs.existsSync(path.join(sb.repo, '.codex/skills/task-plan/SKILL.md')));
  assert.ok(fs.existsSync(path.join(sb.repo, '.claude/skills/task-plan/SKILL.md')));
  assert.strictEqual(sb.git(['status', '--porcelain']), '');
});

test('update — AGENTS.md 프로젝트 절 유지, 고치지 않은 파일 갱신, 고친 파일은 묻기, 로컬 규칙은 없을 때만, add codex', (t) => {
  const sb = sandbox();
  t.after(() => sb.cleanup());
  sb.ok(['init'], { input: '1\n' });
  const agents = sb.read('AGENTS.md').replace('- 이름: <프로젝트명>', '- 이름: 스태시');
  sb.write('AGENTS.md', agents);
  sb.write('.taskery/rules/GIT_RULE.md', sb.read('.taskery/rules/GIT_RULE.md') + '\n사용자 메모\n');
  sb.write('.taskery/rules/TEST_RULE.local.md', '# 이 리포의 앱 실행\n');
  fs.rmSync(path.join(sb.repo, '.taskery/rules/DEV_RULE.local.md'));
  const m = JSON.parse(sb.read('.taskery/manifest.json'));
  m.files['.taskery/rules/TASKERY_RULE.md'] = 'sha256:old';
  sb.write('.taskery/rules/TASKERY_RULE.md', 'old');
  m.files['.taskery/rules/TASKERY_RULE.md'] = require('../bin/install').hashText('old');
  sb.write('.taskery/manifest.json', JSON.stringify(m));
  const out = sb.ok(['update'], { input: 'n\n' });
  assert.match(sb.read('AGENTS.md'), /- 이름: 스태시/);
  assert.match(out, /유지\(사용자 수정\): \.taskery\/rules\/GIT_RULE\.md/);
  assert.match(sb.read('.taskery/rules/GIT_RULE.md'), /사용자 메모/);
  assert.match(out, /갱신: \.taskery\/rules\/TASKERY_RULE\.md/);
  assert.notStrictEqual(sb.read('.taskery/rules/TASKERY_RULE.md'), 'old');
  assert.strictEqual(sb.read('.taskery/rules/TEST_RULE.local.md'), '# 이 리포의 앱 실행\n', '로컬 규칙은 덮지 않는다');
  assert.match(out, /새로 만듦: \.taskery\/rules\/DEV_RULE\.local\.md/);
  sb.ok(['add', 'codex']);
  assert.match(sb.read('.codex/config.toml'), /default_tools_approval_mode = "approve"/);
  assert.deepStrictEqual(JSON.parse(sb.read('.taskery/manifest.json')).platforms, ['claude', 'codex']);
});

test('update 거부 — 0.x 설치본(루트에 .taskery-manifest.json)은 바꾸지 않고 멈추며 새 init 절차를 알린다', (t) => {
  const sb = sandbox();
  t.after(() => sb.cleanup());
  sb.ok(['init'], { input: '1\n' });
  sb.write('.taskery-manifest.json', JSON.stringify({ version: '0.8.1' }));
  sb.write('.taskery/rules/TASKERY_RULE.md', 'old');
  const r = sb.tk(['update'], { input: 'y\n' });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /0\.8\.1로 설치돼 있어 update로 옮길 수 없다/);
  assert.match(r.all, /init'으로 새로 설치한다/);
  assert.strictEqual(sb.read('.taskery/rules/TASKERY_RULE.md'), 'old', '아무 파일도 바꾸지 않는다');
  assert.ok(fs.existsSync(path.join(sb.repo, '.taskery-manifest.json')), '0.x 매니페스트도 그대로 둔다');
});

test('init 거부 — 0.x 설치본(루트에 .taskery-manifest.json)은 같은 문구로 멈추고 아무것도 설치하지 않는다', (t) => {
  const sb = sandbox();
  t.after(() => sb.cleanup());
  sb.write('.taskery-manifest.json', JSON.stringify({ version: '0.7.0' }));
  const r = sb.tk(['init'], { input: '1\n' });
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /0\.7\.0로 설치돼 있어 update로 옮길 수 없다/);
  assert.match(r.all, /init'으로 새로 설치한다/);
  assert.ok(!fs.existsSync(path.join(sb.repo, '.taskery')), '아무것도 설치하지 않았다');
});
