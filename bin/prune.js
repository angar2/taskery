#!/usr/bin/env node
/**
 * bin/prune.js
 * `npx @angar2/taskery prune` — stale 워크트리 / 브랜치 대화형 정리.
 *
 * 흐름:
 *   1. git worktree prune (자동, 케이스 A 폴더 없는 등록 정리)
 *   2. 의심 항목 목록 표시 (케이스 B/C/D + orphan)
 *   3. 사용자 항목별 보존 / 삭제 선택
 *   4. 선택된 항목 삭제:
 *      - 브랜치: git branch -D <name>  ← 사용자 명시 선택이므로 -D 허용 (rebase 잔여 등 -d 거부 가능)
 *      - 워크트리: git worktree remove --force <path>
 *   5. 결과 보고
 *
 * 본 명령은 *변경 발생 가능* — 사용자 confirm 항목별로 받음.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const {
  MANIFEST_NAME,
  readManifest,
  gitCapture,
  getMainWorktreePath,
  getActiveTasks,
  getWorktreesRoot,
  DEFAULT_STALE_DAYS,
} = require('./lib');
const { execFileSync } = require('child_process');

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim().toLowerCase())));
}

function daysAgo(date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

async function main() {
  const mainWt = getMainWorktreePath();
  const manifest = readManifest(path.join(mainWt, MANIFEST_NAME));
  if (!manifest) {
    console.error(`${MANIFEST_NAME} 없음 — 'init' 먼저.`);
    process.exit(1);
  }
  const projectId = manifest.projectId;
  const staleDays = manifest.stale_days ?? DEFAULT_STALE_DAYS;

  console.log(`\ntaskery prune\n`);
  console.log(`메인 워크트리: ${mainWt}`);
  console.log(`stale_days: ${staleDays}\n`);

  // 1. git worktree prune (자동 — 케이스 A)
  console.log(`Step 1 — git worktree prune (폴더 없는 워크트리 등록 정리)`);
  try {
    execFileSync('git', ['-C', mainWt, 'worktree', 'prune', '-v'], { stdio: 'inherit' });
  } catch (e) {
    console.error(`  git worktree prune 실패: ${e.message}`);
  }
  console.log();

  // 2. 의심 항목 수집
  const active = getActiveTasks(mainWt);
  const worktreesRoot = getWorktreesRoot(projectId);

  // 케이스 B/C/D
  const suspects = [];
  for (const t of active) {
    const wtPath = path.join(
      worktreesRoot,
      `TASK-${String(t.taskNum).padStart(3, '0')}_${t.src}_${t.slug}`,
    );
    const wtExists = fs.existsSync(wtPath);
    const lastCommit = gitCapture(mainWt, ['log', '-1', '--format=%ci', t.branch], {
      allowFail: true,
    });
    const lastDate = lastCommit ? new Date(lastCommit) : null;
    const days = lastDate ? daysAgo(lastDate) : null;

    let kase = null;
    if (!wtExists) kase = 'A (폴더 없음 — git worktree prune 처리됐을 가능성)';
    else if (days !== null && days >= staleDays) kase = `C (워크트리 폴더 존재 + ${days}일 비활성)`;

    if (wtExists) {
      const rebaseApply = path.join(wtPath, '.git', 'rebase-apply');
      const rebaseMerge = path.join(wtPath, '.git', 'rebase-merge');
      if (fs.existsSync(rebaseApply) || fs.existsSync(rebaseMerge)) {
        kase = `D (rebase 잔여 상태)`;
      }
    }

    if (kase) {
      suspects.push({ branch: t.branch, wtPath, wtExists, days, kase });
    }
  }

  // orphan 워크트리 (SSoT에 없는 폴더)
  const orphans = [];
  if (fs.existsSync(worktreesRoot)) {
    const folders = fs.readdirSync(worktreesRoot).filter((n) => n.startsWith('TASK-'));
    const activeFolders = new Set(
      active.map(
        (t) => `TASK-${String(t.taskNum).padStart(3, '0')}_${t.src}_${t.slug}`,
      ),
    );
    for (const f of folders) {
      if (!activeFolders.has(f)) {
        orphans.push(path.join(worktreesRoot, f));
      }
    }
  }

  if (suspects.length === 0 && orphans.length === 0) {
    console.log(`✅ 정리할 의심 항목 없음.`);
    return;
  }

  console.log(`Step 2 — 의심 항목 (${suspects.length + orphans.length}건)\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const toDelete = { branches: [], worktrees: [] };

  // suspects 처리
  for (const s of suspects) {
    console.log(`[${s.kase}] ${s.branch}`);
    console.log(`  워크트리: ${s.wtPath}${s.wtExists ? '' : ' (폴더 X)'}`);
    if (s.days !== null) console.log(`  마지막 커밋: ${s.days}일 전`);
    const ans = await ask(rl, `  삭제? (y=브랜치+워크트리 / w=워크트리만 / k=보존, 기본 k) `);
    if (ans === 'y') {
      toDelete.branches.push(s.branch);
      if (s.wtExists) toDelete.worktrees.push(s.wtPath);
    } else if (ans === 'w' && s.wtExists) {
      toDelete.worktrees.push(s.wtPath);
    } else {
      console.log(`  보존`);
    }
    console.log();
  }

  // orphan 처리
  for (const o of orphans) {
    console.log(`[orphan] 워크트리 폴더 (SSoT에 없는 브랜치)`);
    console.log(`  ${o}`);
    const ans = await ask(rl, `  워크트리 폴더 삭제? (y/N) `);
    if (ans === 'y') toDelete.worktrees.push(o);
    else console.log(`  보존`);
    console.log();
  }

  rl.close();

  // 3. 실제 삭제
  if (toDelete.branches.length === 0 && toDelete.worktrees.length === 0) {
    console.log(`삭제 대상 없음.`);
    return;
  }

  console.log(`\nStep 3 — 삭제 실행\n`);

  for (const wt of toDelete.worktrees) {
    try {
      execFileSync('git', ['-C', mainWt, 'worktree', 'remove', '--force', wt], {
        stdio: 'inherit',
      });
      console.log(`  worktree removed: ${wt}`);
    } catch (e) {
      console.error(`  worktree remove 실패 (${wt}): ${e.message}`);
    }
  }

  for (const b of toDelete.branches) {
    try {
      // -D 강제 삭제 — 사용자 명시 선택 (prune 대화형) 이므로 허용
      execFileSync('git', ['-C', mainWt, 'branch', '-D', b], { stdio: 'inherit' });
      console.log(`  branch deleted: ${b}`);
    } catch (e) {
      console.error(`  branch -D 실패 (${b}): ${e.message}`);
    }
  }

  console.log(`\n✅ taskery prune 완료 — 워크트리 ${toDelete.worktrees.length}건 / 브랜치 ${toDelete.branches.length}건 삭제.`);
}

main().catch((e) => {
  console.error(`taskery prune 실패: ${e.message}`);
  process.exit(1);
});
