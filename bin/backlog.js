#!/usr/bin/env node
// 활성 plan별 BACKLOG.md 조작 CLI — add(추가) / get(조회) / mark(확인 마킹) 묶음
/**
 * bin/backlog.js
 * `npx @angar2/taskery backlog-add|backlog-get|backlog-mark ...` — 백로그 조작.
 *
 * dispatcher(taskery.js)가 서브op(add|get|mark)를 첫 인자로 주입한다.
 *   add  --type <t> --title <제목> --slug <slug> --summary <개요> --target <대상영역>
 *        → withMetaLock + BL-NNN 채번 + append. stdout: { blNum, blId }
 *   get  <BL-NNN>          → 항목 메타 JSON ({ blId, status, type, title, slug, summary, target, taskNums }). 없으면 exit 1
 *   mark <BL-NNN> <TASK-NNN> → withMetaLock + [ ]→[x] + TASK 마크. stdout: { blId, taskNum }
 *
 * 채번·서식·락은 전부 코드(lib.js)가 보장 — LLM 손 파싱/Edit 제거.
 * 실패(인자 미달 / 활성 plan 부재 / 항목 없음 등) 시 stderr + exit 1.
 */

const path = require('path');

const {
  MANIFEST_NAME,
  readManifest,
  getMainWorktreePath,
  appendBacklogItem,
  parseBacklogItem,
  markBacklogChecked,
} = require('./lib');

function parseFlags(argv) {
  // --key value | --key=value 둘 다 지원. 정의된 키만 수집.
  const KEYS = ['type', 'title', 'slug', 'summary', 'target'];
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    let key;
    let val;
    if (eq !== -1) {
      key = a.slice(2, eq);
      val = a.slice(eq + 1);
    } else {
      key = a.slice(2);
      val = argv[++i];
    }
    if (KEYS.includes(key)) out[key] = val;
  }
  return out;
}

function parseTaskNum(token) {
  // 'TASK-007' | 'TASK-7' | '7' → 7
  const m = String(token).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : NaN;
}

function resolveMainWt() {
  let mainWt;
  try {
    mainWt = getMainWorktreePath();
  } catch (e) {
    console.error(`taskery backlog 실패: ${e.message}`);
    process.exit(1);
  }
  if (!readManifest(path.join(mainWt, MANIFEST_NAME))) {
    console.error(`${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`);
    process.exit(1);
  }
  return mainWt;
}

async function doAdd(rest) {
  const meta = parseFlags(rest);
  const missing = ['type', 'title', 'slug', 'summary', 'target'].filter((k) => !meta[k]);
  if (missing.length) {
    console.error(
      `사용법: npx @angar2/taskery backlog-add --type <t> --title <제목> --slug <slug> --summary <개요> --target <대상영역>`,
    );
    console.error(`누락: ${missing.map((k) => '--' + k).join(', ')}`);
    process.exit(1);
  }
  const mainWt = resolveMainWt();
  const blNum = await appendBacklogItem(mainWt, meta);
  const blId = `BL-${String(blNum).padStart(3, '0')}`;
  process.stdout.write(JSON.stringify({ blNum, blId }) + '\n');
}

function doGet(rest) {
  const blId = rest[0];
  if (!blId || !/^BL-\d+$/.test(blId)) {
    console.error(`사용법: npx @angar2/taskery backlog-get <BL-NNN>`);
    process.exit(1);
  }
  const mainWt = resolveMainWt();
  const item = parseBacklogItem(mainWt, blId);
  if (!item) {
    console.error(`${blId} 항목 없음.`);
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(item) + '\n');
}

async function doMark(rest) {
  const blId = rest[0];
  const taskNum = parseTaskNum(rest[1]);
  if (!blId || !/^BL-\d+$/.test(blId) || !Number.isInteger(taskNum)) {
    console.error(`사용법: npx @angar2/taskery backlog-mark <BL-NNN> <TASK-NNN>`);
    process.exit(1);
  }
  const mainWt = resolveMainWt();
  await markBacklogChecked(mainWt, blId, taskNum);
  process.stdout.write(JSON.stringify({ blId, taskNum }) + '\n');
}

async function main() {
  const op = process.argv[2];
  const rest = process.argv.slice(3);
  try {
    if (op === 'add') await doAdd(rest);
    else if (op === 'get') doGet(rest);
    else if (op === 'mark') await doMark(rest);
    else {
      console.error(`backlog: 알 수 없는 op '${op}' (add | get | mark)`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`taskery backlog-${op} 실패: ${e.message}`);
    process.exit(1);
  }
}

main();
