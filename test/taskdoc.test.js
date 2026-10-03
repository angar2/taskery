// 태스크 문서 틀(1.0.1) 시험 — 스위치별 절, 결과 줄 중복 방지, 상태 칸, 목표 줄 검사, 코드 블록, 1.0.0 문서 호환
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { installedRepo, fillDoc, writeDocV100 } = require('./helpers');

function open(sb, extra = [], slug = 'doc') {
  sb.ok(['prepare-task', '문서 시험', '--slug', slug, '--type', 'feature', '--size', 'small', '--dev', 'claude', ...extra]);
  return sb.state(1);
}

function resultLines(doc) {
  return doc.slice(doc.indexOf('## 결과')).split('\n').filter((l) => l.startsWith('- '));
}

test('개발 꺼짐 — 개발 계획 절 없음, 파일 없이 approve-plan, 병합 건너뜀 줄 1개(merge-task를 다시 불러도)', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['prepare-task', '점검', '--slug', 'check', '--type', 'chore', '--size', 'small', '--dev', 'claude', '--switch', 'plan,test']);
  const st = sb.state(1);
  let doc = sb.read(st.doc);
  assert.match(doc, /## 요구사항\n\n## 테스트 계획\n\n## 결정\n\n## 결과\n/);
  assert.doesNotMatch(doc, /## 개발 계획/);
  assert.match(doc, /\| 기획·테스트 \|/);
  doc = doc.replace('## 요구사항\n', '## 요구사항\n흐름을 점검한다.\n').replace('## 테스트 계획\n', '## 테스트 계획\n1. [AUTO] 앱 → 실행 → 보인다\n');
  sb.write(st.doc, doc);
  assert.match(sb.ok(['approve-plan', '1']), /계획을 기록했다 — 시작·기획 [^,\n]+\.\n/);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  sb.ok(['merge-task', '1']);
  assert.match(sb.ok(['merge-task', '1']), /병합은 이미 건너뛰었다\(개발 꺼짐\)/);
  sb.ok(['close-task', '1']);
  const lines = resultLines(sb.read(st.doc));
  assert.strictEqual(lines.length, 2, lines.join('\n'));
  assert.match(lines[0], /^- 시나리오 1 · PASS · 확인 · /);
  assert.match(lines[1], /^- 병합 · 건너뜀\(개발 꺼짐\) · \d{4}-/);
  assert.match(sb.read(st.doc), /\| 닫힘\(완료\) \|/);
});

test('테스트 꺼짐 — 테스트 계획 절 없음', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = open(sb, ['--switch', 'plan,dev']);
  const doc = sb.read(st.doc);
  assert.match(doc, /## 요구사항\n\n## 개발 계획\n\n## 결정\n/);
  assert.doesNotMatch(doc, /## 테스트 계획/);
});

test('코드 변경 없음 — commit-task·merge-task를 두 번 불러도 결과 줄은 한 번씩', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = open(sb, ['--switch', 'plan,dev']);
  fillDoc(sb, 1, { criteria: [] });
  sb.ok(['approve-plan', '1']);
  sb.ok(['test-code', '1']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  sb.ok(['commit-task', '1']);
  sb.ok(['merge-task', '1']);
  sb.ok(['merge-task', '1']);
  const lines = resultLines(sb.read(st.doc));
  assert.deepStrictEqual(
    lines.map((l) => l.split(' · ').slice(0, 2).join(' · ')),
    ['- 코드 테스트 · 통과', '- 커밋 · 코드 변경 없음', '- 병합 · 건너뜀(코드 변경 없음)'],
  );
});

test('포기 — 마무리 기록 없이 닫으면 상태 칸이 닫힘(포기)', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = open(sb);
  sb.ok(['close-task', '1']);
  assert.match(sb.read(st.doc), /\| feature\/claude_TASK-001_doc \| 닫힘\(포기\) \|/);
});

