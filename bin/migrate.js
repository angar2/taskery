// 0.7.0 문서 체계 재편 마이그레이션 — update가 기존 설치본을 새 구조로 이행시킨다
/**
 * bin/migrate.js
 * `npx @angar2/taskery update`가 호출하는 0.7.0 이행 로직 모음.
 *
 * 이행 4종:
 *   1. ingestActivePlan  — 구형 AGENT-GUIDE.md '## 활성 plan 버전' → manifest.activePlan (1회)
 *   2. recomposeEntryDocs — 진입 문서 **재조립**. 현 진입 문서(AGENTS.md, 없으면 구 CLAUDE.md)에서
 *                          리포 내용을 건져 새 AGENTS.md 템플릿에 끼워넣는다. 최초 이행 때는
 *                          CLAUDE.md를 `@AGENTS.md` 한 줄로 축약한다.
 *                          **매 update 항상 실행한다(1회성 아님).** AGENTS.md는 리포 값을 품어
 *                          템플릿과 바이트 일치가 원리적으로 불가능하므로, 본 루프의 복사 대상이
 *                          되어선 안 된다(0.7.0 결함: 이행 후 본 루프가 값을 통째로 덮거나,
 *                          거절하면 구판 문안에 영구 고착됐다).
 *                          **update 본 루프보다 먼저 실행하고, 처리한 경로를 본 루프에서 제외한다.**
 *   3. migrateGitignore  — AGENTS.md가 agnostic으로 바뀌어 모든 리포에 새로 깔리는데
 *                          .gitignore 기록은 init에만 있어 누락된다. 누락 패턴 append 제안.
 *   4. migrateTestGuide  — 폐지되는 TEST-GUIDE.md의 축적 내용을 TEST_RULE.local.md로 1회 이관.
 *
 * 원칙: 사용자 값은 절대 유실시키지 않는다. 추출 실패 시 어느 파일도 덮지 않고 `.new`로 보류한다.
 */

const fs = require('fs');
const path = require('path');

const { sha256, sha256Text, copyFile, gitignorePatternsFor } = require('./lib');
const { LEGACY_TEMPLATE_QUOTES } = require('./legacy-quotes');

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

