// 0.7.0 문서 체계 재편 마이그레이션 — update가 기존 설치본을 새 구조로 이행시킨다
/**
 * bin/migrate.js
 * `npx @angar2/taskery update`가 호출하는 0.7.0 이행 로직 모음.
 *
 * 이행 4종:
 *   1. ingestActivePlan  — 구형 AGENT-GUIDE.md '## 활성 plan 버전' → manifest.activePlan (1회)
 *   2. migrateEntryDocs  — 진입 문서 재편. 기존 CLAUDE.md/AGENTS.md의 *리포 값* 4섹션을 추출해
 *                          새 AGENTS.md에 주입하고, CLAUDE.md는 `@AGENTS.md` 한 줄로 축약.
 *                          **update 본 루프보다 먼저 실행하고, 처리한 경로를 본 루프에서 제외한다.**
 *                          본 루프에 맡기면 '사용자 customize 검출' 프롬프트가 뜨는데,
 *                          덮으면 리포 값이 .bak에만 남고 안 덮으면 구판 전문이 남아 새 판과 충돌한다.
 *   3. migrateGitignore  — AGENTS.md가 agnostic으로 바뀌어 모든 리포에 새로 깔리는데
 *                          .gitignore 기록은 init에만 있어 누락된다. 누락 패턴 append 제안.
 *   4. migrateTestGuide  — 폐지되는 TEST-GUIDE.md의 축적 내용을 TEST_RULE.local.md로 1회 이관.
 *
 * 원칙: 사용자 값은 절대 유실시키지 않는다. 추출 실패 시 어느 파일도 덮지 않고 `.new`로 보류한다.
 */

const fs = require('fs');
const path = require('path');

const { sha256, copyFile, gitignorePatternsFor } = require('./lib');

// 진입 문서에서 이식할 *리포 값* 섹션. 헤딩 텍스트 접두로 매칭한다 —
// 실제 문서의 헤딩은 '## 검수 실행 명령 (해당 시 — 앱 실행·검수가 필요한 프로젝트)'처럼
// 뒤에 부가 텍스트가 붙는다. 완전 일치를 요구하면 못 찾는다.
const REPO_VALUE_SECTIONS = ['프로젝트 메타', '검증 명령', '테스트 명령', '검수 실행 명령'];
// 이 중 없어도 이행을 계속하는 항목 — 앱 검수가 없는 프로젝트는 이 절을 지웠을 수 있다.
const OPTIONAL_SECTIONS = new Set(['검수 실행 명령']);
// 진입 문서 이행 완료 마커 — manifest에 기록해 재실행을 막는다.
const ENTRY_DOCS_MARKER = '0.7.0';

function isBefore070(version) {
  if (typeof version !== 'string') return true;
  const [maj = 0, min = 0] = version.split('.').map((n) => parseInt(n, 10) || 0);
  return maj < 1 && min < 7;
}

