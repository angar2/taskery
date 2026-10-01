// 워크트리 준비 시험 — 등록된 빌드 결과 폴더 APFS 복제, 건너뛰기(등록 없음·APFS 아님·본진에 없음), npm ci, merge-task 재설치, init 등록 제안
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { installedRepo, sandbox, fillDoc } = require('./helpers');

function setManifest(sb, patch) {
  const m = JSON.parse(sb.read('.taskery-manifest.json'));
  sb.write('.taskery-manifest.json', JSON.stringify({ ...m, ...patch }, null, 2));
}

function commitAll(sb, msg) {
  sb.git(['add', '-A']);
  sb.git(['commit', '-q', '-m', msg]);
}

function open(sb, slug) {
  return sb.ok(['prepare-task', `태스크 ${slug}`, '--slug', slug, '--type', 'feature', '--size', 'small', '--dev', 'claude']);
}

// PATH 앞에 둘 가짜 실행 파일 폴더
function fakeBin(sb, name, script) {
  const bin = path.join(sb.root, 'fakebin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, name), `#!/bin/bash\n${script}\n`);
  fs.chmodSync(path.join(bin, name), 0o755);
  sb.env.PATH = `${bin}:${process.env.PATH}`;
}

test('빌드 결과 폴더 — 본진에서 APFS 복제, 워크트리마다 자기 폴더', { skip: process.platform !== 'darwin' && 'APFS는 macOS 전용' }, (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.write('.gitignore', 'target/\n');
  commitAll(sb, 'chore: 무시 규칙');
  sb.write('target/debug/app.bin', 'BUILT-IN-MAIN');
  sb.write('target/debug/deps/lib.rlib', 'DEP');
  setManifest(sb, { buildOutput: ['target'] });

  const out1 = open(sb, 'one');
  const out2 = open(sb, 'two');
  assert.match(out1, /- 준비: 빌드 결과 폴더 target를 APFS 복제했다\(\d+\.\d초\)/);
  const w1 = sb.state(1).worktree;
  const w2 = sb.state(2).worktree;
  for (const w of [w1, w2]) {
    const f = path.join(w, 'target', 'debug', 'app.bin');
    assert.ok(!fs.lstatSync(path.join(w, 'target')).isSymbolicLink(), '링크가 아니라 자기 폴더');
    assert.strictEqual(fs.readFileSync(f, 'utf8'), 'BUILT-IN-MAIN');
    assert.notStrictEqual(fs.statSync(f).ino, fs.statSync(path.join(sb.repo, 'target/debug/app.bin')).ino);
  }
  // 한 워크트리의 빌드가 다른 곳을 덮지 않는다
  fs.writeFileSync(path.join(w1, 'target/debug/app.bin'), 'BUILT-IN-ONE');
  assert.strictEqual(sb.read('target/debug/app.bin'), 'BUILT-IN-MAIN');
  assert.strictEqual(fs.readFileSync(path.join(w2, 'target/debug/app.bin'), 'utf8'), 'BUILT-IN-MAIN');
  assert.strictEqual(sb.git(['status', '--porcelain'], w1), '', '무시되는 빌드 폴더는 코드 변경이 아니다');
});

test('빌드 결과 폴더 — 등록이 없거나, 본진에 없거나, APFS 복제가 안 되면 건너뛴다', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.write('.gitignore', 'target/\nbuild/\n');
  commitAll(sb, 'chore: 무시 규칙');
  sb.write('target/x.bin', 'X');
  // 등록 없음 — 조용히 건너뜀
  let out = open(sb, 'none');
  assert.ok(!/준비:/.test(out));
  assert.ok(!fs.existsSync(path.join(sb.state(1).worktree, 'target')));
  // 등록했지만 본진에 없음
  setManifest(sb, { buildOutput: ['build/DerivedData'] });
  out = open(sb, 'missing');
  assert.match(out, /빌드 결과 폴더 build\/DerivedData가 본진에 없어 복제를 건너뛰었다/);
  // APFS가 아닌 파일 시스템 — cp -c는 거기서 조용히 통째 복사하므로 부르지 않고 건너뛴다(mount 목록을 hfs로 바꿔 흉내)
  setManifest(sb, { buildOutput: ['target'] });
  const cpLog = path.join(sb.root, 'cp.log');
  fakeBin(sb, 'cp', `echo "$*" >> "${cpLog}"; exec /bin/cp "$@"`);
  fakeBin(sb, 'mount', "/sbin/mount | sed 's/(apfs,/(hfs,/'");
  out = open(sb, 'not-apfs');
  if (process.platform === 'darwin') assert.match(out, /빌드 결과 폴더 복제를 건너뛰었다 — 본진이 APFS가 아니다\(hfs\)/);
  else assert.match(out, /APFS 복제는 macOS 전용/);
  assert.ok(!fs.existsSync(path.join(sb.state(3).worktree, 'target')));
  assert.ok(!fs.existsSync(cpLog), 'cp를 부르지 않았다');
  assert.ok(fs.existsSync(sb.state(3).worktree), '태스크는 그대로 열린다');
  // cp가 실패하면 만들다 만 폴더를 지우고 건너뛴다
  fs.rmSync(path.join(sb.root, 'fakebin', 'mount'));
  fakeBin(sb, 'cp', 'mkdir -p "${@: -1}"; echo "cp: target: Permission denied" >&2; exit 1');
  out = open(sb, 'cp-fails');
  if (process.platform === 'darwin') {
    assert.match(out, /빌드 결과 폴더 target 복제를 건너뛰었다\(cp: target: Permission denied\)/);
    assert.ok(!fs.existsSync(path.join(sb.state(4).worktree, 'target')));
  }
});

