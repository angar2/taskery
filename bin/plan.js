// plan-init — 잠금 안에서 다음 플랜 번호를 발급하고 plans/<NNN>_<slug>/PLAN.md 틀을 만든다(§5-3)
const fs = require('fs');
const path = require('path');
const L = require('./lib');

async function planInit(ctx, a) {
  const main = ctx.main;
  L.requireInstalled(main);
  const slug = a.slug;
  if (!slug) L.fail('plan-init: <slug>를 넣는다 — 영문 kebab-case (예: mvp, compare-products).');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) L.fail(`plan-init: '${slug}'는 영문 kebab-case가 아니다 (소문자·숫자·하이픈).`);
  const dir = path.join(main, '.project', 'plans');
  return L.withLock(main, 'number', async () => {
    const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const same = names.find((n) => n.replace(/^\d{3}_/, '') === slug);
    if (same) L.fail(`plan-init: 같은 slug의 플랜이 이미 있다: ${same}. 다른 slug를 쓴다.`);
    let max = 0;
    for (const n of names) {
      const m = n.match(/^(\d{3})_/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    const plan = `${L.pad(max + 1)}_${slug}`;
    const file = path.join(dir, plan, 'PLAN.md');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `# ${a.title || slug}\n\n## 목표\n\n## 태스크 목록\n`);
    return `플랜 ${plan}을 만들었다: ${file}\n다음: PLAN.md에 목표와 태스크 목록(한 줄 형식 '<항목 번호>. <한 줄 설명> — 선행: <항목 번호들 또는 없음>')을 적는다.`;
  });
}

module.exports = { planInit };
