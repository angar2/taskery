/**
 * bin/lib.js
 * 공통 유틸 — taskery init/create/update/prune/status 스크립트가 공유.
 *
 * 핵심:
 *   - findTemplateDir(): 패키지 설치 위치에서 template/ 디렉토리 찾기
 *   - walkTemplate(templateDir): template/ 안 *모든 파일* 상대경로 + 해시 맵 리턴
 *   - sha256(path): 파일 해시
 *   - mkdirp(path): mkdir -p
 *   - copyFile(src, dst): 파일 카피 + 디렉토리 자동 생성
 *   - writeManifest(manifest, dst): manifest JSON 기록
 *   - readManifest(path): 기존 manifest Read (없으면 null)
 *   - LOCAL_SUFFIX: '.local.md' suffix 검사 (npx 미터치 룰)
 *
 * 멀티세션 (0.1.2+):
 *   - generateProjectId(): 새 projectId 생성 (8자 hex)
 *   - getMainWorktreePath(cwd): cwd가 속한 git 트리의 *메인 워크트리* 절대 경로
 *   - getProjectId(mainWtPath): manifest에서 projectId 추출
 *   - getWorktreesRoot(projectId): ~/.taskery/worktrees/<projectId>
 *   - getWorktreePath(projectId, { taskNum, src, slug }): 특정 task 워크트리 경로
 *   - getMergeLockPath(projectId): ~/.taskery/<projectId>.merge.lock
 *   - withMergeLock(projectId, fn, opts): proper-lockfile로 머지 락 + fn 실행 + 자동 release
 *   - withMetaLock(filePath, fn, opts): 메타 파일 쓰기 락 + fn 실행
 *   - getActiveTasks(mainWtPath): SSoT 조회 (git branch --no-merged dev --list 'feature/*_TASK-*' ...)
 *   - getNextTaskNumber(mainWtPath): (진행중 ∪ dev 머지 히스토리) 최대 + 1
 *   - assertMainWorktreeOnDev(mainWtPath): 메인 워크트리가 dev 체크아웃 상태인지 검증
 *   - assertDevExists(mainWtPath): dev 브랜치 존재 검증
 *
 * 백로그 (0.1.2+):
 *   - getActiveVersion(mainWtPath): .project/AGENT-GUIDE.md에서 활성 plan 버전(vX.X) 추출
 *   - getBacklogPath(mainWtPath, activeVersion?): .project/tasks/<vX.X>/BACKLOG.md 절대 경로
 *   - parseBacklogItem(mainWtPath, blId): BL-NNN 항목 메타 파싱 ({ status, type, title, slug, summary, target, taskNums })
 *   - appendBacklogItem(mainWtPath, meta): withMetaLock + BL-NNN 채번 + 항목 append (placeholder 치환 우선)
 *   - markBacklogChecked(mainWtPath, blId, taskNum): withMetaLock + [ ] → [x] + TASK 마크 (다회 진행 시 콤마 추가)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const LOCAL_SUFFIX = '.local.md';
const MANIFEST_NAME = '.taskery-manifest.json';

function findTemplateDir() {
  // 패키지 루트는 이 lib.js 파일의 부모(bin/)의 부모
  const pkgRoot = path.resolve(__dirname, '..');
  const tmpl = path.join(pkgRoot, 'template');
  if (!fs.existsSync(tmpl)) {
    throw new Error(`template/ not found at ${tmpl}. taskery 패키지 설치 손상 가능성.`);
  }
  return tmpl;
}

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

function walkTemplate(templateDir) {
  // template/ 안 모든 파일 상대경로 + 해시 맵 리턴
  // 결과: { 'CLAUDE.md': 'sha256:...', '.claude/skills/task-init/SKILL.md': 'sha256:...', ... }
  const result = {};
  function walk(dir, relBase) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.isFile()) {
        result[rel] = sha256(full);
      }
    }
  }
  walk(templateDir, '');
  return result;
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(src, dst) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
  // 실행 권한 보존 (hooks .sh 파일)
  if (src.endsWith('.sh')) {
    fs.chmodSync(dst, 0o755);
  }
}

function writeManifest(manifest, dst) {
  fs.writeFileSync(dst, JSON.stringify(manifest, null, 2) + '\n');
}

function readManifest(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`${filePath} 파싱 실패: ${e.message}`);
  }
}

function isLocalOverride(relPath) {
  // *.local.md suffix 사용자 오버라이드 — npx 미터치 명시
  return relPath.endsWith(LOCAL_SUFFIX);
}

function getPackageVersion() {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

// === 멀티세션 (0.1.2+) ===

const TASKERY_HOME = path.join(os.homedir(), '.taskery');
const DEFAULT_STALE_DAYS = 30;
const DEFAULT_LOCK_TIMEOUT_MS = 30000;

const BRANCH_PATTERNS = [
  'feature/*_TASK-*',
  'bug/*_TASK-*',
  'improve/*_TASK-*',
  'refactor/*_TASK-*',
  'docs/*_TASK-*',
  'chore/*_TASK-*',
];

function generateProjectId() {
  return crypto.randomBytes(4).toString('hex');
}

function gitCapture(cwd, args, opts = {}) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', opts.captureStderr ? 'pipe' : 'ignore'],
    }).trimEnd();
  } catch (e) {
    if (opts.allowFail) return null;
    throw e;
  }
}

function getMainWorktreePath(cwd = process.cwd()) {
  // git ≥ 2.31 — `git rev-parse --path-format=absolute --git-common-dir` 는
  // 메인 워크트리의 .git 경로(또는 .git 디렉토리 자체)를 절대 경로로 돌려준다.
  // 그 부모가 *메인 워크트리* 절대 경로.
  const commonDir = gitCapture(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (!commonDir) throw new Error(`메인 워크트리 검출 실패 (cwd=${cwd})`);
  return path.dirname(commonDir);
}

function getProjectId(mainWtPath) {
  const m = readManifest(path.join(mainWtPath, MANIFEST_NAME));
  if (!m || !m.projectId) {
    throw new Error(
      `${MANIFEST_NAME}.projectId 누락 — 'npx @angar2/taskery update' 로 마이그레이션 필요.`,
    );
  }
  return m.projectId;
}

function getWorktreesRoot(projectId) {
  return path.join(TASKERY_HOME, 'worktrees', projectId);
}

function getWorktreePath(projectId, { taskNum, src, slug }) {
  // src = 'BL-NNN' | 'RM-NNN' | 'DR'
  const nnn = String(taskNum).padStart(3, '0');
  return path.join(getWorktreesRoot(projectId), `TASK-${nnn}_${src}_${slug}`);
}

function getMergeLockPath(projectId) {
  return path.join(TASKERY_HOME, `${projectId}.merge.lock`);
}

async function withMergeLock(projectId, fn, opts = {}) {
  const lockfile = require('proper-lockfile');
  const lockPath = getMergeLockPath(projectId);
  mkdirp(path.dirname(lockPath));
  // proper-lockfile은 *기존 파일 위에 락*을 잡는다. sentinel 파일 보장.
  if (!fs.existsSync(lockPath)) fs.writeFileSync(lockPath, '');
  const release = await lockfile.lock(lockPath, {
    stale: opts.stale ?? DEFAULT_LOCK_TIMEOUT_MS,
    retries: opts.retries ?? {
      retries: 5,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 1000,
    },
    realpath: false,
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}

async function withMetaLock(filePath, fn, opts = {}) {
  const lockfile = require('proper-lockfile');
  const target = filePath;
  if (!fs.existsSync(target)) {
    // 락 대상은 파일이어야 함. 없으면 sentinel 빈 파일 만들어 락 가능 상태로.
    mkdirp(path.dirname(target));
    fs.writeFileSync(target, '');
  }
  const release = await lockfile.lock(target, {
    stale: opts.stale ?? DEFAULT_LOCK_TIMEOUT_MS,
    retries: opts.retries ?? {
      retries: 5,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 1000,
    },
    realpath: false,
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}

function assertDevExists(mainWtPath) {
  const ok = gitCapture(mainWtPath, ['rev-parse', '--verify', 'dev'], { allowFail: true });
  if (ok === null) {
    throw new Error('dev 브랜치 부재. 사용자 결정 필요 (생성?).');
  }
}

function assertMainWorktreeOnDev(mainWtPath) {
  const current = gitCapture(mainWtPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (current !== 'dev') {
    throw new Error(`메인 워크트리가 dev 아님 (현재: ${current}). taskery 정책 위배.`);
  }
}

function parseBranchName(branch) {
  // 형식: {type}/{dev}_TASK-NNN_{src}_{slug}
  // 예: feature/claude_TASK-007_BL-003_login-feature
  //     bug/angar2_TASK-012_DR_mobile-form-refresh
  const m = branch.match(
    /^(feature|bug|improve|refactor|docs|chore)\/([^_]+)_TASK-(\d+)_([A-Z]{2}(?:-\d+)?|DR)_(.+)$/,
  );
  if (!m) return null;
  return {
    branch,
    type: m[1],
    dev: m[2],
    taskNum: parseInt(m[3], 10),
    src: m[4],
    slug: m[5],
  };
}

function getActiveTasks(mainWtPath) {
  // SSoT — dev에 미머지된 작업 브랜치 (TASK-* 패턴)
  const out = gitCapture(mainWtPath, [
    'branch',
    '--no-merged',
    'dev',
    '--list',
    ...BRANCH_PATTERNS,
  ]);
  if (!out) return [];
  return out
    .split('\n')
    .map((l) => l.replace(/^[*+]?\s*/, '').trim())
    .filter(Boolean)
    .map(parseBranchName)
    .filter(Boolean);
}

