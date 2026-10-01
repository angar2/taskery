// prepare-task — 번호 발급·플랜 결정·브랜치/워크트리 분기·taskery 파일 심기·태스크 문서·.state 기록(§5-3)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const L = require('./lib');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validate(a, rule) {
  const missing = [];
  if (!a.name || !String(a.name).trim()) missing.push('<이름> — 태스크 제목 한 줄 (첫 번째 인자)');
  if (!a.slug) missing.push('--slug — 영문 kebab-case (예: settings-save-color)');
  if (!a.type) missing.push(`--type — ${L.TYPES.join(' · ')}`);
  if (!a.size) missing.push(`--size — ${L.SIZES.join(' · ')}`);
  const needDev = !a['no-branch'] && rule.branch.includes('{dev}');
  if (needDev && !a.dev) missing.push('--dev — 작업자 식별자 (GIT_RULE.md 브랜치 이름에 작업자 칸이 있다. 예: claude)');
  if (missing.length) L.fail(`prepare-task: 빠진 입력이 있다.\n${missing.map((m) => `- ${m}`).join('\n')}`);
  if (!SLUG_RE.test(a.slug)) L.fail(`prepare-task: --slug '${a.slug}'는 영문 kebab-case가 아니다 (소문자·숫자·하이픈).`);
  if (!L.TYPES.includes(a.type)) L.fail(`prepare-task: --type '${a.type}'을 모른다. ${L.TYPES.join(' · ')} 중 하나를 넣는다.`);
  if (!L.SIZES.includes(a.size)) L.fail(`prepare-task: --size '${a.size}'를 모른다. ${L.SIZES.join(' · ')} 중 하나를 넣는다.`);
  const switches = a.switch
    ? String(a.switch)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [...L.SWITCHES];
  const bad = switches.filter((s) => !L.SWITCHES.includes(s));
  if (bad.length) L.fail(`prepare-task: --switch에 모르는 값 ${bad.join(', ')}. ${L.SWITCHES.join(',')} 중에서 켜진 것만 쉼표로 넣는다.`);
  if (!switches.includes('dev') && !switches.includes('test')) {
    L.fail('prepare-task: 개발과 테스트가 둘 다 꺼진 태스크는 할 일이 없다. --switch에 dev나 test 중 하나는 넣는다.');
  }
  if (a.item != null && !/^\d+$/.test(String(a.item))) L.fail(`prepare-task: --item '${a.item}'은 PLAN.md 목록의 항목 번호(숫자)여야 한다.`);
  return L.SWITCHES.filter((s) => switches.includes(s));
}

function resolvePlan(main, plan) {
  const dir = path.join(main, '.project', 'plans');
  const plans = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'PLAN.md')))
    : [];
  if (plan) {
    if (!plans.includes(plan)) {
      L.fail(`prepare-task: 플랜 '${plan}'이 없다. 있는 플랜: ${plans.join(', ') || '없음'}.`);
    }
    return plan;
  }
  if (plans.length === 1) return plans[0];
  if (plans.length === 0) L.fail("prepare-task: 플랜이 없다. 'plan-init <slug>'로 플랜을 먼저 만든다.");
  return L.fail(`prepare-task: 플랜이 여럿이라 정할 수 없다. --plan으로 하나를 넣는다: ${plans.join(', ')}.`);
}

