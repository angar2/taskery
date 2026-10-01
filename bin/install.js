// 설치·갱신이 함께 쓰는 도구 — 1.0이 설치하는 파일 목록, 설정 파일 병합, AGENTS.md 재조립, 질문 입력
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const L = require('./lib');

const TEMPLATE = path.resolve(__dirname, '..', 'template');
const PLATFORMS = ['claude', 'codex'];
// 1.0 스킬 중 지금 설치하는 것 — S2·S3에서 project-init·plan-init·add-backlog·log-friction·task-orche가 더해진다
const SKILLS = ['task-init', 'task-plan', 'task-dev', 'task-test', 'task-close'];
const RULES = ['TASKERY_RULE.md', 'GIT_RULE.md', 'TASK_DOC_RULE.md', 'CHANGELOG_RULE.md', 'MOCKUP_RULE.md'];
const SKILL_ROOT = { claude: '.claude/skills', codex: '.codex/skills' };

// kind: managed = 갱신 대상(사용자가 고쳤으면 묻는다) · agents = 프로젝트 절을 살려 재조립 · once = 없을 때만 만든다
function installPlan(platforms, { agnostic = true } = {}) {
  const plan = [];
  if (agnostic) {
    plan.push({ src: 'AGENTS.md', dst: 'AGENTS.md', kind: 'agents' });
    for (const r of RULES) plan.push({ src: `.project/rules/${r}`, dst: `.project/rules/${r}`, kind: 'managed' });
    plan.push({ src: '.project/BACKLOG.md', dst: '.project/BACKLOG.md', kind: 'once' });
  }
  for (const p of platforms) {
    if (p === 'claude') plan.push({ src: 'CLAUDE.md', dst: 'CLAUDE.md', kind: 'managed' });
    for (const s of SKILLS) plan.push({ src: `shared/skills/${s}/SKILL.md`, dst: `${SKILL_ROOT[p]}/${s}/SKILL.md`, kind: 'managed' });
  }
  return plan;
}

function hashText(text) {
  return 'sha256:' + crypto.createHash('sha256').update(text).digest('hex');
}

function readTemplate(rel) {
  return fs.readFileSync(path.join(TEMPLATE, rel), 'utf8');
}

function writeFile(main, rel, text) {
  const file = path.join(main, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// AGENTS.md 재조립 — 새 문안에 기존 파일의 `## 프로젝트` 절(project-init이 채운 값)을 그대로 옮긴다
function recomposeAgents(tpl, current) {
  const grab = (text) => {
    const m = text.match(/^## 프로젝트\n[\s\S]*?(?=^## |(?![\s\S]))/m);
    return m ? m[0] : null;
  };
  const keep = current && grab(current);
  const slot = grab(tpl);
  return keep && slot ? tpl.replace(slot, keep) : tpl;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    L.fail(`${file}을 JSON으로 읽지 못했다 — 고친 뒤 다시 부른다.`);
  }
}

// 플랫폼 설정 — Claude: 링크 너머 .project 쓰기 허용 + MCP 등록 / Codex: MCP 등록(자동 승인)
function writeConfigs(main, platforms) {
  const notes = [];
  const mcpEntry = { command: 'npx', args: ['-y', '@angar2/taskery', 'mcp'] };
  if (platforms.includes('claude')) {
    const sFile = path.join(main, '.claude', 'settings.json');
    const s = readJson(sFile, {});
    s.permissions = s.permissions || {};
    const dirs = s.permissions.additionalDirectories || [];
    const want = path.join(main, '.project');
    if (!dirs.includes(want)) {
      s.permissions.additionalDirectories = [...dirs, want];
      fs.mkdirSync(path.dirname(sFile), { recursive: true });
      fs.writeFileSync(sFile, JSON.stringify(s, null, 2) + '\n');
      notes.push('.claude/settings.json — 링크 너머 .project 쓰기 허용(additionalDirectories)');
    }
    const mFile = path.join(main, '.mcp.json');
    const m = readJson(mFile, { mcpServers: {} });
    m.mcpServers = m.mcpServers || {};
    if (!m.mcpServers.taskery) {
      m.mcpServers.taskery = mcpEntry;
      fs.writeFileSync(mFile, JSON.stringify(m, null, 2) + '\n');
      notes.push('.mcp.json — taskery MCP 서버 등록');
    }
  }
  if (platforms.includes('codex')) {
    const cFile = path.join(main, '.codex', 'config.toml');
    const cur = fs.existsSync(cFile) ? fs.readFileSync(cFile, 'utf8') : '';
    if (!/^\[mcp_servers\.taskery\]/m.test(cur)) {
      const block = [
        '[mcp_servers.taskery]',
        'command = "npx"',
        'args = ["-y", "@angar2/taskery", "mcp"]',
        'default_tools_approval_mode = "approve"',
        '',
      ].join('\n');
      fs.mkdirSync(path.dirname(cFile), { recursive: true });
      fs.writeFileSync(cFile, cur ? `${cur.replace(/\s*$/, '')}\n\n${block}` : block);
      notes.push('.codex/config.toml — taskery MCP 서버 등록(자동 승인 approve)');
    }
  }
  return notes;
}

// 질문 입력 — 표준 입력의 줄을 차례로 받는다. 입력이 끝났으면 기본값을 쓴다
function makeAsker() {
  const queue = [];
  const waiters = [];
  let closed = false;
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on('line', (line) => (waiters.length ? waiters.shift()(line) : queue.push(line)));
  rl.on('close', () => {
    closed = true;
    while (waiters.length) waiters.shift()(null);
  });
  return {
    ask(question, def) {
      process.stdout.write(question);
      return new Promise((resolve) => {
        const done = (line) => {
          const v = line == null || line.trim() === '' ? def : line.trim();
          if (line == null) process.stdout.write('\n');
          resolve(v);
        };
        if (queue.length) done(queue.shift());
        else if (closed) done(null);
        else waiters.push(done);
      });
    },
    close() {
      rl.close();
    },
  };
}

module.exports = { TEMPLATE, PLATFORMS, SKILLS, installPlan, hashText, readTemplate, writeFile, recomposeAgents, writeConfigs, makeAsker };