function getNextTaskNumber(mainWtPath) {
  // 1. 진행중 (SSoT)
  const activeNums = getActiveTasks(mainWtPath).map((t) => t.taskNum);
  // 2. dev 머지 히스토리 (GIT_RULE 풍부 메시지)
  const log = gitCapture(mainWtPath, [
    'log',
    'dev',
    '--grep',
    'TASK-[0-9]\\+',
    '--extended-regexp',
    '--oneline',
  ]);
  const merged = log
    ? Array.from(log.matchAll(/TASK-(\d+)/g)).map((m) => parseInt(m[1], 10))
    : [];
  const all = [...activeNums, ...merged];
  if (all.length === 0) return 1;
  return Math.max(...all) + 1;
}

// ─── 백로그 (0.1.2+) ────────────────────────────────────────────────

const BACKLOG_PLACEHOLDER =
  '(사용자 발화 또는 task-close 직후 메인 감지로 한 행씩 추가. 빈 상태 default.)';

function getActiveVersion(mainWtPath) {
  // .project/AGENT-GUIDE.md '## 활성 plan 버전' 섹션 다음 비어 있지 않은 첫 줄에서 vX.X 추출
  const guidePath = path.join(mainWtPath, '.project', 'AGENT-GUIDE.md');
  if (!fs.existsSync(guidePath)) {
    throw new Error(`.project/AGENT-GUIDE.md 부재. /project-init 먼저 호출.`);
  }
  const content = fs.readFileSync(guidePath, 'utf8');
  const sec = content.match(/##\s*활성 plan 버전\s*\n+([^\n]+)/);
  if (!sec) {
    throw new Error(`.project/AGENT-GUIDE.md '## 활성 plan 버전' 섹션 부재.`);
  }
  const m = sec[1].match(/\bv[\d.]+(?:[-\w]*)?/);
  if (!m) {
    throw new Error(
      `'## 활성 plan 버전' 값에서 vX.X 패턴 추출 실패: ${sec[1].trim()} — /plan-init으로 활성 버전 갱신 필요.`,
    );
  }
  return m[0];
}

function getBacklogPath(mainWtPath, activeVersion) {
  const v = activeVersion ?? getActiveVersion(mainWtPath);
  return path.join(mainWtPath, '.project', 'tasks', v, 'BACKLOG.md');
}

function computeNextBLNumber(content) {
  const matches = Array.from(content.matchAll(/\bBL-(\d+)\b/g)).map((m) => parseInt(m[1], 10));
  if (matches.length === 0) return 1;
  return Math.max(...matches) + 1;
}

function formatBacklogBlock({ id, type, title, slug, summary, target }) {
  const blId = `BL-${String(id).padStart(3, '0')}`;
  return `- [ ] **${blId}** [${type}] ${title} \`${slug}\`\n  - 개요: ${summary}\n  - 대상 영역: ${target}`;
}

async function appendBacklogItem(mainWtPath, meta) {
  // meta: { type, title, slug, summary, target }
  const backlogPath = getBacklogPath(mainWtPath);
  if (!fs.existsSync(backlogPath)) {
    throw new Error(
      `${backlogPath} 부재. /plan-init 먼저 호출해 활성 버전 디렉토리 + 빈 BACKLOG.md 생성 필요.`,
    );
  }
  return await withMetaLock(backlogPath, async () => {
    const content = fs.readFileSync(backlogPath, 'utf8');
    const next = computeNextBLNumber(content);
    const block = formatBacklogBlock({ id: next, ...meta });
    let updated;
    if (content.includes(BACKLOG_PLACEHOLDER)) {
      updated = content.replace(BACKLOG_PLACEHOLDER, block);
    } else {
      updated = content.replace(/\s*$/, '') + '\n\n' + block + '\n';
    }
    fs.writeFileSync(backlogPath, updated);
    return next;
  });
}

function parseBacklogItem(mainWtPath, blId) {
  // blId: 'BL-001'. 발견 못하면 null.
  const backlogPath = getBacklogPath(mainWtPath);
  if (!fs.existsSync(backlogPath)) return null;
  const content = fs.readFileSync(backlogPath, 'utf8');
  const lines = content.split('\n');
  const headRe = new RegExp(
    `^- \\[([ x])\\] \\*\\*${blId}\\*\\* \\[(\\w+)\\] (.+?) \`([\\w-]+)\``,
  );
  let idx = -1;
  let head = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headRe);
    if (m) {
      idx = i;
      head = m;
      break;
    }
  }
  if (idx === -1) return null;
  let summary = null;
  let target = null;
  let taskNums = null;
  for (let j = idx + 1; j < lines.length; j++) {
    const l = lines[j];
    if (l.startsWith('- ') && !l.startsWith('  - ')) break; // 다음 BL 항목
    if (l.trim() === '') continue; // 블록 안 빈 줄 허용 (안전)
    if (!l.startsWith('  - ')) break;
    const ms = l.match(/^  - 개요:\s*(.+)/);
    if (ms) { summary = ms[1].trim(); continue; }
    const mt = l.match(/^  - 대상 영역:\s*(.+)/);
    if (mt) { target = mt[1].trim(); continue; }
    const mk = l.match(/^  - TASK:\s*(.+)/);
    if (mk) { taskNums = mk[1].trim(); continue; }
  }
  return {
    blId,
    status: head[1] === 'x' ? 'checked' : 'pending',
    type: head[2],
    title: head[3],
    slug: head[4],
    summary,
    target,
    taskNums,
  };
}