// 마크다운을 '## ' 헤딩 단위로 쪼개 { key, heading, body } 목록으로 만든다.
// 코드펜스 내부는 헤딩으로 보지 않는다 — 셸 주석(`## ...`)이 든 예시 블록을 헤딩으로 오인하면
// 그 뒤 본문이 조용히 잘려 사용자 값이 유실된다(경고도 안 뜬다).
function splitSections(content) {
  const lines = content.split('\n');
  const out = [];
  let cur = null;
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = inFence ? null : line.match(/^##\s+(.*)$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { heading: line, title: m[1].trim(), body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) out.push(cur);
  return out;
}

function findSectionBody(sections, key) {
  const hit = sections.find((s) => s.title.startsWith(key));
  if (!hit) return null;
  // 뒤쪽 빈 줄과 구분선(---)은 새 템플릿 쪽 서식을 쓰므로 떼어낸다.
  const body = hit.body.slice();
  while (body.length && (body[body.length - 1].trim() === '' || body[body.length - 1].trim() === '---')) {
    body.pop();
  }
  while (body.length && body[0].trim() === '') body.shift();
  return body.join('\n');
}

// 새 AGENTS.md 템플릿의 해당 섹션 본문을 추출한 값으로 갈아끼운다.
function injectSections(templateContent, extracted) {
  const lines = templateContent.split('\n');
  const heads = new Set();
  let fence = false;
  lines.forEach((l, idx) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    else if (!fence && /^##\s+/.test(l)) heads.add(idx);
  });
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const m = heads.has(i) ? lines[i].match(/^##\s+(.*)$/) : null;
    const key = m && REPO_VALUE_SECTIONS.find((k) => m[1].trim().startsWith(k));
    if (!key || extracted[key] == null) {
      out.push(lines[i]);
      i++;
      continue;
    }
    out.push(lines[i]); // 헤딩은 새 템플릿 것을 유지
    i++;
    // 기존 본문(다음 '## ' 직전까지)을 건너뛰면서, 끝의 빈 줄/구분선은 보존한다.
    const skipped = [];
    while (i < lines.length && !heads.has(i)) {
      skipped.push(lines[i]);
      i++;
    }
    const tail = [];
    while (skipped.length && (skipped[skipped.length - 1].trim() === '' || skipped[skipped.length - 1].trim() === '---')) {
      tail.unshift(skipped.pop());
    }
    out.push('', extracted[key], ...tail);
  }
  return out.join('\n');
}

/**
 * 1. 활성 plan 이식 — manifest.activePlan이 이미 있으면 그것을 그대로 보존한다.
 *    (update가 manifest를 새로 조립하므로 보존을 명시하지 않으면 매번 증발한다.)
 */
function ingestActivePlan(cwd, oldManifest) {
  if (oldManifest.activePlan) return { activePlan: oldManifest.activePlan, ingested: false };
  const guidePath = path.join(cwd, '.project', 'AGENT-GUIDE.md');
  if (!fs.existsSync(guidePath)) return { activePlan: null, ingested: false };
  const sec = fs.readFileSync(guidePath, 'utf8').match(/^##\s*활성 plan 버전[^\n]*\n+([^\n]+)/m);
  if (!sec) return { activePlan: null, ingested: false };
  const firstLine = sec[1].trim();
  if (!firstLine || firstLine.startsWith('<')) return { activePlan: null, ingested: false };
  return { activePlan: firstLine.split(/\s+/)[0], ingested: true };
}

/**
 * 2. 진입 문서 재편.
 * @returns {{ handled: string[], entries: object, notes: string[], held: boolean }}
 *   handled — update 본 루프에서 제외할 설치 경로
 *   entries — manifest.files에 기록할 항목 (설치 경로 → { hash, core, managed })
 */
function migrateEntryDocs(cwd, templateDir, platforms, oldManifest) {
  const notes = [];
  const entries = {};
  const skip = { handled: [], entries, notes, held: false, done: false };

  const agentsPath = path.join(cwd, 'AGENTS.md');
  const claudePath = path.join(cwd, 'CLAUDE.md');
  const hasAgents = fs.existsSync(agentsPath);
  const hasClaude = fs.existsSync(claudePath);
  if (!hasAgents && !hasClaude) return skip;

  // 이미 이행된 리포는 건너뛴다. 판정은 manifest 마커(ENTRY_DOCS_MARKER) 하나로만 한다.
  //  - 파일 구조로 추정하면 플랫폼별로 오판한다: codex 단독은 CLAUDE.md가 없어 "이행됨"으로 읽혀
  //    구판 AGENTS.md가 본 루프의 customize 프롬프트로 넘어가고 리포 값이 .bak에만 남았다.
  //  - 버전으로도 거르지 않는다: update는 이행이 보류(held)돼도 manifest 버전을 올리므로
  //    버전 게이트를 두면 보류된 리포가 영영 재시도되지 않는다("다음 update가 다시 시도합니다"가 거짓이 된다).
  //  - 신규 설치는 init이 마커를 박아 두므로 이 한 줄로 걸러진다.
  if (oldManifest.entryDocs === ENTRY_DOCS_MARKER) return skip;

  // 소스 선정: AGENTS.md 우선(양쪽은 미러라 값이 같다), 없으면 CLAUDE.md.
  const srcPath = hasAgents ? agentsPath : claudePath;
  const srcName = hasAgents ? 'AGENTS.md' : 'CLAUDE.md';
  const sections = splitSections(fs.readFileSync(srcPath, 'utf8'));

  const extracted = {};
  const missing = [];
  for (const key of REPO_VALUE_SECTIONS) {
    const body = findSectionBody(sections, key);
    if (body == null) missing.push(key);
    else extracted[key] = body;
  }
  const fatalMissing = missing.filter((k) => !OPTIONAL_SECTIONS.has(k));

  const newAgentsSrc = path.join(templateDir, 'AGENTS.md');
  const newAgents = fs.readFileSync(newAgentsSrc, 'utf8');

  if (fatalMissing.length > 0) {
    // 값 유실 방지 — 어느 파일도 덮지 않고 새 판을 .new로 남긴다. manifest도 갱신하지 않아
    // 다음 update가 다시 시도한다.
    fs.writeFileSync(path.join(cwd, 'AGENTS.md.new'), newAgents);
    notes.push(
      `⚠ 진입 문서 이행 보류 — ${srcName}에서 필수 섹션을 찾지 못함 (${fatalMissing.join(', ')}).`,
      `   새 판을 AGENTS.md.new 로 두었습니다. 리포 값을 직접 옮긴 후 AGENTS.md 로 바꿔주세요.`,
      `   (기존 파일은 그대로 보존되었고 manifest도 갱신하지 않아 다음 update가 다시 시도합니다.)`,
    );
    return { handled: ['AGENTS.md', 'CLAUDE.md'], entries, notes, held: true, done: false };
  }

  // AGENTS.md 생성 — 새 템플릿에 리포 값 주입.
  // .bak은 *최초 1회만* 남긴다 — 이미 있으면 그게 사용자의 원본이다. 덮으면 원본이 사라진다.
  if (fs.existsSync(agentsPath) && !fs.existsSync(agentsPath + '.bak')) {
    fs.copyFileSync(agentsPath, agentsPath + '.bak');
  }
  fs.writeFileSync(agentsPath, injectSections(newAgents, extracted));
  entries['AGENTS.md'] = { hash: sha256(newAgentsSrc), core: true, managed: true };

  const injectedCount = REPO_VALUE_SECTIONS.length - missing.length;
  notes.push(`진입 문서 재편 — ${srcName}에서 리포 값 ${injectedCount}개 섹션을 AGENTS.md로 이식.`);
  if (missing.length > 0) {
    notes.push(`   (없어서 새 템플릿 기본값으로 둔 절: ${missing.join(', ')})`);
  }

  const handled = ['AGENTS.md'];

  // CLAUDE.md는 `@AGENTS.md` 한 줄로 축약 (claude 플랫폼일 때만).
  if (platforms.includes('claude')) {
    const claudeSrc = path.join(templateDir, 'CLAUDE.md');
    if (hasClaude && !fs.existsSync(claudePath + '.bak')) {
      fs.copyFileSync(claudePath, claudePath + '.bak');
      notes.push(`   기존 CLAUDE.md는 CLAUDE.md.bak 으로 백업.`);
    }
    copyFile(claudeSrc, claudePath);
    entries['CLAUDE.md'] = { hash: sha256(claudeSrc), core: true, managed: true };
    handled.push('CLAUDE.md');
    notes.push(`   CLAUDE.md는 '@AGENTS.md' 임포트 한 줄로 축약.`);
  }

  return { handled, entries, notes, held: false, done: true };
}

/**
 * 3. .gitignore 누락 패턴 — 이미 taskery 패턴을 쓰는 리포에만 제안한다.
 *    (init에서 등록을 거부한 리포는 패턴이 하나도 없으므로 건드리지 않는다.)
 * @returns {{ missing: string[], apply: function }} — missing이 비면 제안 불필요
 */
function planGitignore(cwd, platforms) {
  const gitignorePath = path.join(cwd, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return { missing: [] };
  const wanted = gitignorePatternsFor(platforms);
  const existing = new Set(
    fs.readFileSync(gitignorePath, 'utf8').split('\n').map((l) => l.trim()),
  );
  const already = wanted.filter((p) => existing.has(p));
  if (already.length === 0) return { missing: [] }; // taskery 패턴 미사용 리포 — 선택 존중
  const missing = wanted.filter((p) => !existing.has(p));
  return {
    missing,
    apply() {
      fs.appendFileSync(gitignorePath, `\n${missing.join('\n')}\n`);
    },
  };
}

/**
 * 4. TEST-GUIDE.md → TEST_RULE.local.md 이관.
 *    폐지되는 문서라 그대로 두면 새 참조처들이 읽지 않아 축적 내용이 고아가 된다.
 *    원본은 지우지 않는다(사용자 파일 불가침).
 * @returns {{ available: boolean, apply: function }}
 */
function planTestGuide(cwd) {
  const guidePath = path.join(cwd, '.project', 'TEST-GUIDE.md');
  const localPath = path.join(cwd, '.project', 'rules', 'TEST_RULE.local.md');
  if (!fs.existsSync(guidePath)) return { available: false };
  if (fs.existsSync(localPath)) {
    // 둘 다 있으면 자동 병합하지 않는다(사용자 파일 훼손 위험). 다만 침묵하면
    // TEST-GUIDE에 쌓인 내용이 아무도 안 읽는 채로 남으므로 반드시 알린다.
    return { available: false, conflict: true };
  }
  return {
    available: true,
    apply() {
      const body = fs.readFileSync(guidePath, 'utf8');
      // 머리말만 새 역할에 맞게 갈아끼우고 본문(축적된 실행 경로)은 그대로 옮긴다.
      const stripped = body.replace(/^#\s*TEST-GUIDE[^\n]*\n(>[^\n]*\n)*/, '');
      const header = [
        '# TEST_RULE.local.md — 이 리포의 검증 규칙',
        '',
        '> 이 프로젝트에서 각 테스트 방식을 *실제로 어떻게 실행하나* + *무엇을 얼마나 검증하나*의 단일 소스.',
        '> `.project/TEST-GUIDE.md`(0.7.0에서 폐지)의 내용을 이관한 문서다. 구성과 의무는 `TASKERY_RULE` §8 참조.',
        '> `*.local.md`는 taskery update가 건드리지 않는다 — 이 리포가 소유한다.',
        '',
      ].join('\n');
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, header + stripped);
    },
  };
}

/**
 * 5. `.gitignore` 병합 — **덮어쓰기 금지.**
 *    template/.gitignore는 manifest 관리 자산이라 update의 '신규' 분기가 그대로 복사해버리는데,
 *    실사용 리포는 대부분 .gitignore를 manifest에 안 들고 있다(init 이전부터 있던 파일).
 *    그대로 두면 사용자의 node_modules·빌드 산출물·프로젝트 고유 무시 규칙이 통째로 사라진다.
 *    → 없으면 복사, 있으면 *빠진 줄만 덧붙인다*. 기존 줄은 절대 건드리지 않는다.
 * @returns {{ merged: boolean, added: string[] }}
 */
function mergeGitignore(srcPath, dstPath) {
  if (!fs.existsSync(dstPath)) {
    copyFile(srcPath, dstPath);
    return { merged: false, added: [] };
  }
  const cur = fs.readFileSync(dstPath, 'utf8');
  const have = new Set(cur.split('\n').map((l) => l.trim()));
  const added = fs
    .readFileSync(srcPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !have.has(l));
  if (added.length === 0) return { merged: true, added: [] };
  const lead = cur.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(dstPath, `${lead}\n# taskery 템플릿 추가분\n${added.join('\n')}\n`);
  return { merged: true, added };
}

module.exports = {
  ENTRY_DOCS_MARKER,
  mergeGitignore,
  isBefore070,
  splitSections,
  findSectionBody,
  injectSections,
  ingestActivePlan,
  migrateEntryDocs,
  planGitignore,
  planTestGuide,
};
