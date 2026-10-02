// 백로그·status·prune 시험 — backlog-add/get/mark, prepare-task --from, close-task의 연결 표시·항목 이동, 시작할 수 있는 태스크, prune
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { installedRepo, fillDoc } = require('./helpers');

function open(sb, slug, extra = []) {
  return sb.ok(['prepare-task', `태스크 ${slug}`, '--slug', slug, '--type', 'feature', '--size', 'small', '--dev', 'claude', ...extra]);
}

// 열린 태스크를 병합까지 끝낸다
function finish(sb, num, file) {
  const st = sb.state(num);
  fillDoc(sb, num, { files: [file] });
  sb.ok(['approve-plan', String(num)]);
  fs.writeFileSync(path.join(st.worktree, file), `${num}\n`);
  sb.ok(['test-code', String(num)]);
  sb.ok(['test-scenario', String(num), '1', 'pass', '확인']);
  sb.ok(['verify-close', String(num)]);
  sb.ok(['commit-task', String(num)]);
  sb.ok(['merge-task', String(num)]);
  return sb.ok(['close-task', String(num)]);
}

function openPart(sb) {
  return sb.read('.taskery/BACKLOG.md').split('\n## 열린 항목\n')[1].split('\n## 끝난 항목\n')[0];
}
function donePart(sb) {
  return sb.read('.taskery/BACKLOG.md').split('\n## 끝난 항목\n')[1];
}