async function markBacklogChecked(mainWtPath, blId, taskNum) {
  // taskNum: number. [ ] → [x] + TASK 마크 (있으면 콤마 추가, 없으면 신규 줄)
  const backlogPath = getBacklogPath(mainWtPath);
  if (!fs.existsSync(backlogPath)) {
    throw new Error(`${backlogPath} 부재.`);
  }
  const taskLabel = `TASK-${String(taskNum).padStart(3, '0')}`;
  return await withMetaLock(backlogPath, async () => {
    const content = fs.readFileSync(backlogPath, 'utf8');
    const lines = content.split('\n');
    const headRe = new RegExp(`^(- )\\[[ x]\\](\\s+\\*\\*${blId}\\*\\*.+)$`);
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (headRe.test(lines[i])) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      throw new Error(`${blId} 항목 없음.`);
    }
    lines[idx] = lines[idx].replace(headRe, '$1[x]$2');
    // 다음 BL 헤드 또는 파일 끝까지가 같은 블록 — 그 안에서 TASK 줄 검색
    let blockEnd = lines.length;
    for (let j = idx + 1; j < lines.length; j++) {
      if (lines[j].startsWith('- ') && !lines[j].startsWith('  - ')) {
        blockEnd = j;
        break;
      }
    }
    let taskLineIdx = -1;
    for (let j = idx + 1; j < blockEnd; j++) {
      if (lines[j].match(/^  - TASK:/)) {
        taskLineIdx = j;
        break;
      }
    }
    if (taskLineIdx !== -1) {
      const existing = lines[taskLineIdx].match(/^  - TASK:\s*(.+)/)[1].trim();
      const existingTasks = existing.split(/[,\s]+/).filter(Boolean);
      if (!existingTasks.includes(taskLabel)) {
        lines[taskLineIdx] = `  - TASK: ${existing}, ${taskLabel}`;
      }
    } else {
      // blockEnd 직전 빈 줄 건너뛰고 삽입
      let insertAt = blockEnd;
      while (insertAt > idx + 1 && lines[insertAt - 1].trim() === '') insertAt--;
      lines.splice(insertAt, 0, `  - TASK: ${taskLabel}`);
    }
    fs.writeFileSync(backlogPath, lines.join('\n'));
  });
}

module.exports = {
  LOCAL_SUFFIX,
  MANIFEST_NAME,
  findTemplateDir,
  sha256,
  walkTemplate,
  mkdirp,
  copyFile,
  writeManifest,
  readManifest,
  isLocalOverride,
  getPackageVersion,
  // 멀티세션 (0.1.2+)
  TASKERY_HOME,
  DEFAULT_STALE_DAYS,
  DEFAULT_LOCK_TIMEOUT_MS,
  BRANCH_PATTERNS,
  generateProjectId,
  gitCapture,
  getMainWorktreePath,
  getProjectId,
  getWorktreesRoot,
  getWorktreePath,
  getMergeLockPath,
  withMergeLock,
  withMetaLock,
  assertDevExists,
  assertMainWorktreeOnDev,
  parseBranchName,
  getActiveTasks,
  getNextTaskNumber,
  // 백로그 (0.1.2+)
  BACKLOG_PLACEHOLDER,
  getActiveVersion,
  getBacklogPath,
  computeNextBLNumber,
  formatBacklogBlock,
  appendBacklogItem,
  parseBacklogItem,
  markBacklogChecked,
};
