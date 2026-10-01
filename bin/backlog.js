// backlog-add · backlog-get · backlog-mark — 프로젝트 백로그 하나(.project/BACKLOG.md, 부록 B)를 명령이 다룬다(§5-3, §6-3)
// BACKLOG.md 쓰기는 모두 번호 잠금 안에서 한다 — prepare-task --from·close-task도 같은 잠금 안에서 아래 텍스트 함수를 부른다
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const OPEN = '## 열린 항목';
const DONE = '## 끝난 항목';
const NONE = '–';

function backlogFile(main) {
  return path.join(main, '.project', 'BACKLOG.md');
}

// BACKLOG.md가 없으면 설치 직후 모습(부록 B)으로 만든다
function readBacklog(main) {
  const file = backlogFile(main);
  if (!fs.existsSync(file)) {
    const tpl = fs.readFileSync(path.resolve(__dirname, '..', 'template', '.project', 'BACKLOG.md'), 'utf8');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, tpl);
  }
  return fs.readFileSync(file, 'utf8');
}

function writeBacklog(main, text) {
  fs.writeFileSync(backlogFile(main), text);
}

function parseBlNum(token) {
  const m = String(token || '').trim().match(/^(?:BL-?)?(\d+)$/i);
  if (!m) L.fail(`백로그 번호를 읽지 못했다: '${token}'. 'BL-3'이나 '3'처럼 넘긴다.`);
  return parseInt(m[1], 10);
}

