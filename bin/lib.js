// taskery 1.0 명령이 함께 쓰는 도구 — git·경로·매니페스트·.state·잠금·태스크 문서·GIT_RULE 표·코드 지문
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync, spawn } = require('child_process');

const MANIFEST_NAME = '.taskery-manifest.json';
// taskery가 설치하고 쓰는 파일 — 모두 git 밖(.git/info/exclude 이름 규칙, §3-4)
const EXCLUDE_NAMES = ['.project', '.claude', '.codex', '.mcp.json', '.taskery-manifest.json', 'AGENTS.md', 'CLAUDE.md'];
// 워크트리에 심는 방식 — 지침 파일은 복사, 나머지는 본진을 가리키는 링크(§3-4)
const PLANT_COPY = ['AGENTS.md', 'CLAUDE.md'];
const PLANT_LINK = ['.project', '.claude', '.codex', '.mcp.json'];

const TYPES = ['feature', 'bug', 'improve', 'refactor', 'docs', 'chore'];
const SIZES = ['small', 'medium', 'large'];
const SWITCHES = ['plan', 'dev', 'test'];
const DEFAULT_RANGE = '한 단계';
// 브랜치 유형 → 커밋 태그 (GIT_RULE.md "커밋 태그" 표와 같다)
const TAG_OF = { feature: 'feat', bug: 'fix', improve: 'improve', refactor: 'refactor', docs: 'docs', chore: 'docs' };
const CODE_TEST_NOTICE_MS = 3 * 60 * 1000;

// 명령이 멈출 때 쓰는 오류 — 메시지가 곧 "왜 멈췄고 다음에 무엇을 하라"이다
class TaskeryError extends Error {}
function fail(message) {
  throw new TaskeryError(message);
}

// ─── git ─────────────────────────────────────────────

function git(cwd, args, opts = {}) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: opts.env ? { ...process.env, ...opts.env } : process.env,
      maxBuffer: 64 * 1024 * 1024,
    }).replace(/\s+$/, '');
  } catch (e) {
    if (opts.allowFail) return null;
    const msg = ((e.stderr || '') + (e.stdout || '')).toString().trim();
    throw new TaskeryError(`git ${args.join(' ')} 실패: ${msg || e.message}`);
  }
}

function gitOk(cwd, args) {
  return git(cwd, args, { allowFail: true }) !== null;
}

// 본진 = 공통 .git의 부모 폴더. 워크트리 안에서 불러도 본진을 돌려준다
function findMain(cwd = process.cwd()) {
  const common = git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'], { allowFail: true });
  if (!common) fail(`git 리포 안이 아니다 (${cwd}). taskery를 설치한 리포에서 부른다.`);
  return path.dirname(common);
}

function currentBranch(dir) {
  const b = git(dir, ['symbolic-ref', '--short', '-q', 'HEAD'], { allowFail: true });
  return b || null; // detached HEAD면 null
}

// 커밋 안 된 변경(추적 안 되는 파일 포함, exclude된 taskery 파일 제외) 경로 목록
function changedFiles(dir) {
  const out = git(dir, ['status', '--porcelain', '-z', '-uall']);
  if (!out) return [];
  const parts = out.split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i].slice(0, 2);
    files.push(parts[i].slice(3));
    if (code[0] === 'R' || code[0] === 'C') files.push(parts[++i]); // 원래 경로
  }
  return files;
}

// 추적 중인 파일의 커밋 안 된 변경 경로 목록(추적 안 되는 파일 제외)
function trackedChanges(dir) {
  const out = git(dir, ['status', '--porcelain', '-uno']);
  return out ? out.split('\n').map((l) => l.slice(3)) : [];
}

function isAncestor(dir, a, b) {
  return gitOk(dir, ['merge-base', '--is-ancestor', a, b]);
}

function branchExists(dir, branch) {
  return gitOk(dir, ['rev-parse', '--verify', '-q', `refs/heads/${branch}`]);
}

