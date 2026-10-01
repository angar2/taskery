// 태스크 한 길 시험 — prepare-task부터 close-task까지, 검사 거부, Phase 커밋, 범위 메모, 번호 잠금
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { installedRepo, fillDoc, BIN } = require('./helpers');

function openTask(sb, extra = []) {
  sb.ok(['prepare-task', '첫 기능 만들기', '--slug', 'first-feature', '--type', 'feature', '--size', 'small', '--dev', 'claude', ...extra]);
  return sb.state(1);
}

test('small 태스크 처음부터 끝까지 — 문서·링크·단계 표·커밋·병합·정리·변경 기록', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = openTask(sb, ['--item', '1', '--range', '끝까지']);
  const wt = st.worktree;
  assert.strictEqual(st.branch, 'feature/claude_TASK-001_first-feature');
  assert.strictEqual(st.parent, 'dev');
  assert.strictEqual(st.by, 'taskery');
  assert.ok(wt.startsWith(path.join(sb.home, '.taskery', 'worktrees')));
  // taskery 파일 심기 — 지침 파일은 복사, 나머지는 링크
  assert.ok(!fs.lstatSync(path.join(wt, 'AGENTS.md')).isSymbolicLink());
  assert.ok(!fs.lstatSync(path.join(wt, 'CLAUDE.md')).isSymbolicLink());
  for (const n of ['.project', '.claude', '.mcp.json']) assert.ok(fs.lstatSync(path.join(wt, n)).isSymbolicLink(), n);
  assert.strictEqual(sb.git(['status', '--porcelain'], wt), '', '링크·복사본은 git에 보이지 않는다');
  // 문서·메타·PLAN.md 연결
  const doc = sb.read(st.doc);
  assert.match(doc, /^# TASK-001 첫 기능 만들기\n<!-- taskery: plan=001_mvp type=feature size=small switch=plan,dev,test range=끝까지 parent=dev by=taskery -->/);
  assert.match(doc, /\| ⏳ \| – \| – \| – \|/);
  assert.ok(!/## Phase/.test(doc), 'small은 Phase 절 없음');
  assert.match(sb.read('.project/plans/001_mvp/PLAN.md'), /1\. 첫 기능 — 선행: 없음 \(TASK-001\)/);

  // approve-plan — 빈 문서는 거부
  let r = sb.tk(['approve-plan', 'TASK-001']);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /목표`가 비어/);
  assert.match(r.all, /시나리오가 0개/);
  fillDoc(sb, 1, { goal: '인사말을 바꾼다' });
  sb.ok(['approve-plan', '1'], { cwd: wt });
  assert.match(sb.read(st.doc), /\| ✅ (1분 미만|\d+분) \| ⏳ \| – \| – \|/);

  // 개발 — 워크트리에서 코드 수정 → test-code
  fs.writeFileSync(path.join(wt, 'src/app.txt'), 'hello world\n');
  fs.writeFileSync(path.join(wt, 'src/new.txt'), 'new\n');
  const tc = sb.ok(['test-code', 'TASK-001'], { cwd: wt });
  assert.match(tc, /통과/);
  assert.ok(sb.state(1).testCode.fingerprint);
  assert.match(sb.read(st.doc), /\| ✅ [^|]+ \| ✅ [^|]+ \| ⏳ \| – \|/);

  // 테스트 — 증거 없이 거부, 번호 범위 검사
  assert.notStrictEqual(sb.tk(['test-scenario', '1', '1', 'pass', '']).code, 0);
  assert.notStrictEqual(sb.tk(['test-scenario', '1', '2', 'pass', '출력']).code, 0);
  const ts = sb.ok(['test-scenario', '1', '1', 'pass', 'cat src/app.txt → hello world']);
  assert.match(ts, /모든 시나리오가 끝났다/);
  assert.match(sb.read(st.doc), /- 시나리오 1 · PASS · cat src\/app\.txt → hello world/);

  // 마무리
  assert.notStrictEqual(sb.tk(['commit-task', '1']).code, 0, 'verify-close 전 commit-task 거부');
  sb.ok(['verify-close', '1']);
  const ct = sb.ok(['commit-task', '1']);
  assert.match(ct, /커밋 1개/);
  assert.match(ct, /계획 확인 뒤 추가된 파일: src\/new\.txt/);
  const msg = sb.git(['log', '-1', '--format=%B', st.branch]);
  assert.match(msg, /^feat: \[TASK-001\] 첫 기능 만들기\n\n- src\/app\.txt\n- src\/new\.txt\n- 사유: 인사말을 바꾼다/);
  const mt = sb.ok(['merge-task', '1']);
  assert.match(mt, /dev에 병합했다\(no-ff/);
  assert.strictEqual(sb.git(['rev-list', '--parents', '-n', '1', 'dev']).split(' ').length, 3, '병합 커밋');
  assert.strictEqual(sb.read('src/app.txt'), 'hello world\n');

  const cl = sb.ok(['close-task', '1']);
  assert.match(cl, /끝난 태스크/);
  assert.match(cl, /복구: git branch feature\/claude_TASK-001_first-feature [0-9a-f]{40}/);
  assert.ok(!fs.existsSync(wt), '워크트리 삭제');
  assert.ok(!sb.git(['branch', '--list', st.branch]), '브랜치 삭제');
  assert.ok(fs.existsSync(path.join(sb.repo, '.project', 'rules', 'GIT_RULE.md')), '링크를 지워도 본진 .project는 그대로');
  assert.ok(fs.existsSync(path.join(sb.repo, 'AGENTS.md')));
  assert.match(sb.read(st.doc), /\| ✅ [^|]+ \| ✅ [^|]+ \| ✅ [^|]+ \| ✅ [^|]+\(합계 [^|]+\) \|/);
  const month = new Date().toISOString().slice(0, 7);
  const changelog = fs.readdirSync(path.join(sb.repo, '.project', 'changelog'));
  assert.strictEqual(changelog.length, 1);
  assert.match(sb.read(`.project/changelog/${changelog[0]}`), /## \[TASK-001\] 첫 기능 만들기\n\n- 날짜: .+\n- 유형: feature\n- 요약: 인사말을 바꾼다/);
  assert.ok(changelog[0].startsWith(month.slice(0, 4)));
  assert.ok(sb.state(1).closed.finished);
  assert.match(sb.ok(['status']), /열린 태스크 없음/);
  // 다음 번호는 이어진다
  sb.ok(['prepare-task', '둘째', '--slug', 'second', '--type', 'bug', '--size', 'small', '--dev', 'claude']);
  assert.strictEqual(sb.state(2).branch, 'bug/claude_TASK-002_second');
});

test('medium Phase 커밋 — 여러 Phase 파일은 앞 Phase, 목록 밖 파일은 마지막 Phase', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['prepare-task', '중간', '--slug', 'mid', '--type', 'improve', '--size', 'medium', '--dev', 'claude']);
  const st = sb.state(1);
  assert.match(sb.read(st.doc), /## 요구사항[\s\S]*## Phase/);
  fillDoc(sb, 1, {
    files: ['src/a.txt', 'src/b.txt'],
    phases: [
      { name: '첫 부분', files: ['src/a.txt', 'src/shared.txt'], reason: 'a를 만든다' },
      { name: '둘째 부분', files: ['src/b.txt', 'src/shared.txt'], reason: 'b를 만든다' },
    ],
  });
  sb.ok(['approve-plan', '1']);
  for (const f of ['a', 'b', 'shared', 'extra']) fs.writeFileSync(path.join(st.worktree, `src/${f}.txt`), f);
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  const ct = sb.ok(['commit-task', '1']);
  assert.match(ct, /커밋 2개/);
  const log = sb.git(['log', '--format=%B%x00', `${st.startCommit}..${st.branch}`]).split('\0').map((s) => s.trim()).filter(Boolean).reverse();
  assert.match(log[0], /^improve: \[TASK-001\] Phase 1 - 첫 부분\n\n- src\/a\.txt\n- src\/shared\.txt \(Phase 1·2 변경 포함\)\n- 사유: a를 만든다$/);
  assert.match(log[1], /^improve: \[TASK-001\] Phase 2 - 둘째 부분\n\n- src\/b\.txt\n- src\/extra\.txt\n- 사유: b를 만든다$/);
  assert.match(ct, /계획 확인 뒤 추가된 파일: src\/extra\.txt/);
});

test('verify-close 검사 — test-code 뒤 코드 변경, FAIL은 accept로만, accept는 FAIL 뒤에만', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = openTask(sb);
  fillDoc(sb, 1, { criteria: ['[AUTO] a → b → c', '[USER] d → e → f'] });
  assert.match(sb.tk(['verify-close', '1']).all, /계획 끝 표시가 없다/);
  sb.ok(['approve-plan', '1']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'v1');
  assert.match(sb.tk(['verify-close', '1']).all, /test-code 통과 기록이 없다/);
  sb.ok(['test-code', '1']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'v2');
  let r = sb.tk(['verify-close', '1']);
  assert.match(r.all, /test-code 통과 뒤 코드가 바뀌었다/);
  assert.match(r.all, /시나리오 1의 결과·증거가 없다/);
  sb.ok(['test-code', '1']);
  assert.notStrictEqual(sb.tk(['test-scenario', '1', '2', 'accept', '그냥 가자']).code, 0, 'FAIL 없이 accept 거부');
  sb.ok(['test-scenario', '1', '1', 'pass', '출력 c']);
  sb.ok(['test-scenario', '1', '2', 'fail', '사용자 확인 19:02 — f가 안 보임']);
  r = sb.tk(['verify-close', '1']);
  assert.match(r.all, /시나리오 2가 FAIL이다/);
  const acc = sb.ok(['test-scenario', '1', '2', 'accept', '알고 넘어가자']);
  assert.match(acc, /FAIL 수락/);
  assert.match(sb.read(st.doc), /시나리오 2 · FAIL · [\s\S]*시나리오 2 · FAIL 수락 · 사용자: "알고 넘어가자"/);
  assert.match(sb.read(st.doc), /\(FAIL 수락\)/);
  sb.ok(['verify-close', '1']);
});

test('개발 꺼짐 태스크 — 코드 변경 검사, 커밋 없이 요약, 병합 건너뜀, 끝난 태스크로 닫힘', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = openTask(sb, ['--switch', 'plan,test']);
  assert.match(sb.read(st.doc), /\| ⏳ \| 꺼짐 \| – \| – \|/);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'changed');
  assert.match(sb.tk(['verify-close', '1']).all, /개발 꺼짐 태스크인데/);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'hello\n');
  sb.ok(['verify-close', '1']);
  assert.match(sb.ok(['commit-task', '1']), /코드 변경 없음/);
  assert.match(sb.ok(['merge-task', '1']), /병합을 건너뛴다\(개발 꺼짐\)/);
  const cl = sb.ok(['close-task', '1']);
  assert.match(cl, /끝난 태스크/);
  assert.ok(!fs.existsSync(st.worktree));
});

test('코드 변경 없는 개발 켜짐 태스크 — commit-task가 코드 변경 없음을 남기고 merge-task가 건너뜀', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  openTask(sb, ['--switch', 'plan,dev']);
  fillDoc(sb, 1, { criteria: [] });
  sb.ok(['approve-plan', '1']);
  sb.ok(['test-code', '1']);
  sb.ok(['verify-close', '1']);
  assert.match(sb.ok(['commit-task', '1']), /코드 변경 없음/);
  assert.ok(sb.state(1).commit.noCodeChange);
  assert.match(sb.ok(['merge-task', '1']), /건너뛴다\(코드 변경 없음\)/);
  assert.match(sb.ok(['close-task', '1']), /끝난 태스크/);
});

test('입력 거부 — 빠진 입력 목록, 개발·테스트 둘 다 꺼짐, 플랜 여럿, test-code 미등록', (t) => {
  const sb = installedRepo({ codeTest: null });
  t.after(() => sb.cleanup());
  let r = sb.tk(['prepare-task', '이름만']);
  assert.notStrictEqual(r.code, 0);
  for (const k of ['--slug', '--type', '--size', '--dev']) assert.match(r.all, new RegExp(k));
  r = sb.tk(['prepare-task', 'x', '--slug', 'x', '--type', 'feature', '--size', 'small', '--dev', 'c', '--switch', 'plan']);
  assert.match(r.all, /둘 다 꺼진 태스크/);
  sb.ok(['plan-init', 'second']);
  assert.match(sb.tk(['plan-init', 'second']).all, /같은 slug의 플랜이 이미 있다/);
  r = sb.tk(['prepare-task', 'x', '--slug', 'x', '--type', 'feature', '--size', 'small', '--dev', 'c']);
  assert.match(r.all, /플랜이 여럿이라 정할 수 없다. --plan/);
  sb.ok(['prepare-task', 'x', '--slug', 'x', '--type', 'feature', '--size', 'small', '--dev', 'c', '--plan', '002_second']);
  r = sb.tk(['test-code', '1']);
  assert.match(r.all, /등록된 코드 테스트 명령이 없다/);
  sb.ok(['test-code', '--register', 'none']);
  assert.match(sb.ok(['test-code', '1']), /코드 테스트 없음/);
  const passedAt = sb.state(1).testCode.at;
  sb.ok(['test-code', '--register', 'echo 첫째', 'exit 3']);
  r = sb.tk(['test-code', '1']);
  assert.match(r.all, /실패 — `exit 3` \(종료 코드 3\)/);
  assert.strictEqual(sb.state(1).testCode.at, passedAt, '실패는 개발 칸을 바꾸지 않는다');
  assert.deepStrictEqual(JSON.parse(sb.read('.taskery-manifest.json')).codeTest, ['echo 첫째', 'exit 3']);
});

test('--range — 태스크 명령에 붙이면 범위 메모만 바뀐다', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = openTask(sb);
  assert.match(sb.read(st.doc), /range="한 단계"/);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1', '--range', '개발까지']);
  assert.match(sb.read(st.doc), /range=개발까지/);
  assert.strictEqual(sb.state(1).range, '개발까지');
});

test('번호 잠금 — prepare-task를 동시에 불러도 번호가 겹치지 않는다', async (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const run = (i) =>
    new Promise((resolve) => {
      const c = spawn(process.execPath, [BIN, 'prepare-task', `동시 ${i}`, '--slug', `para-${i}`, '--type', 'feature', '--size', 'small', '--dev', 'claude'], { cwd: sb.repo, env: sb.env });
      let all = '';
      c.stdout.on('data', (d) => (all += d));
      c.stderr.on('data', (d) => (all += d));
      c.on('close', (code) => resolve({ code, all }));
    });
  const results = await Promise.all([1, 2, 3, 4].map(run));
  for (const r of results) assert.strictEqual(r.code, 0, r.all);
  const nums = results.map((r) => r.all.match(/TASK-(\d+)/)[1]).sort();
  assert.deepStrictEqual(nums, ['001', '002', '003', '004']);
});
