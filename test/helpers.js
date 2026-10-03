// 테스트 도우미 — os.tmpdir() 아래 임시 리포·임시 HOME을 만들고 taskery CLI를 부른다(Orca 환경 변수는 지운다)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const BIN = path.resolve(__dirname, '..', 'bin', 'taskery.js');

function cleanEnv(extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('ORCA_')) env[k] = v;
  return {
    ...env,
    GIT_AUTHOR_NAME: 'tester',
    GIT_AUTHOR_EMAIL: 'tester@example.com',
    GIT_COMMITTER_NAME: 'tester',
    GIT_COMMITTER_EMAIL: 'tester@example.com',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    ...extra,
  };
}

// 임시 작업 공간 하나 — root/home(HOME), root/repo(본진)
function sandbox() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'taskery-test-')));
  const home = path.join(root, 'home');
  const repo = path.join(root, 'repo');
  fs.mkdirSync(home);
  fs.mkdirSync(repo);
  const env = cleanEnv({ HOME: home });
  const sb = {
    root,
    home,
    repo,
    env,
    // taskery CLI 실행 → { code, out, err }
    tk(args, { cwd = repo, input = '', extraEnv = {} } = {}) {
      const r = spawnSync(process.execPath, [BIN, ...args], { cwd, input, env: { ...sb.env, ...extraEnv }, encoding: 'utf8' });
      return { code: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr };
    },
    ok(args, opts) {
      const r = sb.tk(args, opts);
      if (r.code !== 0) throw new Error(`taskery ${args.join(' ')} 실패(${r.code}):\n${r.all}`);
      return r.out;
    },
    git(args, cwd = repo) {
      return execFileSync('git', ['-C', cwd, ...args], { env: sb.env, encoding: 'utf8' }).trim();
    },
    write(rel, text, base = repo) {
      const f = path.join(base, rel);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, text);
    },
    read(rel, base = repo) {
      return fs.readFileSync(path.join(base, rel), 'utf8');
    },
    state(num) {
      return JSON.parse(fs.readFileSync(path.join(repo, '.taskery', '.state', 'tasks', `${String(num).padStart(3, '0')}.json`), 'utf8'));
    },
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
  return sb;
}

// 빈 폴더에 init + 플랜 하나 + 코드 하나가 있는 리포
function installedRepo({ platform = '1', codeTest = ['true'] } = {}) {
  const sb = sandbox();
  sb.ok(['init'], { input: `${platform}\n` });
  sb.ok(['plan-init', 'mvp', '--title', 'MVP']);
  sb.write('.taskery/plans/001_mvp/PLAN.md', '# MVP\n\n## 목표\n시험\n\n## 태스크 목록\n1. 첫 기능 — 선행: 없음\n2. 둘째 기능 — 선행: 1\n');
  sb.write('src/app.txt', 'hello\n');
  sb.git(['add', '-A']);
  sb.git(['commit', '-q', '-m', 'chore: 시작 코드']);
  if (codeTest) sb.ok(['test-code', '--register', ...codeTest]);
  return sb;
}

// 태스크 문서의 판단 칸을 채운다(1.0.1 절 — 요구사항 첫 줄 목표·개발 계획·테스트 계획)
function fillDoc(sb, num, { goal = '목표 한 줄', files = ['src/app.txt'], criteria = ['[AUTO] 앱 → 실행 → hello가 보인다'], phases = null } = {}) {
  const st = sb.state(num);
  let text = sb.read(st.doc);
  const put = (title, body) => {
    text = text.replace(`## ${title}\n`, `## ${title}\n${body}\n`);
  };
  put('요구사항', goal);
  put('테스트 계획', criteria.map((c, i) => `${i + 1}. ${c}`).join('\n'));
  put(
    '개발 계획',
    phases
      ? phases.map((p, i) => `### Phase ${i + 1} — ${p.name}\n- 파일: ${p.files.map((f) => `\`${f}\``).join(', ')}\n- 사유: ${p.reason}\n`).join('\n')
      : files.map((f) => `- \`${f}\``).join('\n'),
  );
  sb.write(st.doc, text);
}

// 1.0.0 모양 문서로 바꿔 쓴다(호환 시험용) — 메타 줄·목표·(medium) 요구사항·완료 기준·만질 파일·(medium) Phase
function writeDocV100(sb, num, { goal = '목표 한 줄', files = ['src/app.txt'], criteria = ['[AUTO] 앱 → 실행 → hello가 보인다'], phases = null, requirements = null } = {}) {
  const st = sb.state(num);
  const out = [
    `# TASK-${String(num).padStart(3, '0')} ${st.title}`,
    `<!-- taskery: plan=${st.plan} type=${st.type} size=${st.size} switch=${st.switch.join(',')} range=${st.range} parent=${st.parent} by=${st.by} -->`,
    '',
    '| 시작·기획 | 개발 | 테스트 | 닫기 |',
    '|---|---|---|---|',
    '| ⏳ | – | – | – |',
    '',
    '## 목표',
    goal,
    '',
  ];
  if (requirements) out.push('## 요구사항', requirements, '');
  out.push('## 완료 기준', criteria.map((c, i) => `${i + 1}. ${c}`).join('\n'), '');
  out.push('## 만질 파일', files.map((f) => `- \`${f}\``).join('\n'), '');
  if (phases) {
    out.push('## Phase', phases.map((p, i) => `### Phase ${i + 1} — ${p.name}\n- 파일: ${p.files.map((f) => `\`${f}\``).join(', ')}\n- 사유: ${p.reason}\n`).join('\n'), '');
  }
  out.push('## 결정', '', '## 결과', '');
  sb.write(st.doc, out.join('\n'));
}

module.exports = { sandbox, installedRepo, fillDoc, writeDocV100, cleanEnv, BIN };
