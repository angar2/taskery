// prune — 닫힌 태스크에 남은 워크트리·브랜치를 정리한다. 기본은 항목마다 묻고, --yes면 묻지 않는다(§5-3)
const fs = require('fs');
const L = require('./lib');
const { cleanup } = require('./finish');

// 닫혔는데 워크트리나 브랜치가 남은 태스크
function leftovers(main) {
  return L.listStates(main).filter(
    (st) => st.closed && !st.noBranch && ((st.worktree && fs.existsSync(st.worktree)) || L.branchExists(main, st.branch)),
  );
}

function describe(main, st) {
  const parts = [];
  if (st.worktree && fs.existsSync(st.worktree)) {
    const dirty = L.changedFiles(st.worktree);
    parts.push(`워크트리 ${st.worktree}${dirty.length ? ` — 커밋 안 된 변경 ${dirty.length}개` : ''}`);
  }
  if (L.branchExists(main, st.branch)) {
    parts.push(`브랜치 ${st.branch}${L.isAncestor(main, st.branch, st.parent) ? '' : ' — 부모에 병합되지 않음'}`);
  }
  return `${L.taskLabel(st.num)} ${st.title} (${st.closed.finished ? '끝난 태스크' : '포기'}): ${parts.join(' · ')}`;
}

async function prune(ctx, a) {
  const main = ctx.main;
  L.requireInstalled(main);
  L.git(main, ['worktree', 'prune']);
  const items = leftovers(main);
  if (!items.length) return '정리할 것 없음 — 닫힌 태스크에 남은 워크트리·브랜치가 없다.';
  const out = [];
  let asked = false;
  for (const st of items) {
    const line = describe(main, st);
    if (st.worktree && fs.existsSync(st.worktree) && L.changedFiles(st.worktree).length) {
      out.push(`건너뜀: ${line}`);
      continue;
    }
    if (!a.yes) {
      if (!ctx.ask) {
        out.push(`남음: ${line}`);
        continue;
      }
      asked = true;
      const ans = await ctx.ask(`${line}\n  정리할까? (y/N) `, 'n');
      if (String(ans).toLowerCase() !== 'y') {
        out.push(`보존: ${line}`);
        continue;
      }
    }
    out.push(`${L.taskLabel(st.num)}:`, ...cleanup(main, st, { force: true }).map((n) => `  - ${n}`));
  }
  if (!a.yes && !asked && !ctx.ask) {
    out.push('묻지 않고 정리하려면 사용자가 명시했을 때 --yes로 다시 부른다(커밋 안 된 변경이 있는 곳은 그래도 건너뛴다).');
  }
  return out.join('\n');
}

module.exports = { prune };
