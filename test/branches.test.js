// 병합·분기 시험 — 충돌 뒤 이어 가기, 부모가 움직였을 때 재테스트, 분기 생략, 포기, 정리 보존, ff-only
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { installedRepo, fillDoc } = require('./helpers');

// 태스크 하나를 commit-task까지 진행한다
function upToCommit(sb, num, slug, edit, extra = []) {
  sb.ok(['prepare-task', `태스크 ${slug}`, '--slug', slug, '--type', 'feature', '--size', 'small', '--dev', 'claude', ...extra]);
  const st = sb.state(num);
  fillDoc(sb, num);
  sb.ok(['approve-plan', String(num)]);
  edit(st.worktree || sb.repo);
  sb.ok(['test-code', String(num)]);
  sb.ok(['test-scenario', String(num), '1', 'pass', '확인']);
  sb.ok(['verify-close', String(num)]);
  sb.ok(['commit-task', String(num)]);
  return sb.state(num);
}

test('충돌 — merge-task가 rebase 상태를 남기고 멈춤 → 파일 고친 뒤 다시 부르면 이어 가서 재테스트 후 병합', (t) => {
  const sb = installedRepo({ codeTest: ['test -f src/app.txt'] });
  t.after(() => sb.cleanup());
  const a = upToCommit(sb, 1, 'aaa', (d) => fs.writeFileSync(path.join(d, 'src/app.txt'), 'from A\n'));
  const b = upToCommit(sb, 2, 'bbb', (d) => fs.writeFileSync(path.join(d, 'src/app.txt'), 'from B\n'));
  sb.ok(['merge-task', '1']);
  let r = sb.tk(['merge-task', '2']);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /충돌이 났다[\s\S]*- src\/app\.txt/);
  assert.ok(fs.existsSync(path.join(sb.repo, '.taskery', '.state', 'merge.lock')), '잠금 파일은 남아도');
  // 충돌 표시가 남아 있으면 다시 멈춘다
  r = sb.tk(['merge-task', '2']);
  assert.match(r.all, /충돌이 났다/);
  fs.writeFileSync(path.join(b.worktree, 'src/app.txt'), 'from A and B\n');
  const out = sb.ok(['merge-task', '2']);
  assert.match(out, /코드 테스트를 다시 돌렸다/);
  assert.match(out, /dev에 병합했다/);
  assert.strictEqual(sb.read('src/app.txt'), 'from A and B\n');
  sb.ok(['close-task', '1']);
  sb.ok(['close-task', '2']);
  assert.ok(!fs.existsSync(a.worktree) && !fs.existsSync(b.worktree));
});

test('부모가 움직였고 충돌이 없으면 — 다시 rebase하고 코드 테스트를 다시 돌린 뒤 병합, 테스트 실패면 멈춤', (t) => {
  // 각 태스크는 혼자 통과하지만 합치면 파일이 3개가 되어 실패하는 코드 테스트
  const sb = installedRepo({ codeTest: ['test $(ls src | wc -l) -lt 3'] });
  t.after(() => sb.cleanup());
  upToCommit(sb, 1, 'one', (d) => fs.writeFileSync(path.join(d, 'src/one.txt'), 'one\n'));
  upToCommit(sb, 2, 'two', (d) => fs.writeFileSync(path.join(d, 'src/two.txt'), 'two\n'));
  sb.ok(['merge-task', '1']);
  const r = sb.tk(['merge-task', '2']);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /test-code: 실패/);
  assert.ok(!sb.state(2).merge);
});