// 본진 검사(§3-4) — 본진이 부모 브랜치에 서 있고 커밋 안 된 코드 변경이 없어야 한다
function checkMain(main, { self = null, parent = null } = {}) {
  const others = L.listStates(main).filter((s) => !s.closed && (!self || s.num !== self.num) && (s.noWorktree || s.noBranch));
  const cur = L.currentBranch(main);
  const problems = [];
  if (!cur) problems.push('본진이 브랜치가 아닌 커밋(detached HEAD)에 서 있다');
  else if (parent && cur !== parent && !(self && self.noWorktree && cur === self.branch)) {
    problems.push(`본진이 부모 브랜치 ${parent}가 아니라 ${cur}에 서 있다`);
  } else if (!parent) {
    const owner = others.find((s) => s.noWorktree && s.branch === cur);
    if (owner) problems.push(`본진이 ${L.taskLabel(owner.num)}의 브랜치 ${cur}에 서 있다`);
  }
  const selfSkips = self && (self.noBranch || self.noWorktree);
  const dirty = L.changedFiles(main);
  if (dirty.length && !selfSkips) problems.push(`본진에 커밋 안 된 코드 변경이 있다 (${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? ' …' : ''})`);
  if (!problems.length) return cur;
  const cause = others.length
    ? `원인 태스크: ${others.map((s) => `${L.taskLabel(s.num)}(${s.noBranch ? '브랜치 생략' : '워크트리 생략'})`).join(', ')} — 그 태스크를 마무리한 뒤 다시 부른다.`
    : '열린 분기 생략 태스크는 없다 — 본진을 부모 브랜치로 되돌리고 변경을 정리한 뒤 다시 부른다.';
  return L.fail(`본진(${main}) 검사에 걸렸다.\n${problems.map((p) => `- ${p}`).join('\n')}\n${cause}`);
}

// 다음 태스크 번호 — .state 기록과 git 이력의 TASK-NNN 중 가장 큰 값 + 1
function nextNumber(main) {
  let max = 0;
  for (const s of L.listStates(main)) max = Math.max(max, s.num);
  const log = L.git(main, ['log', '--all', '--format=%s', '-E', '--grep', 'TASK-[0-9]+'], { allowFail: true }) || '';
  for (const m of log.matchAll(/TASK-(\d+)/g)) max = Math.max(max, parseInt(m[1], 10));
  return max + 1;
}

function inOrca() {
  return !!process.env.ORCA_TERMINAL_HANDLE;
}

function worktreePaths(main) {
  const out = L.git(main, ['worktree', 'list', '--porcelain']);
  return out
    .split('\n')
    .filter((l) => l.startsWith('worktree '))
    .map((l) => l.slice('worktree '.length));
}