// 코드 지문 = 작업 트리 전체(추적 안 되는 파일 포함, 무시 파일 제외)의 트리 해시. 커밋하지 않는다
function fingerprint(dir) {
  const index = git(dir, ['rev-parse', '--path-format=absolute', '--git-path', 'index']);
  const tmp = path.join(os.tmpdir(), `taskery-index-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
  try {
    if (fs.existsSync(index)) fs.copyFileSync(index, tmp);
    const env = { GIT_INDEX_FILE: tmp };
    git(dir, ['add', '-A'], { env });
    return git(dir, ['write-tree'], { env });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// extra = 매니페스트에 등록된 빌드 결과 폴더 — 코드로 커밋되지 않게 같은 이름 규칙으로 넣는다(§7)
function ensureExclude(main, extra = []) {
  const common = git(main, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  const file = path.join(common, 'info', 'exclude');
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const have = new Set(cur.split('\n').map((l) => l.trim()));
  const names = [...EXCLUDE_NAMES, ...(Array.isArray(extra) ? extra : [])].map((n) => String(n).replace(/^\/+|\/+$/g, ''));
  const missing = [...new Set(names.map((n) => `/${n}`))].filter((r) => !have.has(r));
  if (missing.length === 0) return [];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sep = cur && !cur.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(file, `${sep}# taskery\n${missing.join('\n')}\n`);
  return missing;
}

// ─── 셸 명령 실행 (코드 테스트) ───────────────────────

// 명령 하나를 셸로 실행하고 출력(표준 출력+오류)을 모은다. 비동기라 잠금 갱신이 멈추지 않는다
function runShell(cmd, cwd) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('sh', ['-c', `exec 2>&1\n${cmd}`], { cwd, env: process.env });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
      if (out.length > 4 * 1024 * 1024) out = out.slice(-2 * 1024 * 1024);
    });
    child.on('close', (code) => resolve({ code, out, ms: Date.now() - started }));
    child.on('error', (e) => resolve({ code: 127, out: String(e.message), ms: Date.now() - started }));
  });
}

function tail(text, lines) {
  const arr = text.replace(/\s+$/, '').split('\n');
  return arr.slice(-lines).join('\n');
}

// ─── 매니페스트 · 설치 확인 ───────────────────────────