test('backlog-add·get·mark — 부록 B 양식, 번호 발급, 목록·전문, 연결', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  assert.match(sb.ok(['backlog-add', '저장 버튼 색', '--type', 'improve']), /BL-1을 .*열린 항목 맨 위에 넣었다[\s\S]*필수 칸\(현상\)/);
  assert.match(sb.ok(['backlog-add', '로그인 오류']), /필수 칸\(종류·현상\)/);
  assert.match(sb.tk(['backlog-add', 'x', '--type', 'oops']).all, /--type 'oops'을 모른다/);
  assert.match(sb.tk(['backlog-add']).all, /<제목>을 넣는다/);
  // 새 항목이 맨 위, 양식은 필수·자동 칸만
  assert.match(openPart(sb), /^\n### BL-2 \[<종류>\] 로그인 오류\n- 상태: 대기\n- 등록: \d{4}-\d{2}-\d{2}\n- 현상: <현상>\n- 연결 태스크: –\n\n### BL-1 \[improve\] 저장 버튼 색\n/);
  // AI가 칸을 채운 뒤
  const filled = sb
    .read('.taskery/BACKLOG.md')
    .replace(/(### BL-2 )\[<종류>\]( 로그인 오류\n(?:- .*\n)*?)- 현상: <현상>/, '$1[bug]$2- 현상: 비밀번호가 맞아도 실패\n- 우선순위: 높음');
  sb.write('.taskery/BACKLOG.md', filled);
  assert.strictEqual(sb.ok(['backlog-get']).trim().split('\n').slice(1).join('\n'), '- BL-2 [bug] 로그인 오류 — 대기\n- BL-1 [improve] 저장 버튼 색 — 대기');
  assert.match(sb.ok(['backlog-get', 'BL-2']), /^### BL-2 \[bug\] 로그인 오류\n- 상태: 대기\n- 등록: .+\n- 현상: 비밀번호가 맞아도 실패\n- 우선순위: 높음\n- 연결 태스크: –\n$/);
  assert.match(sb.tk(['backlog-get', 'BL-9']).all, /BL-9이 없다/);
  // --from 없이 연 태스크를 나중에 연결
  open(sb, 'later');
  assert.match(sb.ok(['backlog-mark', 'BL-1', 'TASK-001']), /BL-1에 TASK-001을 연결했다 — 상태 진행/);
  assert.match(openPart(sb), /### BL-1 \[improve\] 저장 버튼 색\n- 상태: 진행\n[\s\S]*- 연결 태스크: TASK-001/);
  assert.match(sb.tk(['backlog-mark', 'BL-1', 'TASK-099']).all, /TASK-099의 기록이 없다/);
});

test('--from — 백로그 연결, 없는 번호는 태스크를 만들기 전에 거부, close-task가 (완료)·(포기) 표시와 항목 이동, 끝난 항목 되열기', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['backlog-add', '한 묶음', '--type', 'feature']); // BL-1
  sb.ok(['backlog-add', '포기될 것', '--type', 'bug']); // BL-2
  let r = sb.tk(['prepare-task', 'x', '--slug', 'x', '--type', 'feature', '--size', 'small', '--dev', 'claude', '--from', 'BL-1,BL-7']);
  assert.match(r.all, /--from의 BL-7이 BACKLOG.md에 없다/);
  assert.ok(!fs.existsSync(path.join(sb.repo, '.taskery', '.state', 'tasks')), '아무것도 만들지 않았다');
  assert.ok(!sb.git(['branch', '--list', 'feature/*']));

  assert.match(open(sb, 'first', ['--from', 'BL-1,BL-2']), /- 백로그: BL-1, BL-2 — 진행/);
  open(sb, 'second', ['--from', '1']);
  assert.match(openPart(sb), /### BL-1 [^\n]+\n- 상태: 진행\n[\s\S]*- 연결 태스크: TASK-001, TASK-002/);

  // TASK-001 포기 → 둘 다 아직 열린 연결이 있거나(BL-1) 모두 포기(BL-2 → 대기)
  let out = sb.ok(['close-task', '1']);
  assert.match(out, /포기/);
  assert.match(out, /BL-2 — 연결 태스크가 모두 포기로 닫혀 대기로 되돌렸다/);
  assert.match(out, /BL-1 — TASK-001 \(포기\) 표시/);
  assert.match(openPart(sb), /### BL-2 [^\n]+\n- 상태: 대기\n[\s\S]*?- 연결 태스크: TASK-001 \(포기\)/);
  assert.match(openPart(sb), /- 연결 태스크: TASK-001 \(포기\), TASK-002\n/);

  // TASK-002 끝남 → BL-1은 연결이 모두 닫혔고 하나가 끝났다 → 완료, 끝난 항목으로
  out = finish(sb, 2, 'src/app.txt');
  assert.match(out, /BL-1 — 연결 태스크가 모두 닫혀 끝난 항목으로 옮겼다/);
  assert.ok(!/BL-1/.test(openPart(sb)));
  assert.match(donePart(sb), /### BL-1 \[feature\] 한 묶음\n- 상태: 완료\n[\s\S]*- 연결 태스크: TASK-001 \(포기\), TASK-002 \(완료\)/);

  // 끝난 항목을 다시 연결 — 열린 항목 맨 위로 되돌리고 진행
  out = open(sb, 'third', ['--from', 'BL-1']);
  assert.match(out, /BL-1은 끝난 항목이었다 — 열린 항목으로 되돌리고 진행으로 바꿨다/);
  assert.match(openPart(sb), /^\n### BL-1 \[feature\] 한 묶음\n- 상태: 진행\n[\s\S]*- 연결 태스크: TASK-001 \(포기\), TASK-002 \(완료\), TASK-003\n/);
  assert.ok(!/BL-1/.test(donePart(sb)));
});

test('status — 플랜별 시작할 수 있는 태스크(선행·열린 태스크·끝남·포기)와 읽지 못한 항목', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.write(
    '.taskery/plans/001_mvp/PLAN.md',
    [
      '# MVP',
      '',
      '## 목표',
      '시험',
      '',
      '## 태스크 목록',
      '1. 로그인 화면 — 선행: 없음',
      '2. 로그인 API 연결 — 선행: 1',
      '3. 설정 화면 — 선행: 1, 2',
      '4. 도움말 — 선행: 없음',
      '- 나중에 정할 것',
      '5. 알림 — 선행: 9',
      '',
    ].join('\n'),
  );
  sb.ok(['plan-init', 'empty']);
  const plans = () => sb.ok(['status']).split('플랜별 시작할 수 있는 태스크 (PLAN.md 목록 항목)\n')[1];
  let s = plans();
  assert.match(s, /^- 001_mvp: 1\. 로그인 화면 · 4\. 도움말\n/);
  assert.match(s, /읽지 못한 항목\(시작할 수 있는 태스크에서 뺐다\): - 나중에 정할 것/);
  assert.match(s, /읽지 못한 항목[^\n]*: 5\. 알림 — 선행: 9 \(선행 항목 9이 목록에 없다\)/);
  assert.match(s, /- 002_empty: 없음/);

  open(sb, 'login', ['--plan', '001_mvp', '--item', '1']);
  open(sb, 'help', ['--plan', '001_mvp', '--item', '4']);
  assert.match(plans(), /^- 001_mvp: 없음\n/, '열린 태스크가 있는 항목은 빠진다');
  finish(sb, 1, 'src/app.txt');
  assert.match(plans(), /^- 001_mvp: 2\. 로그인 API 연결\n/, '선행 1이 끝나 2가 열린다, 3은 2를 기다린다');
  sb.ok(['close-task', '2']); // 포기
  assert.match(plans(), /^- 001_mvp: 2\. 로그인 API 연결 · 4\. 도움말\n/, '포기로 닫힌 항목은 다시 시작 대상');
  // 끝난 항목에 다시 연결해 연 태스크가 포기되면, 가장 최근 연결 기준으로 끝나지 않은 항목이 된다
  open(sb, 'login-again', ['--plan', '001_mvp', '--item', '1']);
  assert.match(sb.read('.taskery/plans/001_mvp/PLAN.md'), /1\. 로그인 화면 — 선행: 없음 \(TASK-001\) \(TASK-003\)/);
  sb.ok(['close-task', '3']);
  assert.match(plans(), /^- 001_mvp: 1\. 로그인 화면 · 4\. 도움말\n/);
});

test('prune — 닫힌 태스크에 남은 워크트리·브랜치를 항목마다 묻고 정리, --yes, 커밋 안 된 변경은 건너뜀, 묻지 못하면 목록만', async (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  // 포기한 태스크 셋 — 병합 안 된 커밋이 있어 브랜치가 남은 둘, 추적 안 되는 파일로 워크트리가 남은 하나
  for (const slug of ['aaa', 'bbb', 'ccc']) open(sb, slug);
  for (const n of [1, 2]) {
    const wt = sb.state(n).worktree;
    fs.writeFileSync(path.join(wt, 'src/app.txt'), `abandoned ${n}\n`);
    sb.git(['commit', '-q', '-am', `wip ${n}`], wt);
  }
  fs.writeFileSync(path.join(sb.state(3).worktree, 'scratch.txt'), 'x');
  for (const n of [1, 2, 3]) sb.ok(['close-task', String(n)]);
  assert.match(sb.read('.taskery/.state/tasks/001.json'), /"finished": false/);
  assert.ok(sb.git(['branch', '--list', 'feature/claude_TASK-001_aaa']));
  assert.ok(fs.existsSync(sb.state(3).worktree));

  // 묻지 못하는 호출(MCP) — 지우지 않고 목록과 --yes 안내만
  const { prune } = require('../bin/prune');
  const listed = await prune({ main: sb.repo, ask: null }, {});
  assert.match(listed, /남음: TASK-001 태스크 aaa \(포기\): 브랜치 feature\/claude_TASK-001_aaa — 부모에 병합되지 않음/);
  assert.match(listed, /건너뜀: TASK-003 [^\n]*커밋 안 된 변경 1개/);
  assert.match(listed, /--yes로 다시 부른다/);
  assert.ok(sb.git(['branch', '--list', 'feature/claude_TASK-001_aaa']));

  // 항목마다 묻는다 — 1은 아니오, 2는 예
  let out = sb.ok(['prune'], { input: 'n\ny\n' });
  assert.match(out, /보존: TASK-001/);
  assert.match(out, /TASK-002:\n {2}- 브랜치 feature\/claude_TASK-002_bbb를 지웠다\. 복구: git branch feature\/claude_TASK-002_bbb [0-9a-f]{40}/);
  assert.match(out, /건너뜀: TASK-003/);
  assert.ok(sb.git(['branch', '--list', 'feature/claude_TASK-001_aaa']));
  assert.ok(!sb.git(['branch', '--list', 'feature/claude_TASK-002_bbb']));

  // --yes — 묻지 않고 정리, 커밋 안 된 변경이 있는 곳은 그래도 건너뜀
  out = sb.ok(['prune', '--yes']);
  assert.match(out, /TASK-001:\n {2}- 브랜치 feature\/claude_TASK-001_aaa를 지웠다/);
  assert.match(out, /건너뜀: TASK-003/);
  assert.ok(fs.existsSync(sb.state(3).worktree));
  fs.rmSync(path.join(sb.state(3).worktree, 'scratch.txt'));
  out = sb.ok(['prune', '--yes']);
  assert.match(out, /워크트리를 지웠다/);
  assert.match(sb.ok(['prune']), /정리할 것 없음/);
});
