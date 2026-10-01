// verify-close · commit-task · merge-task · close-task — 마무리 4명령(검사·커밋·병합·정리, §5-3)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib');
const { checkMain, installPackages } = require('./prepare');
const B = require('./backlog');
const { runCodeTests, lastEntry } = require('./check');

function openState(main, task) {
  const num = L.parseTaskNum(task);
  const st = L.readState(main, num);
  if (st.closed) L.fail(`${L.taskLabel(num)}은 이미 닫혔다.`);
  return st;
}

// 시작 커밋 이후 이 태스크의 코드 변경이 있나 — --no-branch는 작업 트리만 본다
function hasCodeChange(main, st) {
  const dir = L.workDir(main, st);
  if (L.changedFiles(dir).length) return true;
  if (st.noBranch) return false;
  return parseInt(L.git(dir, ['rev-list', '--count', `${st.startCommit}..HEAD`]), 10) > 0;
}

async function verifyClose(ctx, a) {
  const main = ctx.main;
  const st = openState(main, a.task);
  const dir = L.workDir(main, st);
  const problems = [];
  if (!st.approve) problems.push('계획 끝 표시가 없다 — 태스크 문서를 채우고 approve-plan을 부른다');
  if (L.sw(st, 'dev')) {
    if (!st.testCode) problems.push('test-code 통과 기록이 없다 — test-code를 부른다');
    else if (L.fingerprint(dir) !== st.testCode.fingerprint) problems.push('test-code 통과 뒤 코드가 바뀌었다 — test-code를 다시 부른다');
  } else if (hasCodeChange(main, st)) {
    problems.push(
      st.noBranch
        ? '개발 꺼짐 태스크인데 작업 트리에 커밋 안 된 코드 변경이 있다 — 되돌리거나 스위치를 다시 정한다'
        : '개발 꺼짐 태스크인데 시작 이후 코드 변경(커밋 또는 작업 트리)이 있다 — 되돌리거나 스위치를 다시 정한다',
    );
  }
  if (L.sw(st, 'test')) {
    const criteria = L.parseCriteria(L.readDoc(main, st));
    if (!criteria.length) problems.push('`## 완료 기준`에 시나리오가 없다');
    for (let i = 1; i <= criteria.length; i++) {
      const last = lastEntry(st, i);
      if (!last) problems.push(`시나리오 ${i}의 결과·증거가 없다 — test-scenario로 기록한다`);
      else if (last.result === 'fail') problems.push(`시나리오 ${i}가 FAIL이다 — 고쳐서 다시 확인하거나, 사용자가 알고 넘어가기로 했으면 test-scenario … accept로 그 말을 기록한다`);
    }
  }
  if (problems.length) L.fail(`verify-close: ${L.taskLabel(st.num)} 마무리 검사에 걸렸다.\n${problems.map((p) => `- ${p}`).join('\n')}`);
  st.verify = { at: L.nowIso() };
  L.writeState(main, st);
  return `${L.taskLabel(st.num)} 마무리 검사 통과. 다음: commit-task.`;
}