// Orca 워크트리 — 만든 뒤 브랜치 이름을 리포 규칙대로 바꾼다(§3-4)
function createOrcaWorktree(main, { name, parent, branch }) {
  const before = new Set(worktreePaths(main));
  try {
    execFileSync('orca', ['worktree', 'create', '--repo', `path:${main}`, '--name', name, '--base-branch', parent, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    L.fail(`Orca 워크트리를 만들지 못했다: ${((e.stderr || '') + (e.stdout || '')).toString().trim() || e.message}`);
  }
  const created = worktreePaths(main).filter((p) => !before.has(p));
  if (created.length !== 1) L.fail(`Orca가 만든 워크트리를 찾지 못했다(새 워크트리 ${created.length}개). 'git worktree list'로 확인한다.`);
  const wt = created[0];
  L.git(wt, ['branch', '-m', branch]);
  return wt;
}

function createTaskeryWorktree(main, { projectId, nnn, slug, parent, branch }) {
  const root = path.join(os.homedir(), '.taskery', 'worktrees', projectId);
  fs.mkdirSync(root, { recursive: true });
  const wt = path.join(root, `TASK-${nnn}_${slug}`);
  L.git(main, ['worktree', 'add', wt, '-b', branch, parent]);
  return wt;
}

// 워크트리에 taskery 파일 심기 — 지침 파일은 복사, 나머지는 본진을 가리키는 링크(§3-4)
function plant(main, wt) {
  for (const name of L.PLANT_COPY) {
    const src = path.join(main, name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(wt, name), fs.constants.COPYFILE_FICLONE);
  }
  for (const name of L.PLANT_LINK) {
    const src = path.join(main, name);
    const dst = path.join(wt, name);
    if (fs.existsSync(src) && !fs.existsSync(dst)) fs.symlinkSync(src, dst);
  }
}

// PLAN.md 목록 항목 줄 끝에 태스크 번호를 붙인다(`--item`)
function linkItem(main, plan, item, label) {
  const file = path.join(main, '.project', 'plans', plan, 'PLAN.md');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const idx = lines.findIndex((l) => new RegExp(`^\\s*${item}\\.\\s`).test(l));
  if (idx === -1) L.fail(`prepare-task: ${plan}/PLAN.md에 항목 ${item}이 없다. 목록 형식은 '${item}. <한 줄 설명> — 선행: <항목 번호들 또는 없음>'이다.`);
  const linked = lines[idx].match(/TASK-\d+/g) || [];
  lines[idx] = `${lines[idx].replace(/\s+$/, '')} (${label})`;
  fs.writeFileSync(file, lines.join('\n'));
  return linked.length ? `항목 ${item}에는 이미 ${linked.join(', ')}가 연결돼 있다 — 그대로 ${label}을 더했다.` : null;
}

async function prepareTask(ctx, a) {
  const main = ctx.main;
  const manifest = L.requireInstalled(main);
  const rule = L.readGitRule(main);
  const switches = validate(a, rule);
  const plan = resolvePlan(main, a.plan);
  const noBranch = !!a['no-branch'];
  const noWorktree = noBranch || !!a['no-worktree'];
  const parent = checkMain(main);

  return L.withLock(main, 'number', async () => {
    const num = nextNumber(main);
    const nnn = L.pad(num);
    const branch = noBranch
      ? null
      : L.fillTemplate(rule.branch, { type: a.type, dev: a.dev || '', num: nnn, slug: a.slug });
    if (branch && L.branchExists(main, branch)) L.fail(`prepare-task: 브랜치 ${branch}가 이미 있다. --slug를 바꿔 다시 부른다.`);
    const startCommit = L.git(main, ['rev-parse', 'HEAD']);

    let worktree = null;
    let by = '생략';
    if (noBranch) {
      // 본진의 현재 브랜치(부모)에서 그대로 일한다
    } else if (noWorktree) {
      L.git(main, ['checkout', '-b', branch]);
    } else if (inOrca()) {
      worktree = createOrcaWorktree(main, { name: `TASK-${nnn}-${a.slug}`, parent, branch });
      by = 'orca';
    } else {
      worktree = createTaskeryWorktree(main, { projectId: manifest.projectId, nnn, slug: a.slug, parent, branch });
      by = 'taskery';
    }
    L.ensureExclude(main);
    if (worktree) plant(main, worktree);

    const doc = path.join('.project', 'plans', plan, 'tasks', `${nnn}_${a.slug}.md`);
    const st = {
      num,
      title: String(a.name).trim(),
      slug: a.slug,
      type: a.type,
      size: a.size,
      switch: switches,
      range: a.range || L.DEFAULT_RANGE,
      plan,
      doc,
      branch,
      parent,
      by,
      worktree,
      noWorktree,
      noBranch,
      startCommit,
      times: { prepare: L.nowIso() },
    };
    fs.mkdirSync(path.dirname(path.join(main, doc)), { recursive: true });
    fs.writeFileSync(path.join(main, doc), L.renderDoc(st));
    L.writeState(main, st);
    const itemNote = a.item != null ? linkItem(main, plan, a.item, L.taskLabel(num)) : null;
    if (a.item != null) {
      st.item = parseInt(a.item, 10);
      L.writeState(main, st);
    }

    const out = [
      `${L.taskLabel(num)} 「${st.title}」을 열었다.`,
      `- 태스크 문서: ${path.join(main, doc)}`,
      `- 플랜: ${plan}${st.item ? ` (항목 ${st.item})` : ''} · 크기: ${st.size} · 스위치: ${switches.join(',')} · 범위: ${st.range}`,
      `- 부모 브랜치: ${parent}`,
    ];
    if (noBranch) out.push('- 분기 생략: 본진의 현재 브랜치에서 일한다(--no-branch).');
    else if (noWorktree) out.push(`- 브랜치: ${branch} — 본진을 이 브랜치로 옮겼다(--no-worktree). 본진에서 일한다.`);
    else {
      out.push(`- 브랜치: ${branch}`);
      out.push(`- 워크트리: ${worktree} (${by === 'orca' ? 'Orca가 만듦' : 'taskery가 만듦'})`);
    }
    if (itemNote) out.push(`- 알림: ${itemNote}`);
    out.push(worktree ? `다음: 워크트리로 들어가(Claude Code는 EnterWorktree) task-plan을 한다.` : '다음: task-plan을 한다.');
    return out.join('\n');
  });
}

module.exports = { prepareTask, checkMain };
