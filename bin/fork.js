#!/usr/bin/env node
/**
 * bin/fork.js
 * `npx @angar2/taskery fork <type> <dev> <src> <slug>` — task 분기.
 *
 * [채번 → 워크트리·브랜치 생성]을 init 락으로 원자 실행 (병렬 task-init 번호 충돌 차단).
 * 성공 시 결과 JSON 한 줄을 stdout으로 출력 ({ taskNum, nnn, branch, wtPath, projectId }).
 * 실패(정책 위배 / 동일 항목 진행중 / 동일 브랜치명 등) 시 stderr + exit 1.
 *
 * 호출 주체: `/task-init` Step 6 (사용자 직접 호출도 가능하나 통상 스킬 경유).
 */

const path = require('path');

const {
  MANIFEST_NAME,
  readManifest,
  getMainWorktreePath,
  forkTask,
} = require('./lib');

const VALID_TYPES = ['feature', 'bug', 'improve', 'refactor', 'docs', 'chore'];

async function main() {
  const [type, dev, src, slug] = process.argv.slice(2);

  if (!type || !dev || !src || !slug) {
    console.error('사용법: npx @angar2/taskery fork <type> <dev> <src> <slug>');
    console.error('예: npx @angar2/taskery fork feature claude BL-003 login-feature');
    process.exit(1);
  }
  if (!VALID_TYPES.includes(type)) {
    console.error(`type은 ${VALID_TYPES.join(' | ')} 중 하나 (받음: ${type})`);
    process.exit(1);
  }
  if (!/^(BL-\d+|RM-\d+|DR)$/.test(src)) {
    console.error(`src는 BL-NNN | RM-NNN | DR 형식 (받음: ${src})`);
    process.exit(1);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error(`slug은 영어 kebab-case (받음: ${slug})`);
    process.exit(1);
  }

  let mainWt;
  try {
    mainWt = getMainWorktreePath();
  } catch (e) {
    console.error(`taskery fork 실패: ${e.message}`);
    process.exit(1);
  }
  if (!readManifest(path.join(mainWt, MANIFEST_NAME))) {
    console.error(`${MANIFEST_NAME} 없음 — 'npx @angar2/taskery init' 먼저 실행 필요.`);
    process.exit(1);
  }

  try {
    const result = await forkTask(mainWt, { type, dev, src, slug });
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (e) {
    console.error(`taskery fork 실패: ${e.message}`);
    process.exit(1);
  }
}

main();
