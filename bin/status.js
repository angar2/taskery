// status — 열린 태스크·단계 표·단계별 시간·문서 경로·워크트리 경로(§5-3)
const path = require('path');
const L = require('./lib');

const HEAD = ['시작·기획', '개발', '테스트', '닫기'];

async function status(ctx) {
  const main = ctx.main;
  L.requireInstalled(main);
  const open = L.listStates(main).filter((s) => !s.closed);
  if (!open.length) return `열린 태스크 없음. (본진: ${main})`;
  const out = [`열린 태스크 ${open.length}개 (본진: ${main})`];
  for (const st of open) {
    const cells = L.stageCells(st);
    out.push('');
    out.push(`${L.taskLabel(st.num)} ${st.title}`);
    out.push(`- 플랜 ${st.plan}${st.item ? ` 항목 ${st.item}` : ''} · ${st.type} · ${st.size} · 스위치 ${st.switch.join(',')} · 범위 ${st.range}`);
    out.push(`- 단계: ${HEAD.map((h, i) => `${h} ${cells[i]}`).join(' | ')}`);
    out.push(`- 문서: ${path.join(main, st.doc)}`);
    if (st.noBranch) out.push(`- 워크트리: 없음 — 분기 생략(--no-branch), 본진 ${st.parent}에서 일한다`);
    else if (st.noWorktree) out.push(`- 워크트리: 없음 — 분기 생략(--no-worktree), 본진에서 브랜치 ${st.branch}로 일한다`);
    else out.push(`- 워크트리: ${st.worktree} (브랜치 ${st.branch})`);
  }
  return out.join('\n');
}

module.exports = { status };