// 항목 블록 = `### BL-N` 줄부터 다음 `### `·`## ` 줄 앞까지(뒤 빈 줄 포함)
function parse(lines) {
  const items = [];
  let sectionName = null;
  let cur = null;
  lines.forEach((l, i) => {
    if (/^## /.test(l)) {
      if (cur) cur.end = i;
      cur = null;
      sectionName = l.trim() === OPEN ? 'open' : l.trim() === DONE ? 'done' : null;
      return;
    }
    if (/^### /.test(l)) {
      if (cur) cur.end = i;
      cur = null;
      const m = l.match(/^### BL-(\d+)\b\s*(?:\[([^\]]*)\])?\s*(.*)$/);
      if (m) {
        cur = { num: parseInt(m[1], 10), type: (m[2] || '').trim(), title: m[3].trim(), start: i, end: lines.length, section: sectionName };
        items.push(cur);
      }
    }
  });
  return items;
}

const FIELD = (name) => new RegExp(`^- ${name}\\s*:\\s*(.*)$`);

function getField(lines, item, name) {
  for (let i = item.start + 1; i < item.end; i++) {
    const m = lines[i].match(FIELD(name));
    if (m) return m[1].trim();
  }
  return null;
}

// 칸 값을 바꾼다. 칸이 없으면 항목의 마지막 칸 줄 뒤에 넣는다
function setField(lines, item, name, value) {
  let last = item.start;
  for (let i = item.start + 1; i < item.end; i++) {
    if (FIELD(name).test(lines[i])) {
      lines[i] = `- ${name}: ${value}`;
      return;
    }
    if (lines[i].trim()) last = i;
  }
  lines.splice(last + 1, 0, `- ${name}: ${value}`);
  item.end++;
}

// 섹션 머리 줄 번호. 없으면 파일 끝에 만든다(끝난 항목은 열린 항목 뒤)
function ensureSection(lines, title) {
  let i = lines.findIndex((l) => l.trim() === title);
  if (i !== -1) return i;
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  lines.push('', title, '');
  return lines.length - 2;
}

// 섹션 맨 위(머리 줄과 빈 줄 하나 뒤)에 항목 블록을 넣는다
function insertTop(lines, title, block) {
  const h = ensureSection(lines, title);
  let at = h + 1;
  if (lines[at] !== undefined && lines[at].trim() === '') at++;
  else lines.splice(at++, 0, '');
  const body = block.slice();
  while (body.length && body[body.length - 1].trim() === '') body.pop();
  lines.splice(at, 0, ...body, '');
}

function moveTo(lines, item, title) {
  const block = lines.splice(item.start, item.end - item.start);
  insertTop(lines, title, block);
}

function findItem(lines, num) {
  const item = parse(lines).find((it) => it.num === num);
  if (!item) L.fail(`BACKLOG.md에 BL-${num}이 없다. 'backlog-get'으로 열린 항목 번호를 확인한다.`);
  return item;
}

function linkTokens(value) {
  if (!value || value === NONE || value === '-') return [];
  return value.split(/\s*,\s*/).filter(Boolean);
}

// 태스크를 항목에 잇는다 — 연결 태스크 칸에 더하고 상태를 진행으로. 끝난 항목이면 열린 항목으로 되돌린다(§5-3)
function linkText(text, num, label) {
  const lines = text.split('\n');
  const item = findItem(lines, num);
  const tokens = linkTokens(getField(lines, item, '연결 태스크'));
  if (!tokens.some((t) => t.split(/\s/)[0] === label)) tokens.push(label);
  setField(lines, item, '연결 태스크', tokens.join(', '));
  setField(lines, item, '상태', '진행');
  const reopened = item.section === 'done';
  if (reopened) moveTo(lines, item, OPEN);
  return { text: lines.join('\n'), reopened };
}

// 닫힌 태스크의 연결 표시 — (완료)·(포기). 연결 태스크가 모두 닫히면 끝난 항목으로 옮기거나 대기로 되돌린다(§5-3)
function closeText(text, label, finished) {
  const lines = text.split('\n');
  const notes = [];
  for (const { num } of parse(lines)) {
    const item = parse(lines).find((it) => it.num === num);
    const tokens = linkTokens(getField(lines, item, '연결 태스크'));
    let hit = false;
    const next = tokens.map((t) => {
      if (t === label) {
        hit = true;
        return `${label} (${finished ? '완료' : '포기'})`;
      }
      return t;
    });
    if (!hit) continue;
    setField(lines, item, '연결 태스크', next.join(', '));
    if (next.every((t) => /\((완료|포기)\)$/.test(t))) {
      if (next.some((t) => t.endsWith('(완료)'))) {
        setField(lines, item, '상태', '완료');
        if (item.section !== 'done') moveTo(lines, item, DONE);
        notes.push(`BL-${num} — 연결 태스크가 모두 닫혀 끝난 항목으로 옮겼다`);
      } else {
        setField(lines, item, '상태', '대기');
        notes.push(`BL-${num} — 연결 태스크가 모두 포기로 닫혀 대기로 되돌렸다`);
      }
    } else {
      notes.push(`BL-${num} — ${label} ${finished ? '(완료)' : '(포기)'} 표시`);
    }
  }
  return { text: lines.join('\n'), notes };
}

function itemText(lines, item) {
  const block = lines.slice(item.start, item.end);
  while (block.length && block[block.length - 1].trim() === '') block.pop();
  return block.join('\n');
}

// --from 목록 → 번호 배열. 없는 번호는 거부한다(태스크를 만들기 전에 확인)
function parseFromList(main, from) {
  const nums = String(from)
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(parseBlNum);
  const have = new Set(parse(readBacklog(main).split('\n')).map((it) => it.num));
  const missing = nums.filter((n) => !have.has(n));
  if (missing.length) L.fail(`prepare-task: --from의 ${missing.map((n) => `BL-${n}`).join(', ')}이 BACKLOG.md에 없다. 'backlog-get'으로 번호를 확인한다.`);
  return [...new Set(nums)];
}

// prepare-task·backlog-mark가 부른다(번호 잠금 안)
function linkTasks(main, nums, label) {
  let text = readBacklog(main);
  const notes = [];
  for (const n of nums) {
    const r = linkText(text, n, label);
    text = r.text;
    if (r.reopened) notes.push(`BL-${n}은 끝난 항목이었다 — 열린 항목으로 되돌리고 진행으로 바꿨다`);
  }
  writeBacklog(main, text);
  return notes;
}

// close-task가 부른다(번호 잠금 안)
function markClosed(main, label, finished) {
  if (!fs.existsSync(backlogFile(main))) return [];
  const { text, notes } = closeText(readBacklog(main), label, finished);
  if (notes.length) writeBacklog(main, text);
  return notes;
}

async function backlogAdd(ctx, a) {
  const main = ctx.main;
  L.requireInstalled(main);
  const title = String(a.title || '').trim();
  if (!title) L.fail('backlog-add: <제목>을 넣는다 — 무엇이 문제인지, 또는 무엇을 원하는지 한 줄.');
  if (a.type && !L.TYPES.includes(a.type)) L.fail(`backlog-add: --type '${a.type}'을 모른다. ${L.TYPES.join(' · ')} 중 하나를 넣는다.`);
  return L.withLock(main, 'number', async () => {
    const lines = readBacklog(main).split('\n');
    const num = parse(lines).reduce((m, it) => Math.max(m, it.num), 0) + 1;
    const block = [
      `### BL-${num} [${a.type || '<종류>'}] ${title}`,
      '- 상태: 대기',
      `- 등록: ${L.todayLocal()}`,
      '- 현상: <현상>',
      `- 연결 태스크: ${NONE}`,
    ];
    insertTop(lines, OPEN, block);
    writeBacklog(main, lines.join('\n'));
    const left = a.type ? '현상' : '종류·현상';
    return `BL-${num}을 ${backlogFile(main)}의 열린 항목 맨 위에 넣었다.\n다음: 필수 칸(${left})의 <…>를 채운다. 선택 칸은 근거가 있을 때만 줄을 더해 적는다.`;
  });
}

async function backlogGet(ctx, a) {
  const main = ctx.main;
  L.requireInstalled(main);
  const lines = readBacklog(main).split('\n');
  if (a.id) {
    const item = findItem(lines, parseBlNum(a.id));
    return itemText(lines, item);
  }
  const open = parse(lines).filter((it) => it.section === 'open');
  if (!open.length) return '열린 항목 없음.';
  return [
    `열린 항목 ${open.length}개 (${backlogFile(main)})`,
    ...open.map((it) => `- BL-${it.num} [${it.type || '?'}] ${it.title} — ${getField(lines, it, '상태') || '?'}`),
  ].join('\n');
}

async function backlogMark(ctx, a) {
  const main = ctx.main;
  L.requireInstalled(main);
  if (!a.id) L.fail('backlog-mark: <BL-번호>와 <TASK>를 넣는다. 예: backlog-mark BL-3 TASK-012');
  const num = parseBlNum(a.id);
  const st = L.readState(main, L.parseTaskNum(a.task));
  const label = L.taskLabel(st.num);
  return L.withLock(main, 'number', async () => {
    const notes = linkTasks(main, [num], label);
    return [`BL-${num}에 ${label}을 연결했다 — 상태 진행.`, ...notes].join('\n');
  });
}

module.exports = { backlogAdd, backlogGet, backlogMark, parseFromList, linkTasks, markClosed, parseBlNum };
