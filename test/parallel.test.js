// 병렬 안전 시험 — 여러 프로세스로 prepare-task·plan-init·backlog-add·merge-task를 동시에 불러 번호 겹침·병합 섞임이 없는지
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { installedRepo, fillDoc, BIN } = require('./helpers');

function run(sb, args) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [BIN, ...args], { cwd: sb.repo, env: sb.env });
    let all = '';
    c.stdout.on('data', (d) => (all += d));
    c.stderr.on('data', (d) => (all += d));
    c.on('close', (code) => resolve({ code, all, args }));
  });
}

function allOk(results) {
  for (const r of results) assert.strictEqual(r.code, 0, `${r.args.join(' ')}\n${r.all}`);
}

test('번호 잠금 — prepare-task·plan-init·backlog-add(·--from)를 한꺼번에 불러도 태스크·플랜·백로그 번호가 겹치지 않는다', async (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['backlog-add', '먼저 있던 항목', '--type', 'bug']);
  const jobs = [];
  for (let i = 1; i <= 5; i++) {
    const extra = i === 1 ? ['--from', 'BL-1'] : [];
    jobs.push(['prepare-task', `동시 ${i}`, '--slug', `para-${i}`, '--type', 'feature', '--size', 'small', '--dev', 'claude', '--plan', '001_mvp', ...extra]);
  }
  for (let i = 1; i <= 3; i++) jobs.push(['plan-init', `plan-${i}`]);
  for (let i = 1; i <= 6; i++) jobs.push(['backlog-add', `동시 항목 ${i}`, '--type', 'improve']);
  const results = await Promise.all(jobs.map((j) => run(sb, j)));
  allOk(results);

  const taskNums = results.filter((r) => r.args[0] === 'prepare-task').map((r) => r.all.match(/TASK-(\d+)/)[1]).sort();
  assert.deepStrictEqual(taskNums, ['001', '002', '003', '004', '005']);
  const branches = sb.git(['branch', '--format=%(refname:short)']).split('\n').filter((b) => b.startsWith('feature/'));
  assert.strictEqual(branches.length, 5);
  const plans = fs.readdirSync(path.join(sb.repo, '.taskery', 'plans')).sort();
  assert.deepStrictEqual(plans.map((p) => p.slice(0, 4)), ['001_', '002_', '003_', '004_']);
  const backlog = sb.read('.taskery/BACKLOG.md');
  const bls = [...backlog.matchAll(/^### BL-(\d+) /gm)].map((m) => Number(m[1])).sort((a, b) => a - b);
  assert.deepStrictEqual(bls, [1, 2, 3, 4, 5, 6, 7], '덮어써 잃은 항목 없음');
  assert.match(backlog, /### BL-1 \[bug\] 먼저 있던 항목\n- 상태: 진행\n- 등록: .+\n- 현상: <현상>\n- 연결 태스크: TASK-\d{3}/);
  // 워크트리마다 taskery 링크가 제대로 심겼다
  for (let n = 1; n <= 5; n++) assert.ok(fs.lstatSync(path.join(sb.state(n).worktree, '.taskery')).isSymbolicLink());
});

test('병합 잠금 — 세 태스크의 merge-task를 동시에 불러도 차례로 rebase·재테스트·병합하고 섞이지 않는다', async (t) => {
  const sb = installedRepo({ codeTest: ['test -f src/app.txt'] });
  t.after(() => sb.cleanup());
  const names = ['aaa', 'bbb', 'ccc'];
  names.forEach((slug, i) => {
    const num = i + 1;
    sb.ok(['prepare-task', `태스크 ${slug}`, '--slug', slug, '--type', 'feature', '--size', 'medium', '--dev', 'claude']);
    const st = sb.state(num);
    fillDoc(sb, num, {
      files: [`src/${slug}/`],
      phases: [
        { name: '첫 부분', files: [`src/${slug}/one.txt`], reason: '하나' },
        { name: '둘째 부분', files: [`src/${slug}/two.txt`], reason: '둘' },
      ],
    });
    sb.ok(['approve-plan', String(num)]);
    fs.mkdirSync(path.join(st.worktree, 'src', slug));
    fs.writeFileSync(path.join(st.worktree, 'src', slug, 'one.txt'), `${slug} 1`);
    fs.writeFileSync(path.join(st.worktree, 'src', slug, 'two.txt'), `${slug} 2`);
    sb.ok(['test-code', String(num)]);
    sb.ok(['test-scenario', String(num), '1', 'pass', '확인']);
    sb.ok(['verify-close', String(num)]);
    sb.ok(['commit-task', String(num)]);
  });
  const results = await Promise.all(names.map((_, i) => run(sb, ['merge-task', String(i + 1)])));
  allOk(results);
  assert.strictEqual(results.filter((r) => /코드 테스트를 다시 돌렸다/.test(r.all)).length, 2, '먼저 들어간 하나만 재테스트 없이 병합');

  // dev: 병합 커밋 3개, 각 병합의 두 번째 부모 쪽에 그 태스크의 Phase 커밋 2개만 있다
  const merges = sb.git(['log', '--merges', '--format=%H', 'dev']).split('\n');
  assert.strictEqual(merges.length, 3);
  for (const m of merges) {
    const own = sb.git(['log', '--format=%s', `${m}^1..${m}^2`]).split('\n');
    assert.strictEqual(own.length, 2, own.join('\n'));
    const tasks = new Set(own.map((s) => s.match(/TASK-(\d+)/)[1]));
    assert.strictEqual(tasks.size, 1, '한 병합에 한 태스크의 커밋만');
  }
  for (const slug of names) {
    assert.strictEqual(sb.read(`src/${slug}/one.txt`), `${slug} 1`);
    assert.strictEqual(sb.read(`src/${slug}/two.txt`), `${slug} 2`);
  }
  assert.strictEqual(sb.git(['status', '--porcelain', '-uno']), '', '본진에 병합 찌꺼기 없음');
  for (let n = 1; n <= 3; n++) assert.ok(sb.state(n).merge.commit);
  // 동시 close-task — 정리와 백로그 표시가 서로 덮지 않는다
  const closed = await Promise.all([1, 2, 3].map((n) => run(sb, ['close-task', String(n)])));
  allOk(closed);
  assert.strictEqual(sb.git(['worktree', 'list']).split('\n').length, 1, '워크트리 0개');
});
