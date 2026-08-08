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
 *   - getInitLockPath(projectId): ~/.taskery/<projectId>.init.lock (task 분기 직렬화용)
 *   - withMergeLock(projectId, fn, opts): proper-lockfile로 머지 락 + fn 실행 + 자동 release
 *   - withMetaLock(filePath, fn, opts): 메타 파일 쓰기 락 + fn 실행
 *   - withMetaLockSync(filePath, fn, opts): 위의 동기 변형 (sync 호출 체인용 — manifest 갱신)
 *   - getActiveTasks(mainWtPath): SSoT 조회 (git branch --list 'feature/*_TASK-*' ...)
 *   - getNextTaskNumber(mainWtPath): (진행중 ∪ 전 ref 머지 히스토리) 최대 + 1 (부모 무관 전역 채번)
 *   - forkTask(mainWtPath, {type,dev,src,slug}): init 락 안에서 부모(현재 브랜치) 캡처+채번+워크트리·브랜치 생성 원자 실행
 *   - currentBranch(mainWtPath): 메인 워크트리 현재 브랜치 = 부모 브랜치(detached면 'HEAD')
 *   - assertMainWorktreeOn(mainWtPath, branch): 메인 워크트리가 지정 브랜치 체크아웃 상태인지 검증
 *
 * 백로그 (0.1.2+):
 *   - getActiveVersion(mainWtPath): 활성 plan 식별자 — manifest.activePlan 우선, 구형 AGENT-GUIDE.md 폴백 (0.7.0+)
 *   - setActivePlan(mainWtPath, plan): manifest.activePlan 갱신 (plan 폴더 실재 검증 포함 — plan-switch)
 *   - getBacklogPath(mainWtPath, activeVersion?): .project/tasks/<활성 plan>/BACKLOG.md 절대 경로
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

// === 멀티 플랫폼 (0.2.0+) ===
// 공통 소스 + 플랫폼별 조립 설치: 공통 자산(shared/)은 단일 소스로 보관하고
// 설치 시 고른 플랫폼의 실제 경로로 매핑 복사한다. 플랫폼 고유 자산은 그대로 복사.
const PLATFORMS = ['claude', 'codex'];
const DEFAULT_PLATFORMS = ['claude']; // 기존(0.1.x) 설치 마이그레이션 기본값

// shared/ 공통 자산의 플랫폼별 설치 경로 매핑.
// shared 하위 첫 세그먼트(skills|hooks) → 각 플랫폼의 실제 설치 루트.
// 스킬·git-guard 본문은 양 플랫폼 동일(검증 완료) — 단일 소스로 보관, 설치 때 갈라 깐다.
const SHARED_DEST = {
  claude: { skills: '.claude/skills', hooks: '.claude/hooks' },
  codex: { skills: '.agents/skills', hooks: '.codex/hooks' },
};

// template 상대경로 → 소속 ('agnostic' | 'shared' | 'claude' | 'codex')
function platformOf(relPath) {
  if (relPath.startsWith('shared/')) return 'shared'; // 공통 — 설치 시 플랫폼별 매핑
  if (relPath === 'CLAUDE.md' || relPath.startsWith('.claude/')) return 'claude';
  if (relPath.startsWith('.codex/')) return 'codex';
  // AGENTS.md는 0.7.0부터 agnostic — 진입 문서 본문의 단일 소스이고
  // CLAUDE.md는 이를 `@AGENTS.md`로 임포트만 한다(Claude Code는 AGENTS.md를 자동 로드하지 않음).
  return 'agnostic'; // AGENTS.md, .project/, .gitignore 등 — 항상 설치
}

// shared/ 상대경로를 특정 플랫폼의 설치 경로로 변환.
// 예: 'shared/skills/task-init/SKILL.md' + 'codex' → '.agents/skills/task-init/SKILL.md'
function mapSharedDest(relPath, platform) {
  const rest = relPath.slice('shared/'.length); // 'skills/task-init/SKILL.md'
  const sep = rest.indexOf('/');
  const top = sep === -1 ? rest : rest.slice(0, sep); // 'skills'
  const tail = sep === -1 ? '' : rest.slice(sep); // '/task-init/SKILL.md'
  const root = SHARED_DEST[platform] && SHARED_DEST[platform][top];
  if (!root) {
    throw new Error(`shared 자산 매핑 미정의: ${relPath} (platform=${platform})`);
  }
  return root + tail;
}

// template 파일맵을 설치 계획으로 전개 — [{ templateRel, installRel, hash }].
//   - agnostic: 그대로 (includeAgnostic=false면 제외 — add 용)
//   - shared: 선택 플랫폼마다 매핑 경로로 1건씩 전개 (1:N)
//   - 플랫폼 고유: 선택 플랫폼이면 그대로
function resolveInstallPlan(templateFiles, platforms, { includeAgnostic = true } = {}) {
  const plan = [];
  for (const [rel, hash] of Object.entries(templateFiles)) {
    const p = platformOf(rel);
    if (p === 'agnostic') {
      if (includeAgnostic) plan.push({ templateRel: rel, installRel: rel, hash });
    } else if (p === 'shared') {
      for (const platform of platforms) {
        plan.push({ templateRel: rel, installRel: mapSharedDest(rel, platform), hash });
      }
    } else if (platforms.includes(p)) {
      plan.push({ templateRel: rel, installRel: rel, hash });
    }
  }
  return plan;
}

// .gitignore 등록 패턴 (플랫폼별)
const GITIGNORE_PATTERNS = {
  agnostic: ['.project/', '.taskery-manifest.json', 'AGENTS.md'],
  claude: ['.claude/', 'CLAUDE.md'],
  codex: ['.codex/', '.agents/'],
};