test('분기 생략 — 브랜치 칸 분기 없음, 결과에 병합 건너뜀(브랜치 생략)', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['prepare-task', '바로', '--slug', 'direct', '--type', 'bug', '--size', 'small', '--no-branch']);
  const st = sb.state(1);
  assert.match(sb.read(st.doc), /\| dev \| 분기 없음 \| 열림 \|/);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  sb.write('src/app.txt', 'direct\n');
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  sb.ok(['merge-task', '1']);
  const lines = resultLines(sb.read(st.doc));
  assert.strictEqual(lines[2], '- 커밋 · fix: [TASK-001] 바로');
  assert.match(lines[3], /^- 병합 · 건너뜀\(브랜치 생략\) · /);
});

test('목표 줄 검사 — 요구사항 첫 줄이 목록이면 approve-plan 거부', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  open(sb);
  fillDoc(sb, 1, { goal: '- 사용자 요구: 인사말' });
  const r = sb.tk(['approve-plan', '1']);
  assert.notStrictEqual(r.code, 0);
  assert.match(r.all, /`## 요구사항` 첫 줄은 목록 기호 없는 목표 한 문장/);
});

test('코드 테스트 없음 리포 · TASK 없는 test-code · 문서 없음', (t) => {
  const sb = installedRepo({ codeTest: ['none'] });
  t.after(() => sb.cleanup());
  const st = open(sb);
  fillDoc(sb, 1);
  sb.ok(['approve-plan', '1']);
  const before = sb.read(st.doc);
  sb.ok(['test-code'], { cwd: st.worktree });
  assert.strictEqual(sb.read(st.doc), before, 'TASK 없이 부르면 문서를 건드리지 않는다');
  sb.ok(['test-code', '1']);
  assert.match(resultLines(sb.read(st.doc))[0], /^- 코드 테스트 · 등록된 명령 없음 · \d{4}-/);
  fs.rmSync(path.join(sb.repo, st.doc));
  sb.ok(['test-code', '1']);
  assert.ok(!fs.existsSync(path.join(sb.repo, st.doc)), '문서가 없어도 죽지 않고 새로 만들지 않는다');
});

test('small에 Phase를 써도 커밋 1개, 계획 파일은 Phase의 파일', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = open(sb);
  fillDoc(sb, 1, { phases: [{ name: '하나', files: ['src/app.txt'], reason: '사유 문장' }] });
  sb.ok(['approve-plan', '1']);
  assert.deepStrictEqual(sb.state(1).approve.files, ['src/app.txt']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'x\n');
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  assert.match(sb.ok(['commit-task', '1']), /커밋 1개/);
});

test('코드 블록 — 본문에 인용한 메타 줄·## 목표·## 결과는 절로 보지 않는다', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = open(sb);
  fillDoc(sb, 1, { goal: '문서 틀을 설명한다.' });
  const quoted = ['```markdown', '# TASK-009 예시', '<!-- taskery: plan=x type=feature size=small switch=plan range=끝까지 parent=dev by=taskery -->', '## 목표', '예시 목표', '## 결과', '```', ''].join('\n');
  sb.write(st.doc, sb.read(st.doc).replace('## 결정\n', `## 결정\n${quoted}`));
  sb.ok(['approve-plan', '1']);
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'x\n');
  sb.ok(['test-code', '1']);
  const doc = sb.read(st.doc);
  assert.ok(doc.includes(quoted), '인용은 그대로');
  assert.strictEqual((doc.match(/\| 생성일 \|/g) || []).length, 1, '헤더 표는 하나');
  assert.match(doc.slice(doc.lastIndexOf('## 결과')), /^## 결과\n\n- 코드 테스트 · 통과 · /);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  assert.match(sb.git(['log', '-1', '--format=%B', st.branch]), /- 사유: 문서 틀을 설명한다\./);
});