test('npm ci — package-lock.json이 있으면 새 워크트리에서 설치, merge-task는 부모에서 의존성 파일이 바뀌었을 때만 재설치', (t) => {
  const sb = installedRepo({ codeTest: ['true'] });
  t.after(() => sb.cleanup());
  const log = path.join(sb.root, 'npm.log');
  fakeBin(sb, 'npm', `echo "$PWD $*" >> "${log}"; mkdir -p node_modules`);
  sb.write('.gitignore', 'node_modules/\n');
  sb.write('package.json', '{"name":"x"}\n');
  sb.write('package-lock.json', '{"lockfileVersion":3,"v":1}\n');
  commitAll(sb, 'chore: node');

  const finishUpToCommit = (num, edit) => {
    const st = sb.state(num);
    fillDoc(sb, num, { files: ['src/', 'package-lock.json'] });
    sb.ok(['approve-plan', String(num)]);
    edit(st.worktree);
    sb.ok(['test-code', String(num)]);
    sb.ok(['test-scenario', String(num), '1', 'pass', '확인']);
    sb.ok(['verify-close', String(num)]);
    sb.ok(['commit-task', String(num)]);
    return st;
  };

  const outA = open(sb, 'aaa');
  open(sb, 'bbb');
  assert.match(outA, /- 준비: npm ci\(\d+\.\d초\)/);
  const calls = (wt) => fs.readFileSync(log, 'utf8').trim().split('\n').filter((l) => l === `${wt} ci`).length;
  assert.strictEqual(calls(sb.state(1).worktree), 1);
  assert.strictEqual(calls(sb.state(2).worktree), 1);

  // A가 의존성 파일을 바꿔 병합 → B는 rebase로 받아 재설치 후 재테스트
  finishUpToCommit(1, (d) => fs.writeFileSync(path.join(d, 'package-lock.json'), '{"lockfileVersion":3,"v":2}\n'));
  const b = finishUpToCommit(2, (d) => fs.writeFileSync(path.join(d, 'src/b.txt'), 'b'));
  sb.ok(['merge-task', '1']);
  const outB = sb.ok(['merge-task', '2']);
  assert.match(outB, /의존성 파일이 바뀌어 다시 설치했다: npm ci/);
  assert.match(outB, /코드 테스트를 다시 돌렸다/);
  assert.strictEqual(calls(b.worktree), 2);

  // 의존성 파일이 그대로인 새 커밋만 받으면 재테스트만 한다
  open(sb, 'ccc');
  open(sb, 'ddd');
  const c = finishUpToCommit(3, (d) => fs.writeFileSync(path.join(d, 'src/c.txt'), 'c'));
  finishUpToCommit(4, (d) => fs.writeFileSync(path.join(d, 'src/d.txt'), 'd'));
  sb.ok(['merge-task', '4']);
  const outC = sb.ok(['merge-task', '3']);
  assert.match(outC, /코드 테스트를 다시 돌렸다/);
  assert.ok(!/다시 설치했다/.test(outC));
  assert.strictEqual(calls(c.worktree), 1);
});

test('init — 스택을 보고 빌드 결과 폴더를 매니페스트에 등록한다(Rust 루트·하위 폴더, SwiftPM), 없으면 등록하지 않는다', (t) => {
  const cases = [
    { files: { 'Cargo.toml': '[package]\n' }, want: ['target'] },
    { files: { 'package.json': '{}', 'src-tauri/Cargo.toml': '[package]\n' }, want: ['src-tauri/target'] },
    { files: { 'Package.swift': '// swift-tools-version:5.9\n' }, want: ['.build'] },
    { files: { 'package.json': '{}' }, want: undefined },
  ];
  for (const c of cases) {
    const sb = sandbox();
    t.after(() => sb.cleanup());
    for (const [rel, text] of Object.entries(c.files)) sb.write(rel, text);
    sb.git(['init', '-q']);
    commitAll(sb, 'chore: 시작');
    const out = sb.ok(['init'], { input: '1\n' });
    const m = JSON.parse(sb.read('.taskery-manifest.json'));
    assert.deepStrictEqual(m.buildOutput, c.want, JSON.stringify(c.files));
    if (c.want) assert.match(out, new RegExp(`빌드 결과 폴더 등록: ${c.want[0].replace('.', '\\.')}`));
  }
});
