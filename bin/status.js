#!/usr/bin/env node
/**
 * bin/status.js
 * `npx @angar2/taskery status` — 멀티세션 현황 요약.
 *
 * 출력:
 *   - 메인 워크트리 + 현재 브랜치
 *   - projectId / stale_days / lock_timeout_ms
 *   - 진행중 태스크 (SSoT) + 각 워크트리 폴더 존재 여부 + 마지막 커밋 시각
 *   - stale 의심 항목 (케이스 A/B/C/D)
 *   - 머지 락 상태 (잡혀 있으면 누가 잡고 있는지)
 *
 * 본 명령은 *변경 X — 읽기 전용*. 정리는 `taskery prune`.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  MANIFEST_NAME,
  readManifest,
  gitCapture,
  getMainWorktreePath,
  getActiveTasks,
  getWorktreesRoot,
  getMergeLockPath,
  DEFAULT_STALE_DAYS,
  DEFAULT_LOCK_TIMEOUT_MS,
} = require('./lib');

function daysAgo(date) {
  const now = Date.now();
  const ms = now - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function main() {
  // 1. 메인 워크트리 + manifest
  let mainWt;
  try {
    mainWt = getMainWorktreePath();
  } catch (e) {
    console.error(`taskery status 실패: ${e.message}`);
    process.exit(1);
  }

  const manifest = readManifest(path.join(mainWt, MANIFEST_NAME));
  if (!manifest) {
    console.error(`${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`);
    process.exit(1);
  }

  const projectId = manifest.projectId;
  const staleDays = manifest.stale_days ?? DEFAULT_STALE_DAYS;
  const lockTimeoutMs = manifest.lock_timeout_ms ?? DEFAULT_LOCK_TIMEOUT_MS;

  const currentBranch = gitCapture(mainWt, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const isOnDev = currentBranch === 'dev';

  console.log(`\ntaskery status\n`);
  console.log(`메인 워크트리: ${mainWt}`);
  console.log(`현재 브랜치: ${currentBranch}${isOnDev ? '' : ' ⚠ (메인 워크트리 = dev 정책 위배)'}`);
  console.log(`projectId: ${projectId}`);
  console.log(`stale_days: ${staleDays} / lock_timeout_ms: ${lockTimeoutMs}\n`);

  // 2. 머지 락 상태
  const lockPath = getMergeLockPath(projectId);
  const lockDir = lockPath + '.lock'; // proper-lockfile은 <file>.lock 디렉토리 생성
  if (fs.existsSync(lockDir)) {
    let lockInfo = '';
    try {
      const stat = fs.statSync(lockDir);
      const ageMs = Date.now() - stat.mtimeMs;
      lockInfo = ` (잡힘 ${Math.round(ageMs / 1000)}초 전)`;
    } catch (_) {}
    console.log(`머지 락: 활성${lockInfo}`);
  } else {
    console.log(`머지 락: 비활성`);
  }
  console.log();

  // 3. 진행중 태스크 (SSoT)
  const active = getActiveTasks(mainWt);
  console.log(`진행중 태스크 (SSoT, ${active.length}건):`);

  if (active.length === 0) {
    console.log(`  (없음)`);
  } else {
    const worktreesRoot = getWorktreesRoot(projectId);
    for (const t of active) {
      const wtPath = path.join(worktreesRoot, `TASK-${String(t.taskNum).padStart(3, '0')}_${t.src}_${t.slug}`);
      const wtExists = fs.existsSync(wtPath);
      const lastCommit = gitCapture(mainWt, [
        'log', '-1', '--format=%ci', t.branch,
      ], { allowFail: true });
      const lastDate = lastCommit ? new Date(lastCommit) : null;
      const daysOld = lastDate ? daysAgo(lastDate) : null;

      console.log(`  ${t.branch}`);
      console.log(`    워크트리: ${wtPath}${wtExists ? '' : ' ⚠ 폴더 없음 (케이스 A — prune 필요)'}`);
      if (lastDate) {
        console.log(`    마지막 커밋: ${lastCommit} (${daysOld}일 전)${daysOld >= staleDays ? ' ⚠ stale 의심 (케이스 B/C)' : ''}`);
      } else {
        console.log(`    마지막 커밋: (조회 실패)`);
      }
      if (wtExists) {
        const rebaseApply = path.join(wtPath, '.git', 'rebase-apply');
        const rebaseMerge = path.join(wtPath, '.git', 'rebase-merge');
        if (fs.existsSync(rebaseApply) || fs.existsSync(rebaseMerge)) {
          console.log(`    ⚠ rebase 잔여 상태 (케이스 D) — taskery prune 또는 워크트리에서 git rebase --abort`);
        }
      }
    }
  }
  console.log();

  // 4. 워크트리 폴더 vs SSoT mismatch (orphan)
  const worktreesRoot = getWorktreesRoot(projectId);
  if (fs.existsSync(worktreesRoot)) {
    const folders = fs.readdirSync(worktreesRoot).filter((n) => n.startsWith('TASK-'));
    const activeFolders = new Set(
      active.map(
        (t) => `TASK-${String(t.taskNum).padStart(3, '0')}_${t.src}_${t.slug}`,
      ),
    );
    const orphans = folders.filter((f) => !activeFolders.has(f));
    if (orphans.length > 0) {
      console.log(`⚠ SSoT에 없는 워크트리 폴더 ${orphans.length}건 (이미 dev 머지된 잔존?):`);
      for (const o of orphans) {
        console.log(`  ${path.join(worktreesRoot, o)}`);
      }
      console.log(`  → 'taskery prune' 으로 정리`);
      console.log();
    }
  }

  console.log(`기타 명령:`);
  console.log(`  npx @angar2/taskery prune   stale 워크트리 / 브랜치 대화형 정리`);
  console.log();
}

try {
  main();
} catch (e) {
  console.error(`taskery status 실패: ${e.message}`);
  process.exit(1);
}