function readManifest(main) {
  const file = path.join(main, MANIFEST_NAME);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeManifest(main, m) {
  fs.writeFileSync(path.join(main, MANIFEST_NAME), JSON.stringify(m, null, 2) + '\n');
}

function requireInstalled(main) {
  const m = readManifest(main);
  if (!m) fail(`taskery가 설치돼 있지 않다 (${main}). 리포 루트에서 'npx @angar2/taskery init'을 먼저 부른다.`);
  return m;
}

function getPackageVersion() {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')).version;
}

// ─── .state · 잠금 ──────────────────────────────────

function stateDir(main) {
  return path.join(main, '.project', '.state');
}

function pad(num) {
  return String(num).padStart(3, '0');
}

function taskLabel(num) {
  return `TASK-${pad(num)}`;
}

function parseTaskNum(token) {
  const m = String(token || '').match(/^(?:TASK-)?(\d+)$/i);
  if (!m) fail(`태스크 번호를 읽지 못했다: '${token}'. 'TASK-012'나 '12'처럼 넘긴다.`);
  return parseInt(m[1], 10);
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function statePath(main, num) {
  return path.join(stateDir(main), 'tasks', `${pad(num)}.json`);
}

function readState(main, num) {
  const file = statePath(main, num);
  if (!fs.existsSync(file)) fail(`${taskLabel(num)}의 기록이 없다. 'status'로 열린 태스크 번호를 확인한다.`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeState(main, st) {
  writeJsonAtomic(statePath(main, st.num), st);
}

function listStates(main) {
  const dir = path.join(stateDir(main), 'tasks');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .sort((a, b) => a.num - b.num);
}

// 잠금 — .project/.state/<name>.lock. wait=true면 풀릴 때까지 기다린다
async function withLock(main, name, fn) {
  const lockfile = require('proper-lockfile');
  const file = path.join(stateDir(main), `${name}.lock`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, '');
  const release = await lockfile.lock(file, {
    stale: 60000,
    realpath: false,
    retries: { retries: 100000, factor: 1, minTimeout: 300, maxTimeout: 1000 },
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}

// 단계 판정에 쓰는 정의
function sw(st, name) {
  return st.switch.includes(name);
}

// 병합이 필요 없는 태스크 — 개발 꺼짐·브랜치 생략·코드 변경 없음(§5-3)
function needsNoMerge(st) {
  return !sw(st, 'dev') || st.noBranch || !!(st.commit && st.commit.noCodeChange);
}

// 끝난 태스크 = 마무리 기록이 있는 태스크(병합 기록, 병합이 필요 없으면 commit-task 완료 기록, §5-3)
function hasFinishRecord(st) {
  if (st.merge && st.merge.commit) return true;
  return needsNoMerge(st) && !!st.commit;
}

// 태스크 코드가 있는 폴더 — 워크트리, 분기 생략이면 본진
function workDir(main, st) {
  return st.worktree || main;
}

// ─── GIT_RULE.md 맨 위 표 ─────────────────────────────

const GIT_RULE_DEFAULTS = {
  integration: 'dev',
  branch: '{type}/{dev}_TASK-{num}_{slug}',
  commit: '{tag}: [TASK-{num}] {summary}',
  merge: 'no-ff',
};
const GIT_RULE_KEYS = {
  '통합 브랜치': 'integration',
  '브랜치 이름': 'branch',
  '커밋 메시지': 'commit',
  '병합 방식': 'merge',
};

function parseGitRuleTable(text) {
  const rule = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
    if (!m) continue;
    const key = GIT_RULE_KEYS[m[1]];
    if (key && !rule[key]) rule[key] = m[2].replace(/`/g, '').trim();
  }
  return rule;
}

function readGitRule(main) {
  const file = path.join(main, '.project', 'rules', 'GIT_RULE.md');
  const rule = fs.existsSync(file) ? parseGitRuleTable(fs.readFileSync(file, 'utf8')) : {};
  const merged = { ...GIT_RULE_DEFAULTS, ...rule };
  if (!['no-ff', 'ff-only'].includes(merged.merge)) {
    fail(`GIT_RULE.md 표의 병합 방식 '${merged.merge}'을 읽지 못했다. 'no-ff'나 'ff-only'로 적는다.`);
  }
  return merged;
}

function fillTemplate(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (all, k) => (k in vars ? vars[k] : all));
}

// ─── 태스크 문서 ─────────────────────────────────────

function docAbs(main, st) {
  return path.join(main, st.doc);
}

// 사람·AI에게 보여 주는 문서 경로 — 워크트리가 있으면 그 안의 링크 너머 경로(같은 파일).
// 워크트리에 들어간 세션은 본진 경로 편집이 막히기 때문이다. 읽기·쓰기는 docAbs(본진) 그대로
function docShown(main, st) {
  if (st.worktree && fs.existsSync(st.worktree)) return path.join(st.worktree, st.doc);
  return docAbs(main, st);
}

function readDoc(main, st) {
  const file = docAbs(main, st);
  if (!fs.existsSync(file)) fail(`태스크 문서가 없다: ${docShown(main, st)}`);
  return fs.readFileSync(file, 'utf8');
}

// `## 제목` 절 본문(다음 `## `까지)
function section(text, title) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (start === -1) return null;
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

function meaningfulLines(body) {
  return (body || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

// 경로 한 줄 → 경로. 백틱 안을 우선, 없으면 ' — ' 앞, 꼬리 괄호 주석은 뗀다
function cleanPath(raw) {
  let s = raw.trim();
  const tick = s.match(/`([^`]+)`/);
  if (tick) s = tick[1];
  else s = s.split(/\s+—\s+|\s+-\s+/)[0];
  return s.replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim();
}

function parseFileList(body) {
  return meaningfulLines(body)
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => cleanPath(l.replace(/^[-*]\s+/, '')))
    .filter(Boolean);
}

// `## Phase` 절: `### Phase N — 이름` + `- 파일:`(한 줄 쉼표·가운뎃점 구분 또는 들여쓴 목록) + `- 사유:`
function parsePhases(text) {
  const body = section(text, 'Phase');
  if (!body) return [];
  const phases = [];
  let cur = null;
  let fileIndent = null;
  for (const l of body.split('\n')) {
    const ph = l.match(/^###\s+Phase\s+(\d+)\s*(?:[—–-]\s*)?(.*)$/);
    if (ph) {
      cur = { num: parseInt(ph[1], 10), name: ph[2].trim(), files: [], reason: '' };
      phases.push(cur);
      fileIndent = null;
      continue;
    }
    if (!cur) continue;
    const fm = l.match(/^(\s*)[-*]\s*파일\s*:\s*(.*)$/);
    if (fm) {
      fileIndent = fm[1].length;
      for (const p of fm[2].split(/[,·]/)) if (cleanPath(p)) cur.files.push(cleanPath(p));
      continue;
    }
    const rm = l.match(/^\s*[-*]\s*사유\s*:\s*(.*)$/);
    if (rm) {
      cur.reason = rm[1].trim();
      fileIndent = null;
      continue;
    }
    if (fileIndent != null) {
      const sub = l.match(/^(\s+)[-*]\s+(.+)$/);
      if (sub && sub[1].length > fileIndent) {
        if (cleanPath(sub[2])) cur.files.push(cleanPath(sub[2]));
        continue;
      }
      fileIndent = null;
    }
  }
  return phases;
}

// 완료 기준 — `[AUTO]`·`[USER]`가 붙은 줄을 차례로 1번부터 센다
function parseCriteria(text) {
  return meaningfulLines(section(text, '완료 기준')).filter((l) =>
    /^(?:\d+[.)]|[-*])\s*\[(AUTO|USER)\]/.test(l),
  );
}

function goalLine(text) {
  return meaningfulLines(section(text, '목표'))[0] || '';
}

function plannedFiles(text) {
  const files = parseFileList(section(text, '만질 파일'));
  for (const p of parsePhases(text)) for (const f of p.files) if (!files.includes(f)) files.push(f);
  return files;
}

// 경로가 계획 목록(파일 또는 폴더)에 들어 있나
function fileMatches(file, planned) {
  const base = planned.replace(/\/$/, '');
  return file === base || file.startsWith(base + '/');
}

function quoteMeta(v) {
  return /\s/.test(v) ? `"${v}"` : v;
}

function renderMeta(st) {
  const parts = [
    `plan=${st.plan}`,
    `type=${st.type}`,
    `size=${st.size}`,
    `switch=${st.switch.join(',')}`,
    `range=${quoteMeta(st.range)}`,
    `parent=${st.parent}`,
    `by=${st.by}`,
  ];
  if (st.tab) parts.push(`tab=${st.tab}`);
  return `<!-- taskery: ${parts.join(' ')} -->`;
}

// ─── 시간 · 단계 표 ─────────────────────────────────

function ms(iso) {
  return iso ? new Date(iso).getTime() : null;
}

function minutes(msVal) {
  if (msVal == null) return '';
  const m = Math.round(msVal / 60000);
  return m < 1 ? '1분 미만' : `${m}분`;
}

// 단계별 소요 시간(ms). 각 단계 = 그 단계 완료 시각 − 앞 단계들의 마지막 완료 시각
function stageDurations(st) {
  const t0 = ms(st.times.prepare);
  const tPlan = st.approve ? ms(st.approve.at) : null;
  const tDev = sw(st, 'dev') && st.testCode ? ms(st.testCode.at) : null;
  const tTest = sw(st, 'test') && st.testDone ? ms(st.testDone.at) : null;
  const tClose = st.closed ? ms(st.closed.at) : null;
  const d = {};
  if (tPlan != null) d.plan = Math.max(0, tPlan - t0);
  if (tDev != null) d.dev = Math.max(0, tDev - Math.max(t0, tPlan || t0));
  if (tTest != null) d.test = Math.max(0, tTest - Math.max(t0, tPlan || t0, tDev || t0));
  if (tClose != null) {
    let close = tClose - Math.max(t0, tPlan || t0, tDev || t0, tTest || t0);
    // 병합 확인 대기(commit-task 끝 ~ merge-task 시작)는 뺀다(§4-3)
    if (st.commit && st.mergeStart) close -= Math.max(0, ms(st.mergeStart) - ms(st.commit.at));
    d.close = Math.max(0, close);
    d.total = (d.plan || 0) + (d.dev || 0) + (d.test || 0) + d.close;
  }
  return d;
}

function stageCells(st) {
  const d = stageDurations(st);
  const planDone = !!st.approve;
  const devDone = !sw(st, 'dev') || !!st.testCode;
  const testDone = !sw(st, 'test') || !!st.testDone;
  const cells = [];
  cells.push(planDone ? `✅ ${minutes(d.plan)}` : '⏳');
  if (!sw(st, 'dev')) cells.push('꺼짐');
  else cells.push(st.testCode ? `✅ ${minutes(d.dev)}` : planDone ? '⏳' : '–');
  if (!sw(st, 'test')) cells.push('꺼짐');
  else if (st.testDone) cells.push(`✅ ${minutes(d.test)}${st.testDone.accepted ? ' (FAIL 수락)' : ''}`);
  else cells.push(planDone && devDone ? '⏳' : '–');
  if (st.closed) cells.push(`✅ ${minutes(d.close)} (합계 ${minutes(d.total)})`);
  else cells.push(planDone && devDone && testDone ? '⏳' : '–');
  return cells;
}

const TABLE_HEAD = '| 시작·기획 | 개발 | 테스트 | 닫기 |';

function renderTableRow(st) {
  return `| ${stageCells(st).join(' | ')} |`;
}

// 문서의 메타 줄과 단계 표 줄을 .state 기록으로 다시 쓴다(메타·표는 명령만 쓴다, §4-2)
function syncDoc(main, st) {
  const file = docAbs(main, st);
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const mi = lines.findIndex((l) => l.startsWith('<!-- taskery:'));
  if (mi !== -1) lines[mi] = renderMeta(st);
  const hi = lines.findIndex((l) => l.trim() === TABLE_HEAD);
  if (hi !== -1 && lines[hi + 2] !== undefined && lines[hi + 2].trim().startsWith('|')) {
    lines[hi + 2] = renderTableRow(st);
  }
  fs.writeFileSync(file, lines.join('\n'));
}

function renderDoc(st) {
  const out = [
    `# ${taskLabel(st.num)} ${st.title}`,
    renderMeta(st),
    '',
    TABLE_HEAD,
    '|---|---|---|---|',
    renderTableRow(st),
    '',
    '## 목표',
    '',
  ];
  if (st.size !== 'small') out.push('## 요구사항', '');
  out.push('## 완료 기준', '', '## 만질 파일', '');
  if (st.size !== 'small') out.push('## Phase', '');
  out.push('## 결정', '', '## 결과', '');
  return out.join('\n');
}

// `## 결과` 절 끝에 한 줄을 붙인다
function appendResult(main, st, line) {
  const file = docAbs(main, st);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let start = lines.findIndex((l) => l.trim() === '## 결과');
  if (start === -1) {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push('', '## 결과', '');
    start = lines.length - 2;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  let at = end;
  while (at > start + 1 && lines[at - 1].trim() === '') at--;
  if (at === start + 1) {
    lines.splice(at, 0, '', line);
  } else {
    lines.splice(at, 0, line);
  }
  fs.writeFileSync(file, lines.join('\n'));
}

function nowIso() {
  return new Date().toISOString();
}

function clock(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function todayLocal() {
  return clock(nowIso()).slice(0, 10);
}

// 범위 메모 갱신 — 태스크 명령에 --range를 붙이면 메타의 범위만 바꾼다(§3-5)
function updateRange(main, st, range) {
  if (!range || range === st.range) return st;
  st.range = range;
  writeState(main, st);
  syncDoc(main, st);
  return st;
}

module.exports = {
  MANIFEST_NAME,
  EXCLUDE_NAMES,
  PLANT_COPY,
  PLANT_LINK,
  TYPES,
  SIZES,
  SWITCHES,
  DEFAULT_RANGE,
  TAG_OF,
  CODE_TEST_NOTICE_MS,
  TaskeryError,
  fail,
  git,
  gitOk,
  findMain,
  currentBranch,
  changedFiles,
  trackedChanges,
  isAncestor,
  branchExists,
  fingerprint,
  ensureExclude,
  runShell,
  tail,
  readManifest,
  writeManifest,
  requireInstalled,
  getPackageVersion,
  stateDir,
  pad,
  taskLabel,
  parseTaskNum,
  writeJsonAtomic,
  readState,
  writeState,
  listStates,
  withLock,
  sw,
  needsNoMerge,
  hasFinishRecord,
  workDir,
  parseGitRuleTable,
  readGitRule,
  fillTemplate,
  docAbs,
  docShown,
  readDoc,
  section,
  meaningfulLines,
  parseFileList,
  parsePhases,
  parseCriteria,
  goalLine,
  plannedFiles,
  fileMatches,
  renderMeta,
  stageDurations,
  stageCells,
  minutes,
  syncDoc,
  renderDoc,
  appendResult,
  nowIso,
  clock,
  todayLocal,
  updateRange,
};
