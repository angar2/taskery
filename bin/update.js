#!/usr/bin/env node
// update — 설치된 taskery 파일을 이 버전으로 갱신한다. 사용자가 고친 파일은 묻고, AGENTS.md는 프로젝트 절을 살려 재조립한다
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const I = require('./install');

async function main() {
  const cwd = process.cwd();
  const main = L.findMain(cwd);
  const manifest = L.readManifest(main);
  if (!manifest) L.fail("update: taskery가 설치돼 있지 않다. 'npx @angar2/taskery init'을 먼저 부른다.");
  // 1.0은 훅을 설치하지 않는다 — 매니페스트에 훅이 있으면 0.x 설치본이고, 0.x는 update로 옮길 수 없다
  if (Object.keys(manifest.files || {}).some((rel) => rel.startsWith('.claude/hooks/'))) {
    L.fail(`update: 이 리포는 taskery ${manifest.version || '0.x'}로 설치돼 있어 update로 옮길 수 없다(1.0은 0.x와 호환되지 않는다). 옛 taskery 파일(AGENTS.md·CLAUDE.md·.claude/·.codex/·.agents/·.project/·.mcp.json·.taskery-manifest.json)을 리포 밖으로 옮긴 뒤 'npx @angar2/taskery init'으로 새로 설치한다. 필요한 옛 문서(백로그·제품 문서)는 옮겨 둔 곳에서 새 .project/로 가져온다.`);
  }
  const platforms = Array.isArray(manifest.platforms) ? manifest.platforms : ['claude'];
  const old = manifest.files || {};
  const files = {};
  const notes = [];
  const asker = I.makeAsker();
  try {
    const plan = I.installPlan(platforms);
    for (const it of plan) {
      const dst = path.join(main, it.dst);
      const tpl = I.readTemplate(it.src);
      const cur = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
      if (it.kind === 'once') {
        if (cur == null) {
          I.writeFile(main, it.dst, tpl);
          notes.push(`새로 만듦: ${it.dst}`);
        }
        continue;
      }
      if (it.kind === 'agents') {
        const next = I.recomposeAgents(tpl, cur);
        if (next !== cur) {
          I.writeFile(main, it.dst, next);
          notes.push(`재조립: ${it.dst} (프로젝트 절 유지)`);
        }
        files[it.dst] = I.hashText(next);
        continue;
      }
      const newHash = I.hashText(tpl);
      const curHash = cur == null ? null : I.hashText(cur);
      if (cur == null) {
        I.writeFile(main, it.dst, tpl);
        notes.push(`새로 만듦: ${it.dst}`);
        files[it.dst] = newHash;
      } else if (curHash === newHash) {
        files[it.dst] = newHash;
      } else if (curHash === old[it.dst]) {
        I.writeFile(main, it.dst, tpl);
        notes.push(`갱신: ${it.dst}`);
        files[it.dst] = newHash;
      } else {
        const ans = await asker.ask(`'${it.dst}'를 사용자가 고쳤다 — .bak으로 백업하고 새 판으로 바꿀까? (y/N) `, 'n');
        if (ans.toLowerCase() === 'y') {
          fs.copyFileSync(dst, `${dst}.bak`);
          I.writeFile(main, it.dst, tpl);
          notes.push(`바꿈(.bak 백업): ${it.dst}`);
          files[it.dst] = newHash;
        } else {
          notes.push(`유지(사용자 수정): ${it.dst}`);
          if (old[it.dst]) files[it.dst] = old[it.dst];
        }
      }
    }
    for (const rel of Object.keys(old)) {
      if (!plan.some((it) => it.dst === rel)) notes.push(`이 버전에서 빠진 파일 — 지우지 않고 둔다: ${rel}`);
    }
    notes.push(...I.writeConfigs(main, platforms));
    const added = L.ensureExclude(main);
    if (added.length) notes.push(`.git/info/exclude — ${added.join(' ')}`);
    L.writeManifest(main, { ...manifest, version: L.getPackageVersion(), updated_at: new Date().toISOString(), platforms, files });
    console.log(`taskery update 완료 — ${manifest.version} → ${L.getPackageVersion()}`);
    for (const n of notes) console.log(`- ${n}`);
  } finally {
    asker.close();
  }
}

main().catch((e) => {
  console.error(e instanceof L.TaskeryError ? e.message : `taskery update 실패: ${e.stack || e.message}`);
  process.exit(1);
});