test('PLAN.md — 태스크 목록 앞 코드 블록 안의 ## 줄이 있어도 항목을 읽는다', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.write('.taskery/plans/001_mvp/PLAN.md', '# MVP\n\n## 목표\n시험\n\n```markdown\n## 태스크 목록\n9. 가짜 — 선행: 없음\n```\n\n## 태스크 목록\n1. 첫 기능 — 선행: 없음\n');
  const out = sb.ok(['status']);
  assert.match(out, /첫 기능/);
  assert.doesNotMatch(out, /가짜/);
});

test('1.0.0 small 문서 — 그대로 한 바퀴, 메타 줄은 헤더 표로(두 번 갱신해도 같음)', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  const st = open(sb, ['--range', '끝까지']);
  writeDocV100(sb, 1, { goal: '옛 목표 줄' });
  sb.ok(['approve-plan', '1']);
  let doc = sb.read(st.doc);
  assert.doesNotMatch(doc, /<!-- taskery:/);
  assert.match(doc, /^# TASK-001 문서 시험\n\n\| 생성일 \|[^\n]+\n\|---[^\n]+\n\| [^\n]+ \| 열림 \|\n\n\| 시작·기획 \| 개발 \| 테스트 \| 닫기 \|\n\|---\|---\|---\|---\|\n\| ✅ /);
  assert.match(doc, /## 목표\n옛 목표 줄/, '옛 절은 그대로');
  fs.writeFileSync(path.join(st.worktree, 'src/app.txt'), 'old\n');
  sb.ok(['test-code', '1']);
  const once = sb.read(st.doc);
  sb.ok(['test-code', '1']);
  assert.strictEqual(sb.read(st.doc).split('| 생성일 |').length, 2, '두 번 갱신해도 헤더 표 하나');
  assert.strictEqual(once.split('\n').length + 1, sb.read(st.doc).split('\n').length, '결과 줄만 하나 늘었다');
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  sb.ok(['commit-task', '1']);
  assert.match(sb.git(['log', '-1', '--format=%B', st.branch]), /- 사유: 옛 목표 줄/);
  sb.ok(['merge-task', '1']);
  sb.ok(['close-task', '1']);
  const cl = fs.readdirSync(path.join(sb.repo, '.taskery', 'changelog'))[0];
  assert.match(sb.read(`.taskery/changelog/${cl}`), /- 요약: 옛 목표 줄/);
  assert.match(sb.read(st.doc), /\| 닫힘\(완료\) \|/);
});

test('1.0.0 medium 문서 — 목표는 목표 절에서, Phase는 Phase 절에서', (t) => {
  const sb = installedRepo();
  t.after(() => sb.cleanup());
  sb.ok(['prepare-task', '옛 중간', '--slug', 'oldmid', '--type', 'improve', '--size', 'medium', '--dev', 'claude']);
  const st = sb.state(1);
  writeDocV100(sb, 1, {
    goal: '옛 목표',
    requirements: '- 요구 하나',
    files: ['src/a.txt'],
    phases: [
      { name: '하나', files: ['src/a.txt'], reason: '첫 사유' },
      { name: '둘', files: ['src/b.txt'], reason: '둘째 사유' },
    ],
  });
  sb.ok(['approve-plan', '1']);
  assert.deepStrictEqual(sb.state(1).approve.files, ['src/a.txt', 'src/b.txt']);
  for (const f of ['a', 'b']) fs.writeFileSync(path.join(st.worktree, `src/${f}.txt`), f);
  sb.ok(['test-code', '1']);
  sb.ok(['test-scenario', '1', '1', 'pass', '확인']);
  sb.ok(['verify-close', '1']);
  assert.match(sb.ok(['commit-task', '1']), /커밋 2개/);
  sb.ok(['merge-task', '1']);
  sb.ok(['close-task', '1']);
  const cl = fs.readdirSync(path.join(sb.repo, '.taskery', 'changelog'))[0];
  assert.match(sb.read(`.taskery/changelog/${cl}`), /- 요약: 옛 목표\n/);
});