// 바뀐 파일을 Phase별로 나눈다 — 여러 Phase면 앞 Phase, 목록에 없으면 마지막 Phase(§4-5)
function groupByPhase(files, phases) {
  const groups = phases.map(() => []);
  const notes = {};
  for (const f of files) {
    const hits = phases.map((p, i) => (p.files.some((pf) => L.fileMatches(f, pf)) ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 0) groups[phases.length - 1].push(f);
    else {
      groups[hits[0]].push(f);
      if (hits.length > 1) notes[f] = ` (Phase ${hits.map((i) => phases[i].num).join('·')} 변경 포함)`;
    }
  }
  return { groups, notes };
}

function commitFiles(dir, files, message) {
  L.git(dir, ['add', '-A', '--', ...files]);
  L.git(dir, ['commit', '-q', '-m', message]);
  return L.git(dir, ['rev-parse', 'HEAD']);
}

function commitBody(files, notes, reason) {
  return `\n\n${files.map((f) => `- ${f}${notes[f] || ''}`).join('\n')}\n- 사유: ${reason}`;
}

async function commitTask(ctx, a) {
  const main = ctx.main;
  const st = openState(main, a.task);
  if (!st.verify) L.fail(`commit-task: ${L.taskLabel(st.num)}의 마무리 검사 기록이 없다. verify-close를 먼저 부른다.`);
  const dir = L.workDir(main, st);
  const text = L.readDoc(main, st);
  const rule = L.readGitRule(main);
  const made = [];
  if (L.sw(st, 'dev')) {
    const files = L.changedFiles(dir);
    if (files.length) {
      const tag = L.TAG_OF[st.type] || 'docs';
      const num = L.pad(st.num);
      const phases = st.size === 'small' ? [] : L.parsePhases(text);
      if (phases.length) {
        const { groups, notes } = groupByPhase(files, phases);
        phases.forEach((p, i) => {
          if (!groups[i].length) return;
          const summary = `Phase ${p.num} - ${p.name}`;
          const msg = L.fillTemplate(rule.commit, { tag, num, summary }) + commitBody(groups[i], notes, p.reason || p.name);
          made.push({ sha: commitFiles(dir, groups[i], msg), subject: msg.split('\n')[0], files: groups[i] });
        });
      } else {
        const msg = L.fillTemplate(rule.commit, { tag, num, summary: st.title }) + commitBody(files, {}, L.goalLine(text) || st.title);
        made.push({ sha: commitFiles(dir, files, msg), subject: msg.split('\n')[0], files });
      }
    }
  }
  const prev = (st.commit && st.commit.commits) || [];
  const commits = [...prev, ...made];
  const noCodeChange = !L.sw(st, 'dev') || (st.noBranch ? commits.length === 0 : !hasCodeChange(main, st));
  st.commit = { at: L.nowIso(), noCodeChange, commits };
  L.writeState(main, st);

  // 병합 확인 화면 — 커밋 목록·바뀐 파일·단계별 시간·계획 확인 뒤 추가된 파일
  let changed;
  let list;
  if (st.noBranch) {
    list = commits.map((c) => `${c.sha.slice(0, 7)} ${c.subject}`);
    changed = [...new Set(commits.flatMap((c) => c.files))];
  } else {
    const log = L.git(dir, ['log', '--format=%h %s', `${st.startCommit}..HEAD`]);
    list = log ? log.split('\n') : [];
    const diff = L.git(dir, ['diff', '--name-only', st.startCommit, 'HEAD']);
    changed = diff ? diff.split('\n') : [];
  }
  const planned = (st.approve && st.approve.files) || [];
  const added = changed.filter((f) => !planned.some((p) => L.fileMatches(f, p)));
  const d = L.stageDurations(st);
  const out = [`${L.taskLabel(st.num)} 「${st.title}」 커밋 요약`];
  if (noCodeChange) out.push('- 코드 변경 없음 — 커밋하지 않았다. merge-task는 병합을 건너뛴다.');
  else {
    out.push(`- 커밋 ${list.length}개:`);
    for (const l of list) out.push(`  - ${l}`);
    out.push(`- 바뀐 파일 ${changed.length}개: ${changed.join(', ')}`);
  }
  out.push(
    `- 단계별 시간: 시작·기획 ${L.minutes(d.plan) || '–'} · 개발 ${L.sw(st, 'dev') ? L.minutes(d.dev) || '–' : '꺼짐'} · 테스트 ${L.sw(st, 'test') ? L.minutes(d.test) || '–' : '꺼짐'}`,
  );
  out.push(`- 계획 확인 뒤 추가된 파일: ${added.length ? added.join(', ') : '없음'}`);
  out.push('다음: merge-task (진행 범위가 "끝까지"가 아니면 사용자 확인을 받은 뒤).');
  return out.join('\n');
}

function gitPath(dir, name) {
  return L.git(dir, ['rev-parse', '--path-format=absolute', '--git-path', name]);
}

function rebaseInProgress(dir) {
  return fs.existsSync(gitPath(dir, 'rebase-merge')) || fs.existsSync(gitPath(dir, 'rebase-apply'));
}

function unmergedFiles(dir) {
  const out = L.git(dir, ['diff', '--name-only', '--diff-filter=U']);
  return out ? out.split('\n') : [];
}

const MARKER_RE = /^(<{7}|>{7})( |$)/m;

function conflictStop(st, files) {
  return L.fail(
    `merge-task: ${L.taskLabel(st.num)} rebase 중 충돌이 났다. 잠금은 풀었고 rebase 진행 상태는 그대로 두었다.\n` +
      `충돌 파일:\n${files.map((f) => `- ${f}`).join('\n')}\n` +
      '충돌 파일을 직접 읽고 고친 뒤 merge-task를 다시 부른다(스테이징·이어 가기는 명령이 한다). 풀지 못하면 멈추고 보고한다.',
  );
}

// 부모 최신 위로 rebase — 진행 중인 rebase가 있으면 이어 가고, 부모가 움직였으면 다시 한다
function rebaseOntoParent(dir, st) {
  const env = { GIT_EDITOR: 'true' };
  for (let guard = 0; guard < 100; guard++) {
    if (rebaseInProgress(dir)) {
      const unmerged = unmergedFiles(dir);
      const marked = unmerged.filter((f) => {
        const p = path.join(dir, f);
        return fs.existsSync(p) && MARKER_RE.test(fs.readFileSync(p, 'utf8'));
      });
      if (marked.length) conflictStop(st, marked);
      L.git(dir, ['add', '-A']);
      if (L.git(dir, ['-c', 'core.editor=true', 'rebase', '--continue'], { env, allowFail: true }) === null) {
        if (rebaseInProgress(dir) && unmergedFiles(dir).length) conflictStop(st, unmergedFiles(dir));
        if (rebaseInProgress(dir)) L.fail('merge-task: rebase를 이어 가지 못했다. `git status`로 상태를 확인한다.');
      }
      continue;
    }
    if (L.isAncestor(dir, st.parent, 'HEAD')) return;
    if (L.git(dir, ['rebase', st.parent], { env, allowFail: true }) === null) {
      if (rebaseInProgress(dir)) conflictStop(st, unmergedFiles(dir));
      L.fail('merge-task: rebase에 실패했다. `git status`로 상태를 확인한다.');
    }
  }
  return L.fail('merge-task: rebase가 끝나지 않는다. `git status`로 상태를 확인한다.');
}

async function mergeTask(ctx, a) {
  const main = ctx.main;
  const st = openState(main, a.task);
  if (!st.commit) L.fail(`merge-task: ${L.taskLabel(st.num)}의 커밋 기록이 없다. commit-task를 먼저 부른다.`);
  if (st.merge && st.merge.commit) return `${L.taskLabel(st.num)}은 이미 병합했다 (${st.merge.commit.slice(0, 7)}).`;

  if (L.needsNoMerge(st)) {
    let note = '';
    if (st.noWorktree && L.currentBranch(main) !== st.parent) {
      L.git(main, ['checkout', st.parent]);
      note = ` 본진을 부모 브랜치 ${st.parent}로 되돌렸다.`;
    }
    const why = !L.sw(st, 'dev') ? '개발 꺼짐' : st.noBranch ? '브랜치 생략' : '코드 변경 없음';
    st.merge = { at: L.nowIso(), skipped: why };
    L.writeState(main, st);
    return `${L.taskLabel(st.num)} 병합을 건너뛴다(${why}).${note}\n다음: 태스크를 연 주인이 본진에서 close-task를 부른다.`;
  }

  if (!st.mergeStart) {
    st.mergeStart = L.nowIso();
    // rebase 전 브랜치 끝 — 부모에서 받아 온 변경에 의존성 파일이 있는지 볼 때 쓴다(충돌 뒤 다시 불러도 같은 값)
    st.mergeFrom = L.git(st.noWorktree ? main : st.worktree, ['rev-parse', 'HEAD']);
    L.writeState(main, st);
  }
  const rule = L.readGitRule(main);
  return L.withLock(main, 'merge', async () => {
    checkMain(main, { self: st, parent: st.parent });
    const dir = st.noWorktree ? main : st.worktree;
    rebaseOntoParent(dir, st);
    const notes = [];
    // 새 커밋이 들어와 코드가 test-code 때와 달라졌을 때만 코드 테스트를 다시 돌린다
    const fp = L.fingerprint(dir);
    if (st.testCode && fp !== st.testCode.fingerprint) {
      // 의존성 파일(package-lock.json)이 바뀌었으면 다시 설치한 뒤 테스트한다
      if (st.mergeFrom && L.git(dir, ['diff', '--name-only', st.mergeFrom, 'HEAD', '--', 'package-lock.json'])) {
        for (const n of await installPackages(dir)) notes.push(`의존성 파일이 바뀌어 다시 설치했다: ${n}`);
      }
      const r = await runCodeTests(main, dir);
      st.testCode.fingerprint = fp;
      L.writeState(main, st);
      notes.push(r.none ? '부모의 새 커밋을 받았다 — 코드 테스트 없음으로 등록된 리포.' : `부모의 새 커밋을 받아 코드 테스트를 다시 돌렸다 — 통과(${L.minutes(r.ms)}).`);
    }
    if (st.noWorktree) L.git(main, ['checkout', st.parent]);
    const args = rule.merge === 'ff-only' ? ['merge', '--ff-only', st.branch] : ['merge', '--no-ff', '--no-edit', st.branch];
    L.git(main, args);
    const head = L.git(main, ['rev-parse', 'HEAD']);
    st.merge = { at: L.nowIso(), commit: head };
    L.writeState(main, st);
    return [
      `${L.taskLabel(st.num)}을 ${st.parent}에 병합했다(${rule.merge}, ${head.slice(0, 7)}).`,
      ...notes,
      '다음: 태스크를 연 주인이 본진에서 close-task를 부른다(직접 수행이면 워크트리에서 나와서).',
    ].join('\n');
  });
}

// CHANGELOG_RULE.md의 "항목 틀" 코드 블록을 읽어 변경 기록 한 항목을 쓴다
function changelogTemplate(main) {
  const file = path.join(main, '.project', 'rules', 'CHANGELOG_RULE.md');
  const fallback = '## [TASK-{num}] {title}\n\n- 날짜: {date}\n- 유형: {type}\n- 요약: {goal}';
  if (!fs.existsSync(file)) return fallback;
  const m = fs.readFileSync(file, 'utf8').match(/## 항목 틀[\s\S]*?```(?:markdown)?\n([\s\S]*?)```/);
  return m ? m[1].replace(/\s+$/, '') : fallback;
}

function writeChangelog(main, st, goal) {
  const date = L.todayLocal();
  const entry = L.fillTemplate(changelogTemplate(main), { num: L.pad(st.num), title: st.title, date, type: st.type, goal });
  const file = path.join(main, '.project', 'changelog', `${date.slice(0, 7)}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# 변경 기록 ${date.slice(0, 7)}\n\n${entry}\n`);
  } else {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const first = lines.findIndex((l) => /^## /.test(l));
    if (first === -1) lines.push('', entry, '');
    else lines.splice(first, 0, entry, '');
    fs.writeFileSync(file, lines.join('\n'));
  }
  return file;
}

// 워크트리·브랜치 정리 — 커밋 안 된 변경이 있으면 남기고, 브랜치는 병합된 것만 지운다.
// force는 prune에서 사용자가 확인했을 때만 — 병합 안 된 브랜치도 지운다(복구 명령 출력)
function cleanup(main, st, { force = false } = {}) {
  const notes = [];
  if (st.noBranch) return notes;
  const exists = L.branchExists(main, st.branch);
  const tip = exists ? L.git(main, ['rev-parse', st.branch]) : null;
  const merged = exists && L.isAncestor(main, st.branch, st.parent);
  let branchFree = true;

  if (st.worktree && fs.existsSync(st.worktree)) {
    const dirty = L.changedFiles(st.worktree);
    if (dirty.length) {
      notes.push(`워크트리에 커밋 안 된 변경·추적 안 되는 파일이 있어 워크트리와 브랜치를 남겼다: ${st.worktree} (${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? ' …' : ''})`);
      return notes;
    }
    if (st.by === 'orca') {
      // Orca는 병합을 증명할 수 없는 브랜치를 남긴다(`orca worktree rm --help`) — 병합 여부와 무관하게 부른다
      try {
        execFileSync('orca', ['worktree', 'rm', '--worktree', `path:${st.worktree}`, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
        notes.push(`Orca 워크트리를 지웠다: ${st.worktree}`);
      } catch (e) {
        notes.push(`Orca 워크트리를 지우지 못해 남겼다: ${((e.stderr || '') + '').trim() || e.message}`);
        branchFree = false;
      }
    } else if (L.git(main, ['worktree', 'remove', st.worktree], { allowFail: true }) === null) {
      notes.push(`워크트리를 지우지 못해 남겼다: ${st.worktree}`);
      branchFree = false;
    } else {
      notes.push(`워크트리를 지웠다: ${st.worktree}`);
    }
  }

  if (!L.branchExists(main, st.branch)) {
    if (exists) notes.push(`브랜치 ${st.branch}가 지워졌다. 복구: git branch ${st.branch} ${tip}`);
    return notes;
  }
  if (!merged && !force) notes.push(`브랜치 ${st.branch}는 부모에 병합되지 않아 남겼다.`);
  else if (!branchFree || L.currentBranch(main) === st.branch) notes.push(`브랜치 ${st.branch}를 지우지 못해 남겼다(사용 중).`);
  else if (L.git(main, ['branch', merged ? '-d' : '-D', st.branch], { allowFail: true }) === null) notes.push(`브랜치 ${st.branch}를 지우지 못해 남겼다.`);
  else notes.push(`브랜치 ${st.branch}를 지웠다. 복구: git branch ${st.branch} ${tip}`);
  return notes;
}

async function closeTask(ctx, a) {
  const main = ctx.main;
  const st = openState(main, a.task);
  const finished = L.hasFinishRecord(st);
  const notes = cleanup(main, st);
  const goal = L.goalLine(fs.existsSync(L.docAbs(main, st)) ? L.readDoc(main, st) : '') || st.title;
  st.closed = { at: L.nowIso(), finished };
  L.writeState(main, st);
  L.syncDoc(main, st);
  // 백로그 연결 표시 — (완료)·(포기), 연결 태스크가 모두 닫히면 항목 이동(§5-3)
  const blNotes = await L.withLock(main, 'number', async () => B.markClosed(main, L.taskLabel(st.num), finished));
  for (const n of blNotes) notes.push(`백로그: ${n}`);
  if (finished) notes.push(`변경 기록: ${writeChangelog(main, st, goal)}`);
  const d = L.stageDurations(st);
  const row = (label, on, v) => `  - ${label}: ${on ? L.minutes(v) || '–' : '꺼짐'}`;
  return [
    `${L.taskLabel(st.num)} 「${st.title}」을 닫았다 — ${finished ? '끝난 태스크' : '포기(마무리 기록 없이 닫음)'}.`,
    ...notes.map((n) => `- ${n}`),
    '- 단계별 시간:',
    row('시작·기획', true, d.plan),
    row('개발', L.sw(st, 'dev'), d.dev),
    row('테스트', L.sw(st, 'test'), d.test),
    row('닫기', true, d.close),
    `  - 합계: ${L.minutes(d.total)} (계획 확인·눈 확인·질문 답을 기다린 시간 포함, 병합 확인 대기는 뺌)`,
  ].join('\n');
}

module.exports = { verifyClose, commitTask, mergeTask, closeTask, cleanup };