// 선택 플랫폼 + agnostic의 gitignore 패턴 합성 (중복 제거)
function gitignorePatternsFor(platforms) {
  const out = [...GITIGNORE_PATTERNS.agnostic];
  for (const p of platforms) {
    for (const pat of GITIGNORE_PATTERNS[p] || []) {
      if (!out.includes(pat)) out.push(pat);
    }
  }
  return out;
}

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
  // src = 'BL-NNN' | 'ST-N'(로드맵 Stage) | 'DR' (구형 'RM-NNN' 호환)
  const nnn = String(taskNum).padStart(3, '0');
  return path.join(getWorktreesRoot(projectId), `TASK-${nnn}_${src}_${slug}`);
}

function getMergeLockPath(projectId) {
  return path.join(TASKERY_HOME, `${projectId}.merge.lock`);
}

function getInitLockPath(projectId) {
  return path.join(TASKERY_HOME, `${projectId}.init.lock`);
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

function withMetaLockSync(filePath, fn, opts = {}) {
  // withMetaLock의 동기 변형. manifest 갱신 경로(initPlan → plan.js main)가 전부 sync라
  // async 락을 쓰면 호출 사슬 전체를 async로 바꿔야 해 동기 락을 별도로 둔다.
  const lockfile = require('proper-lockfile');
  if (!fs.existsSync(filePath)) {
    mkdirp(path.dirname(filePath));
    fs.writeFileSync(filePath, '');
  }
  // sync API는 retries를 지원하지 않는다(proper-lockfile 제약). 경합 시 즉시 던지는데,
  // manifest 쓰기는 사용자가 직접 부르는 명령들뿐이라 동시 실행이 실질적으로 없다.
  const release = lockfile.lockSync(filePath, {
    stale: opts.stale ?? DEFAULT_LOCK_TIMEOUT_MS,
    realpath: false,
  });
  try {
    return fn();
  } finally {
    release();
  }
}

function currentBranch(mainWtPath) {
  // 메인 워크트리의 현재 브랜치 = 태스크의 부모 브랜치(0.6.0). detached HEAD면 'HEAD' 반환.
  return gitCapture(mainWtPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

function assertMainWorktreeOn(mainWtPath, branch) {
  const current = currentBranch(mainWtPath);
  if (current !== branch) {
    throw new Error(`메인 워크트리가 ${branch} 아님 (현재: ${current}). 부모 브랜치로 체크아웃 필요.`);
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
  // SSoT — TASK-* 패턴 작업 브랜치 (분기 직후 빈 브랜치 포함). `--no-merged <부모>` 미사용:
  // 워크트리 분기 직후 브랜치는 부모와 동일 commit이라 `--no-merged`가 *완전 머지 상태*로
  // 처리 → 빈 결과 → getNextTaskNumber 충돌. 브랜치 존재 자체가 SSoT (정상 흐름은 task-close
  // 자동 삭제로 자연 정리, 보존 키워드 잔존분도 *진행중*으로 잡힘이 정합).
  const out = gitCapture(mainWtPath, ['branch', '--list', ...BRANCH_PATTERNS]);
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
  // 2. 머지 히스토리 (GIT_RULE 풍부 메시지) — 모든 ref(`--all`) 스캔.
  //    부모 브랜치가 dev로 고정되지 않으므로(0.6.0) 닫힌 태스크는 각자의 부모에 병합돼 있다.
  //    특정 부모(과거 'dev') 하나만 grep하면 다른 부모로 닫힌 번호를 놓쳐 채번 충돌 → `--all`로
  //    전 ref의 TASK-NNN 최대를 취해 번호를 리포 전역으로 유지.
  //    --extended-regexp(ERE)에서 `+`는 수량자 — `\+`는 *리터럴 +* 라 "TASK-001"을 못 잡는다.
  const log = gitCapture(mainWtPath, [
    'log',
    '--all',
    '--grep',
    'TASK-[0-9]+',
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

async function forkTask(mainWtPath, { type, dev, src, slug }) {
  // task 분기 — [채번 → 워크트리·브랜치 생성]을 init 락(withMetaLock)으로 원자화.
  // 병렬 task-init이 같은 번호를 읽고 각자 브랜치를 만들던 레이스(TOCTOU)를 차단: 락 안에서
  // getNextTaskNumber 직후 worktree add까지 끝내므로 다음 호출은 늘어난 번호를 본다.
  const projectId = getProjectId(mainWtPath);
  return withMetaLock(getInitLockPath(projectId), () => {
    // 부모 = 메인 워크트리의 현재 브랜치(0.6.0). dev 하드코딩 제거 — 서 있는 브랜치가 곧 부모.
    const parent = currentBranch(mainWtPath);
    if (parent === 'HEAD') {
      throw new Error('메인 워크트리가 detached HEAD — 부모로 삼을 브랜치에 체크아웃 필요.');
    }
    // SSoT 안전망 — 같은 항목 출처(BL-NNN/구형 RM-NNN)가 이미 진행중이면 거부.
    // DR(별도 ID 없음)·ST-N(Stage 하나에서 복수 task가 정상)은 검사 제외.
    if (/^(BL|RM)-/.test(src)) {
      const dup = getActiveTasks(mainWtPath).find((t) => t.src === src);
      if (dup) {
        throw new Error(`${src} 이미 진행중 (${dup.branch}) — 다른 세션이 같은 항목 진행`);
      }
    }
    const taskNum = getNextTaskNumber(mainWtPath); // 락 안 → TOCTOU 차단
    const nnn = String(taskNum).padStart(3, '0');
    const branch = `${type}/${dev}_TASK-${nnn}_${src}_${slug}`;
    const wtPath = getWorktreePath(projectId, { taskNum, src, slug });
    mkdirp(getWorktreesRoot(projectId));
    // 부모 브랜치를 base로 워크트리·브랜치 생성. 동일 브랜치명은 git이 거부(같은 항목 동시 분기
    // 차단). 실패 시 throw → fork.js가 사용자 보고.
    execFileSync('git', ['-C', mainWtPath, 'worktree', 'add', wtPath, '-b', branch, parent], {
      stdio: 'pipe',
    });
    return { taskNum, nnn, branch, wtPath, projectId, parent };
  });
}

function computeNextPlanNumber(mainWtPath) {
  // .project/plans/ 하위 'NNN_<slug>' 디렉토리 스캔 → NNN max+1, 3자리 zero-pad 문자열 반환.
  // plan = 기능 그룹 단위, 폴더명 앞 3자리 채번(TASK-NNN과 결 맞춤). slug은 호출측(plan-init)이 결합.
  // legacy 가드: 'NNN_' 패턴이 아닌 폴더(구버전 vX.X 등)는 legacyDirs로 수집 → plan-init이
  //   새 plan 생성 전 경고·수동 이전 안내에 사용(채번 공존 시 활성 plan 갈림 = 원 문제 재발 차단).
  const plansDir = path.join(mainWtPath, '.project', 'plans');
  if (!fs.existsSync(plansDir)) {
    return { next: '001', legacyDirs: [] };
  }
  const nums = [];
  const legacyDirs = [];
  for (const ent of fs.readdirSync(plansDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const m = ent.name.match(/^(\d{3})_/);
    if (m) nums.push(parseInt(m[1], 10));
    else legacyDirs.push(ent.name);
  }
  const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
  return { next: String(next).padStart(3, '0'), legacyDirs };
}

// ─── 백로그 (0.1.2+) ────────────────────────────────────────────────

const BACKLOG_PLACEHOLDER =
  '(사용자 발화 또는 task-close 직후 메인 감지로 한 행씩 추가. 빈 상태 default.)';

// 구형(0.7.0 미만) 활성 plan 저장소 — .project/AGENT-GUIDE.md '## 활성 plan 버전' 섹션.
// 0.7.0에서 SSoT가 manifest.activePlan으로 이관됐으나, update 전 리포를 무중단으로 굴리기 위해
// 읽기 폴백으로만 남긴다. 쓰기는 하지 않는다(_setActivePlan은 manifest만 갱신).
// 헤딩 줄 끝 부가 텍스트(HTML 주석 등) 허용 — project-init 골격이 헤딩에 주석을 달므로 접두 일치로 판정.
// 완전 일치를 요구하면 자기 골격을 자기가 못 읽는 자기모순 (recordion FRICTION 2026-08-06, scaffoldError 6회).
function _readLegacyActivePlan(mainWtPath) {
  const guidePath = path.join(mainWtPath, '.project', 'AGENT-GUIDE.md');
  if (!fs.existsSync(guidePath)) return null;
  const sec = fs.readFileSync(guidePath, 'utf8').match(/^##\s*활성 plan 버전[^\n]*\n+([^\n]+)/m);
  if (!sec) return null;
  // 첫 토큰 = plan 폴더 이름(' — 설명' 앞부분). '<예: ...>' 자리표시자는 미설정으로 간주.
  const firstLine = sec[1].trim();
  if (!firstLine || firstLine.startsWith('<')) return null;
  return firstLine.split(/\s+/)[0];
}

function getActiveVersion(mainWtPath) {
  // 활성 plan 식별자 = manifest.activePlan (0.7.0+ SSoT). plan = 기능 그룹 단위라
  // 식별자는 NNN_slug 폴더명(구형은 vX.X 버전명도 가능).
  const manifest = readManifest(path.join(mainWtPath, MANIFEST_NAME));
  if (manifest && manifest.activePlan) return manifest.activePlan;

  // 구형 폴백 — update 전 리포. 읽기만 하고 승격은 update가 1회 수행한다.
  const legacy = _readLegacyActivePlan(mainWtPath);
  if (legacy) return legacy;

  if (!manifest) {
    throw new Error(`${MANIFEST_NAME} 부재. 'npx @angar2/taskery init' 먼저 실행.`);
  }
  throw new Error(
    `활성 plan 미설정 (manifest.activePlan 없음) — /plan-init으로 plan을 생성하거나 ` +
      `'npx @angar2/taskery plan-switch <NNN_slug>'로 지정 필요.`,
  );
}

function setActivePlan(mainWtPath, plan) {
  // plan-switch — 대상 plan 폴더 실재 검증 후 manifest.activePlan 갱신.
  const planDir = path.join(mainWtPath, '.project', 'plans', plan);
  if (!fs.existsSync(planDir)) {
    throw new Error(`plan 폴더 부재: ${planDir} — 존재하는 plan만 활성으로 지정 가능.`);
  }
  _setActivePlan(mainWtPath, plan);
  return { plan, planDir };
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

// ─── task 헤더 / 상태 전이 (코드화) ─────────────────────────────────
// 헤더 파싱(6컬럼 · 구 5컬럼 폴백) · task 문서 위치 판정 · 7상태 유효전이 검증을 코드로 단일화.
// 계약: TASK_DOC_RULE §1.1(헤더) · §1.2(7상태) · §1.5(문서 위치).

// 7×7 유효전이표 (TASK_DOC_RULE §1.2 + FAIL/UNCERTAIN 분기). from → 허용 to 목록.
//   - 정상 진행: draft→planned→developing→developed→testing→tested→closed
//   - 되돌림: testing→developing (task-test FAIL "코드 결함" 사용자 "고쳐")
//   - closed는 종료 상태(빈 목록) — closed-immutable hook이 이후 본 파일 잠금.
const TRANSITIONS = {
  draft: ['planned'],
  planned: ['developing'],
  developing: ['developed'],
  developed: ['testing'],
  testing: ['tested', 'developing'],
  tested: ['closed'],
  closed: [],
};

function _locateHeaderRow(content) {
  // 헤더 표(라벨행 → 구분선 → 데이터행)에서 데이터행을 찾아 split 셀과 줄 인덱스 반환.
  // 데이터행 셀: `| a | b | c | d | e |` → split('|') = ['', ' a ', ..., ' e ', '']. null이면 표 부재.
  const lines = content.split('\n');
  let labelIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.trimStart().startsWith('|') && l.includes('생성일') && l.includes('상태')) {
      labelIdx = i;
      break;
    }
  }
  if (labelIdx === -1) return null;
  let dataIdx = -1;
  for (let j = labelIdx + 1; j < lines.length; j++) {
    const t = lines[j].trim();
    if (t === '') continue;
    if (/^[|\s:-]+$/.test(t)) continue; // 구분선 (|---|---|)
    if (lines[j].trimStart().startsWith('|')) {
      dataIdx = j;
      break;
    }
    break; // 표 끝
  }
  if (dataIdx === -1) return null;
  return { lines, dataIdx, cells: lines[dataIdx].split('|') };
}

function parseTaskHeader(taskMdPath) {
  // 헤더를 구조화 → { created, plan, type, size, parent, status }. 표 부재/컬럼 부족 시 throw.
  // 6컬럼(0.6.0+): 생성일·플랜·유형·규모·부모 브랜치·상태. 부모 브랜치는 상태 *앞* — 상태를
  // 항상 마지막 셀로 유지해 setStatus의 `length-2` 로직이 구·신 양쪽에서 성립하게 함.
  // 5컬럼(구): 부모 칸 부재 → parent='dev' 폴백(0.6.0 이전 문서 하위호환).
  const content = fs.readFileSync(taskMdPath, 'utf8');
  const loc = _locateHeaderRow(content);
  if (!loc) throw new Error(`헤더 표 파싱 실패 (TASK_DOC_RULE §1.1 형식 아님): ${taskMdPath}`);
  const inner = loc.cells.slice(1, -1).map((c) => c.trim());
  if (inner.length < 5) {
    throw new Error(`헤더 표 컬럼 부족(${inner.length}/5): ${taskMdPath}`);
  }
  if (inner.length >= 6) {
    const [created, plan, type, size, parent, status] = inner;
    return { created, plan, type, size, parent, status };
  }
  const [created, plan, type, size, status] = inner;
  return { created, plan, type, size, parent: 'dev', status };
}

function isProjectRegistered(mainWtPath) {
  // .gitignore에 .project/ 등록 여부 — check-ignore exit 0 = 등록(퍼블릭 default, 문서는 메인WT 공유),
  // exit 1 = 미등록(문서는 워크트리 안, 머지로 부모 반영). task-init Step7 분기와 동일 판정.
  try {
    execFileSync(
      'git',
      ['-C', mainWtPath, 'check-ignore', '-q', path.join(mainWtPath, '.project', 'dummy')],
      { stdio: 'ignore' },
    );
    return true;
  } catch (e) {
    return false;
  }
}

function resolveTaskDocPath(mainWtPath, wtPath, { taskNum }) {
  // task 문서 위치 단일 판정 — 등록 케이스로 base 결정 후 taskNum으로 탐색.
  // 단일 파일(`<NNN>_<slug>.md`) / 폴더 승격(`TASK-<NNN>_<slug>/task.md`) 양쪽 + plan 폴더 무관(*) 글롭.
  // 발견 못하면 null. 반환: { registered, plan, promoted, dir, file }.
  const nnn = String(taskNum).padStart(3, '0');
  const registered = isProjectRegistered(mainWtPath);
  const base = registered ? mainWtPath : wtPath;
  const tasksRoot = path.join(base, '.project', 'tasks');
  if (!fs.existsSync(tasksRoot)) return null;
  const fileRe = new RegExp(`^${nnn}_.+\\.md$`);
  const dirRe = new RegExp(`^TASK-${nnn}_`);
  for (const planEnt of fs.readdirSync(tasksRoot, { withFileTypes: true })) {
    if (!planEnt.isDirectory()) continue;
    const planDir = path.join(tasksRoot, planEnt.name);
    for (const ent of fs.readdirSync(planDir, { withFileTypes: true })) {
      if (ent.isFile() && fileRe.test(ent.name)) {
        return {
          registered,
          plan: planEnt.name,
          promoted: false,
          dir: planDir,
          file: path.join(planDir, ent.name),
        };
      }
      if (ent.isDirectory() && dirRe.test(ent.name)) {
        const f = path.join(planDir, ent.name, 'task.md');
        if (fs.existsSync(f)) {
          return {
            registered,
            plan: planEnt.name,
            promoted: true,
            dir: path.join(planDir, ent.name),
            file: f,
          };
        }
      }
    }
  }
  return null;
}

async function setStatus(taskMdPath, next) {
  // 헤더 상태 컬럼을 next로 전이 — 현재 상태 읽고 7×7 표 검증 후 치환 (withMetaLock 직렬화).
  //   - next가 7상태 아님 → throw. 현재==next → idempotent no-op (changed:false).
  //   - 유효전이 아님 → throw (잘못된 전이 거부).
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, next)) {
    throw new Error(`알 수 없는 상태: ${next} (유효: ${Object.keys(TRANSITIONS).join(', ')})`);
  }
  if (!fs.existsSync(taskMdPath)) throw new Error(`task 문서 없음: ${taskMdPath}`);
  return await withMetaLock(taskMdPath, async () => {
    const content = fs.readFileSync(taskMdPath, 'utf8');
    const loc = _locateHeaderRow(content);
    if (!loc) throw new Error(`헤더 표 파싱 실패: ${taskMdPath}`);
    const trimmed = loc.cells.slice(1, -1).map((c) => c.trim());
    const cur = trimmed[trimmed.length - 1]; // 상태 = 항상 마지막 셀 (6컬럼: 부모 브랜치가 그 앞)
    if (cur === next) return { changed: false, from: cur, to: next, path: taskMdPath };
    const allowed = TRANSITIONS[cur] || [];
    if (!allowed.includes(next)) {
      throw new Error(
        `잘못된 전이: ${cur} → ${next} (허용: ${allowed.length ? allowed.join(', ') : '없음 — 종료 상태'})`,
      );
    }
    const statusCellIdx = loc.cells.length - 2; // 마지막 빈 셀 직전 = 상태
    loc.cells[statusCellIdx] = loc.cells[statusCellIdx].replace(cur, next);
    loc.lines[loc.dataIdx] = loc.cells.join('|');
    fs.writeFileSync(taskMdPath, loc.lines.join('\n'));
    return { changed: true, from: cur, to: next, path: taskMdPath };
  });
}

// ─── task 문서 골격 생성 (코드화, C1) ───────────────────────────────
// fork 직후 §1.3 빈 골격을 코드가 자동 생성 — 생성일=오늘 / status=draft 자동, 파일명 규칙 코드 보장.

// 생성일=오늘(로컬 타임존 YYYY-MM-DD). toISOString()은 UTC라 KST 자정~09시 사이 전날로 박힘 → 로컬 산출.
function _todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 브랜치 타입 → 문서 유형(§1.1). improve↔improvement만 다름.
const DOC_TYPE_OF = {
  feature: 'feature',
  bug: 'bug',
  improve: 'improvement',
  refactor: 'refactor',
  docs: 'docs',
  chore: 'chore',
};

function _buildTaskDocPath(base, plan, { taskNum, slug, promoted }) {
  const nnn = String(taskNum).padStart(3, '0');
  const planDir = path.join(base, '.project', 'tasks', plan);
  if (promoted) {
    const dir = path.join(planDir, `TASK-${nnn}_${slug}`);
    return { dir, file: path.join(dir, 'task.md') };
  }
  return { dir: planDir, file: path.join(planDir, `${nnn}_${slug}.md`) };
}

function _renderTaskSkeleton({ taskNum, title, created, plan, docType, size, parent }) {
  const nnn = String(taskNum).padStart(3, '0');
  return [
    `# TASK-${nnn} — ${title}`,
    '',
    '| 생성일 | 플랜 | 유형 | 규모 | 부모 브랜치 | 상태 |',
    '|--------|------|------|------|-------------|------|',
    `| ${created} | ${plan} | ${docType} | ${size} | ${parent} | draft |`,
    '',
    '## Requirements',
    '',
    '(사용자 요구 + 메인 증폭 — `/task-plan`에서 채움)',
    '',
    '## Scope',
    '',
    '(영향 범위 — `/task-plan`에서 채움)',
    '',
    '## Dev Plan',
    '',
    '(Phase 1, 2, ... — `/task-plan`에서 채움)',
    '',
    '## Test Plan',
    '',
    '(테스트 방법 + 검증 명령 — `/task-plan`에서 채움)',
    '',
    '## Result',
    '',
    '(진행 + 테스트 결과 — `/task-dev`, `/task-test`에서 채움)',
    '',
  ].join('\n');
}

function scaffoldTaskDoc(mainWtPath, wtPath, meta) {
  // meta: { taskNum, slug, title, type(브랜치 타입), size, parent, plan?, promoted?, created? }
  // 위치: 등록(.gitignore) 케이스 → 메인WT, 미등록 → 워크트리. plan 미지정 시 활성 plan(manifest.activePlan)에서 검출.
  // parent 미지정 시 현재 브랜치 캡처(단독 호출 안전망 — 통상 fork가 넘김).
  // taskNum이 고유(fork init 락 채번)라 동일 문서 동시 쓰기 경합 없음 → 락 불요.
  const registered = isProjectRegistered(mainWtPath);
  const base = registered ? mainWtPath : wtPath;
  const plan = meta.plan || getActiveVersion(mainWtPath);
  const docType = DOC_TYPE_OF[meta.type] || meta.type;
  const created = meta.created || _todayLocal();
  const parent = meta.parent || currentBranch(mainWtPath);
  const { dir, file } = _buildTaskDocPath(base, plan, {
    taskNum: meta.taskNum,
    slug: meta.slug,
    promoted: !!meta.promoted,
  });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').trim()) {
    throw new Error(`task 문서 이미 존재: ${file}`);
  }
  mkdirp(dir);
  fs.writeFileSync(
    file,
    _renderTaskSkeleton({
      taskNum: meta.taskNum,
      title: meta.title,
      created,
      plan,
      docType,
      size: meta.size,
      parent,
    }),
  );
  return { registered, promoted: !!meta.promoted, plan, file };
}

// ─── plan 생성 (코드화, C3) ─────────────────────────────────────────
// 채번 + legacy 게이트 + 폴더 mkdir + ROADMAP/PLAN/BACKLOG 골격 + manifest.activePlan 갱신을 코드로.
// LLM 몫(FEATURES/UX-UI delta · ROADMAP Stage 내용 · PLAN 링크)은 골격의 placeholder로 남긴다.

function _renderRoadmap(plan) {
  return [
    `# ROADMAP — ${plan}`,
    '',
    '> 본 plan(기능 그룹) 한정 task 단계. Stage 단위(task 번호 강제 X), 상태 컬럼만 Living.',
    '> 프로젝트 거시 빌드 순서는 PROJECT.md, 다음 기능 그룹 후보는 글로벌 BACKLOG.md.',
    '',
    '## Stage 1 — <영역명>',
    '| 작업 단위 | 상태 |',
    '|-----------|------|',
    '| <한 task 분량 작업> | ⏳ 대기 |',
    '',
  ].join('\n');
}

function _renderPlanIndex(plan) {
  return [
    `# PLAN — ${plan}`,
    '',
    '> 이 plan(기능 그룹)의 얇은 인덱스. 각 항목은 루트 문서 섹션 링크 1줄 — 본문은 복제하지 않는다.',
    '',
    '## 이 기능 그룹이 건드리는 루트 문서',
    '- [FEATURES.md › <이 그룹 섹션>](../../FEATURES.md) — <한 줄 요약>',
    '- [UX-UI.md › <이 그룹 섹션>](../../UX-UI.md) — <한 줄 요약>',
    '- (DATA-MODEL / API-SPEC — task 진행이 구현 동반으로 채움)',
    '',
    '## task 체크리스트',
    '- [ ] <작업 단위> (ROADMAP Stage N)',
    '',
  ].join('\n');
}

function _renderPlanBacklog(plan) {
  return [
    `# BACKLOG — ${plan}`,
    '',
    `> 본 파일은 *${plan} plan 진행 중 누적되는 후속 task 후보* 추적용.`,
    '> 글로벌 `.project/BACKLOG.md` (다음 기능 그룹 후보 카탈로그) 와 별개.',
    '',
    '| 위치 | 영역 | 역할 |',
    '|------|------|------|',
    '| `.project/BACKLOG.md` (글로벌) | 다음 기능 그룹 후보 카탈로그 (다음 plan에서 검토) | Living document |',
    `| \`.project/tasks/${plan}/BACKLOG.md\` (본 파일) | 현재 plan 진행 중 누적된 후속 task 후보 | 한 plan 내 task close 직후 후보 누적 |`,
    '',
    '## 후속 task 후보',
    '',
    BACKLOG_PLACEHOLDER,
    '',
  ].join('\n');
}

function _setActivePlan(mainWtPath, plan) {
  // 활성 plan SSoT = manifest.activePlan (0.7.0+). 구형 AGENT-GUIDE.md는 갱신하지 않는다
  // (읽기 폴백 전용 — 두 곳에 쓰면 다시 갈린다).
  // manifest는 읽고-고쳐-쓰기라 다른 기록자(init/update/add)와 겹치면 필드가 유실될 수 있어 락으로 감싼다.
  const manifestPath = path.join(mainWtPath, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`${MANIFEST_NAME} 부재. 'npx @angar2/taskery init' 먼저 실행.`);
  }
  withMetaLockSync(manifestPath, () => {
    const manifest = readManifest(manifestPath);
    if (!manifest) throw new Error(`${MANIFEST_NAME} 읽기 실패.`);
    manifest.activePlan = plan;
    writeManifest(manifest, manifestPath);
  });
}

function initPlan(mainWtPath, slug, opts = {}) {
  // 채번 → legacy 게이트 → 폴더 + 골격 + manifest.activePlan 갱신. slug 검증은 CLI 측.
  // legacy 폴더(NNN_ 아닌 plan 폴더) 잔존 + !force → { gated:true } 반환(CLI가 사용자 confirm 후 force 재호출).
  const { next, legacyDirs } = computeNextPlanNumber(mainWtPath);
  if (legacyDirs.length && !opts.force) {
    return { gated: true, legacyDirs, next };
  }
  const plan = `${next}_${slug}`;
  const planDir = path.join(mainWtPath, '.project', 'plans', plan);
  const tasksDir = path.join(mainWtPath, '.project', 'tasks', plan);
  if (fs.existsSync(planDir)) {
    throw new Error(`plan 폴더 이미 존재: ${planDir}`);
  }
  mkdirp(planDir);
  mkdirp(path.join(tasksDir, 'spec-diffs'));
  mkdirp(path.join(tasksDir, 'screenshots'));
  mkdirp(path.join(tasksDir, 'mockup'));
  fs.writeFileSync(path.join(planDir, 'ROADMAP.md'), _renderRoadmap(plan));
  fs.writeFileSync(path.join(planDir, 'PLAN.md'), _renderPlanIndex(plan));
  fs.writeFileSync(path.join(tasksDir, 'BACKLOG.md'), _renderPlanBacklog(plan));
  _setActivePlan(mainWtPath, plan);
  return { gated: false, plan, nnn: next, planDir, tasksDir, legacyDirs };
}

// ─── task close 결정적 준비 (코드화, D1·D2) ─────────────────────────
// closeTask는 *결정적 준비만* 수행: 게이트(status=tested) → Phase 커밋(D2) → status=closed →
// flows/문서 커밋 → 추적마커. 비가역 3종(부모 브랜치 --no-ff 머지 · worktree remove · branch -d)과
// 충돌 해결·머지 락은 스킬(LLM)이 수행 — 위험 최소화 + 충돌은 LLM 판단 영역.

// 브랜치 타입 → 커밋 태그 (GIT_RULE 6-3).
const TAG_OF = {
  feature: 'feat',
  bug: 'fix',
  improve: 'improve',
  refactor: 'refactor',
  docs: 'docs',
  chore: 'docs',
};

function _parseDevPlanPhases(content) {
  // ## Dev Plan 섹션의 `### Phase N — 이름` + `- 파일:` 필드 추출.
  const lines = content.split('\n');
  let inDevPlan = false;
  const phases = [];
  let cur = null;
  for (const l of lines) {
    if (/^##\s+Dev Plan/.test(l)) {
      inDevPlan = true;
      continue;
    }
    if (inDevPlan && /^##\s+/.test(l)) break; // 다음 섹션
    if (!inDevPlan) continue;
    const ph = l.match(/^###\s+Phase\s+(\d+)\s*(?:[—-]\s*)?(.*)$/);
    if (ph) {
      cur = { num: parseInt(ph[1], 10), name: ph[2].trim(), files: [] };
      phases.push(cur);
      continue;
    }
    if (!cur) continue;
    const fm = l.match(/^\s*-\s*파일\s*:\s*(.+)$/);
    if (fm) {
      cur.files = fm[1]
        .split(',')
        .map((s) => s.replace(/`/g, '').trim())
        .filter((s) => s && !/^[(<]/.test(s)); // placeholder(<...>, (...)) 제외
    }
  }
  return phases;
}

function _porcelainFiles(wtPath) {
  // git status --porcelain -uall → 변경 파일 경로 목록 (XY 상태코드 3자 제거).
  // -uall: untracked 디렉토리를 개별 파일로 전개 (디렉토리 통째 `src/` 접힘 방지).
  const out = gitCapture(wtPath, ['status', '--porcelain', '-uall'], { allowFail: true });
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3).trim())
    .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p)) // rename은 도착 경로
    .filter(Boolean);
}

// 빌드 산출물 판정 — 소스 변경에 도구가 따라 바꾸는 파생 파일 (Phase 소속을 묻는 것 자체가 무의미).
// Dev Plan에 명시 안 돼도 미매핑 blocked 대신 마지막 Phase에 자동 편입 (stash·recordion FRICTION: pbxproj 미매핑만 6회).
const BUILD_ARTIFACT_RE = [
  /\.pbxproj$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)Cargo\.lock$/,
  /(^|\/)Gemfile\.lock$/,
  /(^|\/)Podfile\.lock$/,
];

function splitUncommittedByPhase(wtPath, taskMdPath, meta) {
  // 코드 변경분(.project/ 외)을 Dev Plan Phase에 매핑해 Phase별 자동 커밋. meta: { taskNum, type }.
  // 매핑 폴백 3규칙 (stash 6회 + recordion 5회 blocked 마찰 반영 — 11회 전부 기계적 편입이었음):
  //   1. 다중 Phase 매핑 → 가장 이른 Phase에 편입 + 커밋 메시지에 '(Phase a·b 변경 포함)' 표기.
  //      뒤 Phase가 앞 Phase 타입·함수를 참조하므로 이른 쪽이 의존 방향과 일치. 중간 커밋 독립 빌드는 비보장(GIT_RULE 명문).
  //   2. 미매핑 + 빌드 산출물(BUILD_ARTIFACT_RE) → 매핑된 그룹 중 마지막 Phase(없으면 Dev Plan 마지막)에
  //      자동 편입 + '(빌드 산출물 자동 편입)' 표기.
  //   3. 미매핑 + 일반 파일 → { ambiguous } 반환(커밋 X) — 계획 누락 가능성이라 사람 판단으로 유지.
  // .project/ 메타(flows/문서/changelog)는 제외 — closeTask가 별도 커밋.
  const codeFiles = _porcelainFiles(wtPath).filter((f) => !f.startsWith('.project/'));
  if (codeFiles.length === 0) return { committed: [], empty: true };
  const phases = _parseDevPlanPhases(fs.readFileSync(taskMdPath, 'utf8'));
  if (phases.length === 0) {
    return { ambiguous: true, reason: 'Dev Plan Phase 파싱 불가', files: codeFiles };
  }
  const matchOf = (f) =>
    phases
      .map((p, i) => ({ p, i }))
      .filter(({ p }) =>
        p.files.some((pf) => {
          const base = pf.replace(/\/$/, '');
          return f === pf || f === base || f.startsWith(base + '/') || base.endsWith('/' + f);
        }),
      )
      .map(({ i }) => i);
  const fileToPhase = {};
  const multiPhase = []; // 규칙 1 적용분 — { file, phases:[num...], assignedTo }
  const artifactFiles = []; // 규칙 2 후보 — 매핑 확정 후 편입 Phase 결정
  for (const f of codeFiles) {
    const m = matchOf(f);
    if (m.length === 1) {
      fileToPhase[f] = m[0];
    } else if (m.length > 1) {
      const earliest = Math.min(...m);
      fileToPhase[f] = earliest;
      multiPhase.push({ file: f, phases: m.map((i) => phases[i].num), assignedTo: phases[earliest].num });
    } else if (BUILD_ARTIFACT_RE.some((re) => re.test(f))) {
      artifactFiles.push(f);
    } else {
      return {
        ambiguous: true,
        reason: `Phase 미매핑: ${f}`,
        files: codeFiles,
        phases: phases.map((p) => ({ num: p.num, name: p.name, files: p.files })),
      };
    }
  }
  // 규칙 2 — 산출물 편입: 매핑된 그룹 중 마지막 Phase, 하나도 없으면 Dev Plan 마지막 Phase
  const autoAssigned = [];
  if (artifactFiles.length > 0) {
    const mappedIdx = Object.values(fileToPhase);
    const lastIdx = mappedIdx.length > 0 ? Math.max(...mappedIdx) : phases.length - 1;
    for (const f of artifactFiles) {
      fileToPhase[f] = lastIdx;
      autoAssigned.push({ file: f, assignedTo: phases[lastIdx].num });
    }
  }
  // 파일별 커밋 메시지 표기 (자동 편입의 근거를 커밋에 남김 — 코드가 몰래 정한 걸 드러낸다)
  const noteOf = {};
  for (const x of multiPhase) noteOf[x.file] = ` (Phase ${x.phases.join('·')} 변경 포함)`;
  for (const x of autoAssigned) noteOf[x.file] = ' (빌드 산출물 자동 편입)';
  // Phase별 그룹 → 순서대로 커밋
  const groups = new Map();
  for (const f of Object.keys(fileToPhase)) {
    const i = fileToPhase[f];
    if (!groups.has(i)) groups.set(i, []);
    groups.get(i).push(f);
  }
  const tag = TAG_OF[meta.type] || 'docs';
  const nnn = String(meta.taskNum).padStart(3, '0');
  const committed = [];
  for (const i of [...groups.keys()].sort((a, b) => a - b)) {
    const p = phases[i];
    const grp = groups.get(i);
    execFileSync('git', ['-C', wtPath, 'add', '--', ...grp], { stdio: 'pipe' });
    const msg =
      `${tag}: [TASK-${nnn}] Phase ${p.num} - ${p.name}\n\n` +
      grp.map((f) => `- ${f}${noteOf[f] || ''}`).join('\n') +
      `\n- 사유: ${p.name}`;
    execFileSync('git', ['-C', wtPath, 'commit', '-m', msg], { stdio: 'pipe' });
    committed.push({ phase: p.num, name: p.name, files: grp });
  }
  const result = { committed };
  if (multiPhase.length > 0) result.multiPhase = multiPhase;
  if (autoAssigned.length > 0) result.autoAssigned = autoAssigned;
  return result;
}

async function closeTask(mainWtPath, { taskNum }, opts = {}) {
  // 결정적 준비만 — 비가역(머지·정리)·충돌 해결은 스킬이 후속 수행.
  // 반환: { blocked } (게이트 미충족/매핑 모호) 또는
  //   { prepped, branch, parent, wtPath, registered, commits, aheadOfParent,
  //     multiPhase?, autoAssigned? (매핑 폴백 적용 시 내역) }. parent = 스킬 머지 대상.
  const active = getActiveTasks(mainWtPath).find((t) => t.taskNum === taskNum);
  if (!active) {
    throw new Error(`TASK-${String(taskNum).padStart(3, '0')} 진행중 브랜치 없음 (SSoT 조회).`);
  }
  const projectId = getProjectId(mainWtPath);
  const wtPath = getWorktreePath(projectId, { taskNum, src: active.src, slug: active.slug });
  const resolved = resolveTaskDocPath(mainWtPath, wtPath, { taskNum });
  if (!resolved) throw new Error(`TASK-${taskNum} 문서 못 찾음.`);

  const header = parseTaskHeader(resolved.file);
  // 부모 = 헤더 기록값(0.6.0, 구 문서는 'dev' 폴백). 메인 워크트리가 그 부모에 서 있어야
  // 스킬 후속 머지가 올바른 브랜치로 간다.
  const parent = header.parent;
  assertMainWorktreeOn(mainWtPath, parent);
  if (header.status !== 'tested') {
    return { blocked: 'status', current: header.status, docPath: resolved.file };
  }

  // Phase 커밋 (D2) — 코드 변경분만
  const split = splitUncommittedByPhase(wtPath, resolved.file, { taskNum, type: active.type });
  if (split.ambiguous) {
    return {
      blocked: 'mapping',
      reason: split.reason,
      files: split.files,
      phases: split.phases,
      wtPath,
      docPath: resolved.file,
    };
  }

  // status=closed (문서 위치 무관 — setStatus가 .gitignore 케이스 따라 처리)
  await setStatus(resolved.file, 'closed');

  const commits = [...split.committed];
  // 미등록 케이스: .project/ 변경분(flows / 문서 / changelog)을 커밋
  if (!resolved.registered) {
    const flows = _porcelainFiles(wtPath).filter((f) => f.startsWith('.project/flows/'));
    if (flows.length) {
      execFileSync('git', ['-C', wtPath, 'add', '--', ...flows], { stdio: 'pipe' });
      execFileSync(
        'git',
        ['-C', wtPath, 'commit', '-m', `docs: [TASK-${String(taskNum).padStart(3, '0')}] flows 갱신`],
        { stdio: 'pipe' },
      );
      commits.push({ phase: 'flows', files: flows });
    }
    const rest = _porcelainFiles(wtPath).filter((f) => f.startsWith('.project/'));
    if (rest.length) {
      execFileSync('git', ['-C', wtPath, 'add', '--', ...rest], { stdio: 'pipe' });
      execFileSync(
        'git',
        [
          '-C',
          wtPath,
          'commit',
          '-m',
          `docs: [TASK-${String(taskNum).padStart(3, '0')}] 태스크 문서 완료`,
        ],
        { stdio: 'pipe' },
      );
      commits.push({ phase: 'doc', files: rest });
    }
  }

  // 추적 마커 빈커밋 (부모보다 앞선 커밋 0개 — docs/분석 task + .project gitignore 케이스)
  const ahead = parseInt(
    gitCapture(wtPath, ['rev-list', '--count', `${parent}..HEAD`], { allowFail: true }) || '0',
    10,
  );
  if (ahead === 0) {
    execFileSync(
      'git',
      [
        '-C',
        wtPath,
        'commit',
        '--allow-empty',
        '-m',
        `docs: [TASK-${String(taskNum).padStart(3, '0')}] 추적 마커 — 코드 0·.project gitignore (채번 보존)`,
      ],
      { stdio: 'pipe' },
    );
    commits.push({ phase: 'marker', empty: true });
  }

  const aheadFinal = parseInt(
    gitCapture(wtPath, ['rev-list', '--count', `${parent}..HEAD`], { allowFail: true }) || '0',
    10,
  );
  const prepResult = {
    prepped: true,
    taskNum,
    branch: active.branch,
    parent,
    wtPath,
    registered: resolved.registered,
    docPath: resolved.file,
    commits,
    aheadOfParent: aheadFinal,
  };
  // 매핑 폴백 적용 내역 노출 — 코드가 자동 편입한 걸 스킬·사용자가 볼 수 있게
  if (split.multiPhase) prepResult.multiPhase = split.multiPhase;
  if (split.autoAssigned) prepResult.autoAssigned = split.autoAssigned;
  return prepResult;
}

module.exports = {
  LOCAL_SUFFIX,
  MANIFEST_NAME,
  // 멀티 플랫폼 (0.2.0+)
  PLATFORMS,
  DEFAULT_PLATFORMS,
  SHARED_DEST,
  platformOf,
  mapSharedDest,
  resolveInstallPlan,
  GITIGNORE_PATTERNS,
  gitignorePatternsFor,
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
  getInitLockPath,
  withMergeLock,
  withMetaLock,
  withMetaLockSync,
  currentBranch,
  assertMainWorktreeOn,
  parseBranchName,
  getActiveTasks,
  getNextTaskNumber,
  forkTask,
  computeNextPlanNumber,
  // 백로그 (0.1.2+)
  BACKLOG_PLACEHOLDER,
  getActiveVersion,
  setActivePlan,
  getBacklogPath,
  computeNextBLNumber,
  formatBacklogBlock,
  appendBacklogItem,
  parseBacklogItem,
  markBacklogChecked,
  // task 헤더 / 상태 전이 (코드화)
  TRANSITIONS,
  parseTaskHeader,
  isProjectRegistered,
  resolveTaskDocPath,
  setStatus,
  // task 문서 골격 (C1)
  DOC_TYPE_OF,
  scaffoldTaskDoc,
  // plan 생성 (C3)
  initPlan,
  // task close 결정적 준비 (D1·D2)
  TAG_OF,
  splitUncommittedByPhase,
  closeTask,
};