test('--no-worktree — 본진을 태스크 브랜치로, 다른 prepare-task는 원인 태스크를 알리고 거부, merge-task가 본진을 되돌림', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['prepare-task', '본진 작업', '--slug', 'inplace', '--type', 'chore', '--size', 'small', '--dev', 'claude', '--no-worktree']);
  const st = sb.state(1);
  assert.strictEqual(st.worktree, null);
  assert.strictEqual(sb.git(['symbolic-ref', '--short', 'HEAD']), st.branch);
  assert.strictEqual(st.by, '생략');
  assert.doesNotMatch(sb.read(st.doc), /<!-- taskery:/);
  const r = sb.tk(['prepare-task', '다른', '--slug', 'other', '--type', 'feature', '--size', 'small', '--dev', 'claude']);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /TASK-001의 브랜치[\s\S]*원인 태스크: TASK-001\(워크트리 생략\)/);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  sb.write('src/app.txt', 'in place\n');
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  sb.ok(['merge-task', '1']);
  assert.strictEqual(sb.git(['symbolic-ref', '--short', 'HEAD']), 'dev');
  assert.strictEqual(sb.read('src/app.txt'), 'in place\n');
  assert.match(sb.ok(['close-task', '1']), /브랜치 chore\/claude_TASK-001_inplace를 지웠다/);
});

test('--no-branch — 본진의 현재 브랜치에 커밋, 병합 건너뜀, 열려 있는 동안 커밋 안 된 코드가 있으면 다른 태스크 거부', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['prepare-task', '바로', '--slug', 'direct', '--type', 'bug', '--size', 'small', '--no-branch']);
  const st = sb.state(1);
  assert.strictEqual(st.branch, null);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  sb.write('src/app.txt', 'direct\n');
  const r = sb.tk(['prepare-task', '다른', '--slug', 'other', '--type', 'feature', '--size', 'small', '--dev', 'claude']);
  assert.match(r.all, /커밋 안 된 코드 변경[\s\S]*TASK-001\(브랜치 생략\)/);
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  assert.match(sb.ok(['commit-task', '1']), /커밋 1개/);
  assert.match(sb.git(['log', '-1', '--format=%s', 'dev']), /^fix: \[TASK-001\] 바로/);
  assert.match(sb.ok(['merge-task', '1']), /건너뛴다\(브랜치 생략\)/);
  assert.match(sb.ok(['close-task', '1']), /끝난 태스크/);
});

test('포기 — 병합 없이 닫으면 워크트리는 지우고 병합 안 된 브랜치는 남김, 커밋 안 된 변경이 있으면 둘 다 남김', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const a = upToCommit(sb, 1, 'giveup', (d) => fs.writeFileSync(path.join(d, 'src/app.txt'), 'x\n'));
  const out = sb.ok(['close-task', '1']);
  assert.match(out, /포기/);
  assert.match(out, /병합되지 않아 남겼다/);
  assert.ok(!fs.existsSync(a.worktree));
  assert.ok(sb.git(['branch', '--list', a.branch]));
  assert.strictEqual(fs.readdirSync(path.join(sb.repo, '.taskery')).includes('changelog'), false, '포기는 변경 기록 없음');

  sb.ok(['prepare-task', '남김', '--slug', 'keep', '--type', 'feature', '--size', 'small', '--dev', 'claude']);
  const b = sb.state(2);
  fs.writeFileSync(path.join(b.worktree, 'scratch.txt'), 'wip');
  const out2 = sb.ok(['close-task', '2']);
  assert.match(out2, /커밋 안 된 변경·추적 안 되는 파일이 있어 워크트리와 브랜치를 남겼다/);
  assert.ok(fs.existsSync(b.worktree));
  assert.ok(sb.state(2).closed);
});

test('GIT_RULE.md 표 — ff-only 병합, 작업자 칸 없는 브랜치 이름', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const rule = sb
    .read('.taskery/rules/GIT_RULE.md')
    .replace('| 브랜치 이름 | `{type}/{dev}_TASK-{num}_{slug}` |', '| 브랜치 이름 | `task/{num}-{slug}` |')
    .replace('| 병합 방식 | `no-ff` |', '| 병합 방식 | `ff-only` |');
  sb.write('.taskery/rules/GIT_RULE.md', rule);
  sb.ok(['prepare-task', '빠른', '--slug', 'fast', '--type', 'feature', '--size', 'small']);
  const st = sb.state(1);
  assert.strictEqual(st.branch, 'task/001-fast');
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'ff\n');
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  assert.match(sb.ok(['merge-task', '1']), /ff-only/);
  assert.strictEqual(sb.git(['rev-parse', 'dev']), sb.git(['rev-parse', st.branch]), 'fast-forward');
});
