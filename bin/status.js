// status — 열린 태스크·단계 표·단계별 시간·문서 경로·워크트리 경로, 플랜별 시작할 수 있는 태스크·읽지 못한 항목(§5-3)
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const { parsePlanItems } = require('./plan');

const HEAD = ['시작·기획', '개발', '테스트', '닫기'];

function openTasks(main, open) {
  if (!open.length) return [`열린 태스크 없음. (본진: ${main})`];
  const out = [`열린 태스크 ${open.length}개 (본진: ${main})`];
  for (const st of open) {
    const cells = L.stageCells(st);
    out.push('');
    out.push(`${L.taskLabel(st.num)} ${st.title}`);
    out.push(`- 플랜 ${st.plan}${st.item ? ` 항목 ${st.item}` : ''} · ${st.type} · ${st.size} · 스위치 ${st.switch.join(',')} · 범위 ${st.range}`);
    out.push(`- 단계: ${HEAD.map((h, i) => `${h} ${cells[i]}`).join(' | ')}`);
    out.push(`- 문서: ${L.docShown(main, st)}`);
    if (st.noBranch) out.push(`- 워크트리: 없음 — 분기 생략(--no-branch), 본진 ${st.parent}에서 일한다`);
    else if (st.noWorktree) out.push(`- 워크트리: 없음 — 분기 생략(--no-worktree), 본진에서 브랜치 ${st.branch}로 일한다`);
    else out.push(`- 워크트리: ${st.worktree} (브랜치 ${st.branch})`);
  }
  return out;
}

// 플랜 하나의 시작할 수 있는 항목 — 끝나지 않았고, 열린 태스크가 없고, 선행 항목이 모두 끝난 것(§5-3)
function planLines(main, plan, byNum) {
  const { items, unreadable, noList } = parsePlanItems(fs.readFileSync(path.join(main, '.taskery', 'plans', plan, 'PLAN.md'), 'utf8'));
  if (noList) return [`- ${plan}: \`## 태스크 목록\`이 없다`];
  const index = new Map(items.map((it) => [it.num, it]));
  // 항목이 끝났다 = 가장 최근 연결된 태스크가 끝난 태스크(마무리 기록이 있고 닫힘)
  const done = (it) => {
    const st = it.tasks.length ? byNum.get(it.tasks[it.tasks.length - 1]) : null;
    return !!(st && st.closed && st.closed.finished);
  };
  const ready = [];
  for (const it of items) {
    const missing = it.pre.filter((n) => !index.has(n));
    if (missing.length) {
      unreadable.push(`${it.line} (선행 항목 ${missing.join(', ')}이 목록에 없다)`);
      continue;
    }
    const busy = it.tasks.some((n) => byNum.has(n) && !byNum.get(n).closed);
    if (!done(it) && !busy && it.pre.every((n) => done(index.get(n)))) ready.push(`${it.num}. ${it.desc}`);
  }
  const out = [`- ${plan}: ${ready.length ? ready.join(' · ') : '없음'}`];
  for (const u of unreadable) out.push(`  - 읽지 못한 항목(시작할 수 있는 태스크에서 뺐다): ${u}`);
  return out;
}

async function status(ctx) {
  const main = ctx.main;
  L.requireInstalled(main);
  const states = L.listStates(main);
  const out = openTasks(
    main,
    states.filter((s) => !s.closed),
  );
  const dir = path.join(main, '.taskery', 'plans');
  const plans = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'PLAN.md'))).sort() : [];
  if (plans.length) {
    const byNum = new Map(states.map((s) => [s.num, s]));
    out.push('', '플랜별 시작할 수 있는 태스크 (PLAN.md 목록 항목)');
    for (const plan of plans) out.push(...planLines(main, plan, byNum));
  }
  return out.join('\n');
}

module.exports = { status };