// 문서를 { 머리말, 섹션[] }로 쪼갠다. splitSections와 달리 첫 '## ' 앞의 머리말을 버리지 않는다 —
// 재조립은 문서 전체를 다시 써내므로 머리말(제목·최상위 인용문)도 결과물에 들어가야 한다.
function parseDoc(content) {
  const preamble = [];
  const sections = [];
  let cur = null;
  let inFence = false;
  for (const line of content.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = inFence ? null : line.match(/^##\s+(.*)$/);
    if (m) {
      cur = { heading: line, title: m[1].trim(), body: [] };
      sections.push(cur);
    } else if (cur) {
      cur.body.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble, sections };
}

// taskery가 쓴 인용문 집합 = 과거 템플릿 전량(고정 목록) ∪ *현재* 템플릿(실시간 추출).
// 현재 템플릿을 함께 넣는 것이 핵심이다 — 그래야 다음 버전의 새 문안도 그 다음 update에서
// 자기 자신을 중복 없이 걷어낸다(목록을 손으로 관리하지 않아도 영구히 자기유지된다).
function boilerplateQuotes(templateContent) {
  const set = new Set(LEGACY_TEMPLATE_QUOTES.map((s) => s.trim()));
  for (const l of templateContent.split('\n')) {
    if (/^\s*>/.test(l)) set.add(l.trim());
  }
  return set;
}

// 우리가 수행한 파일 이름 변경 — 리포가 직접 쓴 문장 안의 죽은 경로를 대응 경로로 바꾼다.
// 1:1로 확정된 것만 넣는다(추측 치환 금지).
const DEAD_PATH_REWRITES = [['.project/TEST-GUIDE.md', '.project/rules/TEST_RULE.local.md']];

// 인용문 블록(헤딩 직후 연속된 '>' 줄)과 꼬리(끝의 빈 줄·구분선)를 템플릿 본문에서 뽑는다.
function splitTemplateBody(body) {
  let i = 0;
  while (i < body.length && body[i].trim() === '') i++;
  const quotes = [];
  while (i < body.length && /^\s*>/.test(body[i])) quotes.push(body[i++]);
  const tail = [];
  let j = body.length - 1;
  while (j >= i && (body[j].trim() === '' || body[j].trim() === '---')) tail.unshift(body[j--]);
  return { quotes, tail };
}

/**
 * AGENTS.md 재조립 — 새 템플릿의 지침 + 현 문서의 리포 내용.
 *
 * 절마다: 새 템플릿 헤딩 + 새 템플릿 인용문 + 현 문서 본문(단, taskery 인용문은 제거).
 * 값 줄·표·산문은 판정 대상이 아니라 전부 보존된다. 리포가 직접 쓴 인용문도 보존된다.
 *
 * @returns {{ content, kept, dropped, rewritten, omitted, missing }}
 *   kept — 보존한 리포 인용문 / dropped — 걷어낸 taskery 구 문안
 *   rewritten — 죽은 경로를 치환한 줄 / omitted — 현 문서에 없어 결과물에서 뺀 절
 *   missing — omitted 중 필수 절(호출자가 보류 판정에 쓴다)
 */
function composeAgentsDoc(currentContent, templateContent) {
  const tpl = parseDoc(templateContent);
  const cur = parseDoc(currentContent);
  const boiler = boilerplateQuotes(templateContent);
  const kept = [];
  const dropped = [];
  const rewritten = [];
  const omitted = [];
  const out = [...tpl.preamble];

  for (const sec of tpl.sections) {
    const key = REPO_VALUE_SECTIONS.find((k) => sec.title.startsWith(k));
    if (!key) {
      out.push(sec.heading, ...sec.body);
      continue;
    }
    const hit = cur.sections.find((s) => s.title.startsWith(key));
    const { quotes, tail } = splitTemplateBody(sec.body);
    if (!hit) {
      // 리포가 지운 절은 되살리지 않는다(삭제 의사 존중). 절 사이 구분선만 유지한다.
      omitted.push(key);
      out.push(...tail);
      continue;
    }
    const repoBody = [];
    for (const raw of hit.body) {
      const isQuote = /^\s*>/.test(raw);
      if (isQuote && boiler.has(raw.trim())) {
        dropped.push(raw.trim());
        continue;
      }
      let line = raw;
      for (const [from, to] of DEAD_PATH_REWRITES) {
        if (line.includes(from)) line = line.split(from).join(to);
      }
      if (line !== raw) rewritten.push({ before: raw.trim(), after: line.trim() });
      if (isQuote) kept.push(line.trim());
      repoBody.push(line);
    }
    while (repoBody.length && repoBody[0].trim() === '') repoBody.shift();
    while (
      repoBody.length &&
      (repoBody[repoBody.length - 1].trim() === '' || repoBody[repoBody.length - 1].trim() === '---')
    ) {
      repoBody.pop();
    }
    out.push(sec.heading);
    if (repoBody.length === 0) {
      // 절은 있는데 내용이 비었다 → 새 템플릿 본문(플레이스홀더)을 그대로 쓴다.
      out.push(...sec.body);
      continue;
    }
    if (quotes.length) out.push('', ...quotes);
    out.push('', ...repoBody, ...tail);
  }

  // 결과물에 실리지 않은 현 문서의 내용 — 리포 값 4개 절 *밖*에 사람이 적어 둔 줄이 여기 걸린다.
  // 그 자리는 taskery 소유라 템플릿 판으로 덮이는 것이 설계지만, 재조립은 매 update 도는 상시
  // 동작이므로 조용히 사라지면 안 된다. 버리되 반드시 알린다(.bak이 원본 참조처).
  const inResult = new Set(out.map((l) => l.trim()));
  const rewrittenBefore = new Set(rewritten.map((r) => r.before));
  const unmapped = [];
  for (const line of currentContent.split('\n')) {
    const l = line.trim();
    if (!l || l === '---') continue;
    if (inResult.has(l) || boiler.has(l) || rewrittenBefore.has(l)) continue;
    unmapped.push(l);
  }

  return {
    content: out.join('\n'),
    kept,
    dropped,
    rewritten,
    omitted,
    unmapped,
    missing: omitted.filter((k) => !OPTIONAL_SECTIONS.has(k)),
  };
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
function recomposeEntryDocs(cwd, templateDir, platforms, oldManifest) {
  const notes = [];
  const entries = {};
  const skip = { handled: [], entries, notes, held: false, done: false };

  const agentsPath = path.join(cwd, 'AGENTS.md');
  const claudePath = path.join(cwd, 'CLAUDE.md');
  const hasAgents = fs.existsSync(agentsPath);
  const hasClaude = fs.existsSync(claudePath);
  // 최초 이행 여부는 manifest 마커 하나로만 판정한다. 파일 구조로 추정하면 플랫폼별로 오판하고
  // (codex 단독은 CLAUDE.md가 없다), 버전으로 거르면 보류된 리포가 영영 재시도되지 않는다.
  const migrated = oldManifest.entryDocs === ENTRY_DOCS_MARKER;

  // 조립 소스: 현 AGENTS.md가 최우선(이행 후의 정상 경로). 없으면 미이행 리포의 구 CLAUDE.md.
  const srcPath = hasAgents ? agentsPath : hasClaude && !migrated ? claudePath : null;
  if (!srcPath) return skip; // 진입 문서 자체가 없음 → 본 루프의 '신규' 분기가 템플릿을 깐다
  const srcName = path.basename(srcPath);

  const newAgentsSrc = path.join(templateDir, 'AGENTS.md');
  const newAgents = fs.readFileSync(newAgentsSrc, 'utf8');
  const current = fs.readFileSync(srcPath, 'utf8');
  const composed = composeAgentsDoc(current, newAgents);

  // 최초 이행에서 필수 절을 못 찾으면 소스 판정이 틀렸다는 뜻이다 → 어느 파일도 덮지 않고 보류.
  // (이행 후의 필수 절 부재는 사용자가 지운 것이므로 보류하지 않고 그 삭제를 존중한다.)
  if (!migrated && composed.missing.length > 0) {
    fs.writeFileSync(path.join(cwd, 'AGENTS.md.new'), newAgents);
    notes.push(
      `⚠ 진입 문서 이행 보류 — ${srcName}에서 필수 섹션을 찾지 못함 (${composed.missing.join(', ')}).`,
      `   새 판을 AGENTS.md.new 로 두었습니다. 리포 값을 직접 옮긴 후 AGENTS.md 로 바꿔주세요.`,
      `   (기존 파일은 그대로 보존되었고 manifest도 갱신하지 않아 다음 update가 다시 시도합니다.)`,
    );
    return { handled: ['AGENTS.md', 'CLAUDE.md'], entries, notes, held: true, done: false };
  }

  // 결과물이 현 파일과 다를 때만 쓴다. .bak은 *최초 1회만* — 이미 있으면 그게 사용자의 원본이다.
  const changed = !hasAgents || composed.content !== current;
  if (changed) {
    if (hasAgents && !fs.existsSync(agentsPath + '.bak')) {
      fs.copyFileSync(agentsPath, agentsPath + '.bak');
      notes.push(`   직전 AGENTS.md는 AGENTS.md.bak 으로 백업.`);
    }
    fs.writeFileSync(agentsPath, composed.content);
  }
  // manifest에는 **조립 결과물**의 해시를 기록한다. 템플릿 원본 해시를 적으면 실제 파일과
  // 영구 불일치해 매 update마다 '사용자 customize' 오검출이 뜬다(0.7.0 결함).
  entries['AGENTS.md'] = { hash: sha256Text(composed.content), core: true, managed: true };

  if (!migrated) {
    notes.push(
      `진입 문서 재편 — ${srcName}의 리포 내용을 새 AGENTS.md로 재조립.`,
      `   구 문서의 taskery 지침 본문은 새 체계(.project/rules/)로 대체됩니다 — 원본은 ${srcName}.bak.`,
    );
  } else if (changed) {
    notes.push(`AGENTS.md 재조립 — 리포 내용 보존, taskery 지침만 새 판으로 교체.`);
  }
  if (changed) {
    if (composed.dropped.length) {
      notes.push(`   구 taskery 문안 ${composed.dropped.length}줄 제거(새 문안이 대체).`);
    }
    if (composed.kept.length) {
      notes.push(`   리포가 직접 쓴 인용문 ${composed.kept.length}줄 보존.`);
    }
    for (const r of composed.rewritten) {
      notes.push(`   경로 갱신: ${r.before}`);
      notes.push(`          → ${r.after}`);
    }
    if (composed.omitted.length) {
      notes.push(`   리포에 없어 결과물에서 뺀 절: ${composed.omitted.join(', ')} (되살리지 않음)`);
    }
    if (composed.unmapped.length && migrated) {
      // 리포 값 칸 밖의 내용은 AGENTS.md가 소유하지 않는다(TASKERY_RULE — 규칙은 rules/, 커스텀은 *.local.md).
      // 그래도 사람이 적어 둔 것이므로 전량을 보여주고 원본 위치를 알린다.
      // 최초 이행에서는 알리지 않는다 — 그때의 미반영분은 전량이 *구 taskery 문서 본문*이라
      // (0.6.1 기준 88줄) 경고가 아니라 노이즈다. 그 경우는 아래 한 줄과 .bak으로 갈음한다.
      notes.push(
        `   ⚠ 리포 값 칸(프로젝트 메타 · 각 명령) 밖의 아래 ${composed.unmapped.length}줄은 결과물에 싣지 않았습니다.`,
        `     그 자리는 taskery 지침 영역이라 새 판으로 교체됩니다. 남길 내용이면 값 칸이나 *.local.md로 옮기세요.`,
        `     (직전 원본: AGENTS.md.bak)`,
      );
      for (const l of composed.unmapped) notes.push(`       · ${l.length > 96 ? l.slice(0, 96) + '…' : l}`);
    }
  }

  const handled = ['AGENTS.md'];

  // CLAUDE.md는 `@AGENTS.md` 한 줄로 축약 — 최초 이행 때 1회(claude 플랫폼일 때만).
  // 이행 후에는 순수 템플릿 파일이라 본 루프가 정상 관리한다.
  if (!migrated && platforms.includes('claude')) {
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
 * 2-b. 구형 AGENT-GUIDE.md 정리 — 활성 plan이 manifest로 이관된 뒤에도 남아 있으면
 *      같은 정보를 두 곳에 보유하게 되고, manifest 값이 비는 순간 lib의 구형 폴백이
 *      낡은 값을 되살린다. 삭제는 하지 않고(사용자 파일 불가침) 이름을 바꿔 폴백 경로에서 뺀다.
 * @returns {string|null} 처리 안내 (해당 없으면 null)
 */
function retireLegacyAgentGuide(cwd, activePlan) {
  if (!activePlan) return null; // manifest가 아직 활성 plan을 못 들었으면 폴백을 남겨둔다
  const guidePath = path.join(cwd, '.project', 'AGENT-GUIDE.md');
  if (!fs.existsSync(guidePath)) return null;
  const retired = guidePath + '.obsolete';
  if (fs.existsSync(retired)) return null;
  fs.renameSync(guidePath, retired);
  return `구형 .project/AGENT-GUIDE.md 는 활성 plan이 manifest로 이관돼 역할이 끝났습니다 — AGENT-GUIDE.md.obsolete 로 이름 변경(내용 보존). 확인 후 삭제해도 됩니다.`;
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

// TEST_RULE.local.md 필수 절 골격(TASKERY_RULE §8) — 이관 본문에 없으면 append한다.
// 문안은 project-init 골격과 동일 유지. '방식별 실행 경로'는 이관 본문 자체가 그 내용이라 제외.
const TEST_RULE_REQUIRED_SECTIONS = [
  {
    key: '테스트 실행 환경',
    block: [
      '## 테스트 실행 환경 (격리 실행 경로)',
      '',
      '> 실제 앱을 띄워 UI를 자동 조작하는 스위트를 **사용자의 화면·마우스·키보드를 뺏지 않고** 돌리는 경로.',
      '> 여기가 비어 있으면 자동 게이트·격리 세션은 그 스위트를 실행하지 않고 사용자 승인을 받는다.',
      '> 적을 수 있는 것: 창 숨김·헤드리스 플래그 / 가상 디스플레이·컨테이너 / VM / CI 러너 위임 / 점유 스위트를 제외하는 한정 실행 옵션.',
      '> 결정 자체도 기록 대상 — 격리 경로를 두지 않기로 했다면 *"없음 — 매번 승인(사용자 결정 YYYY-MM-DD)"*로 적어 미결정 상태와 구분한다.',
      '',
      '<아직 미정 — 여기에 이 리포의 격리 실행 경로를 채운다>',
    ].join('\n'),
  },
  {
    key: '범위·방식 정책',
    block: [
      '## 범위·방식 정책',
      '',
      '> 무엇을 얼마나 검증하나 — 수정 루프에서의 실행 범위, 테스트 신설 상한 등.',
      '',
      '<아직 미정 — 여기에 이 리포의 범위 정책을 채운다>',
    ].join('\n'),
  },
];

/**
 * 4. TEST-GUIDE.md → TEST_RULE.local.md 이관.
 *    폐지되는 문서라 그대로 두면 새 참조처들이 읽지 않아 축적 내용이 고아가 된다.
 *    원본은 지우지 않는다(사용자 파일 불가침).
 * @returns {{ available: boolean, apply: function }} — apply()는 append한 필수 절 key 목록을 반환
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
      // 필수 절 골격 보강 — TEST-GUIDE에는 없던 절(TASKERY_RULE §8)이라 이관만으로는 빠진다.
      // 헤딩은 접두 일치로 검사한다(완전 일치 요구 금지 — 뒤에 부가 텍스트가 붙는다).
      const titles = splitSections(stripped).map((s) => s.title);
      const appended = TEST_RULE_REQUIRED_SECTIONS.filter(
        (sec) => !titles.some((t) => t.startsWith(sec.key)),
      );
      const tail = appended.length
        ? `${stripped.endsWith('\n') ? '' : '\n'}\n${appended.map((s) => s.block).join('\n\n')}\n`
        : '';
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, header + stripped + tail);
      return appended.map((s) => s.key);
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
  parseDoc,
  boilerplateQuotes,
  composeAgentsDoc,
  ingestActivePlan,
  retireLegacyAgentGuide,
  recomposeEntryDocs,
  planGitignore,
  planTestGuide,
};
