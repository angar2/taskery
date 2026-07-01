#!/usr/bin/env node
/**
 * bin/fork.js
 * `npx @angar2/taskery fork <type> <dev> <src> <slug> [--size <s> --title "<t>" --promote]` — task 분기.
 *
 * [채번 → 워크트리·브랜치 생성]을 init 락으로 원자 실행 (병렬 task-init 번호 충돌 차단).
 * --size·--title 주면 fork 직후 §1.3 빈 골격 task.md도 코드가 자동 생성(C1, 생성일·status=draft 자동).
 * 성공 시 결과 JSON 한 줄을 stdout으로 출력 ({ taskNum, nnn, branch, wtPath, projectId, [docPath, registered, promoted | scaffoldError] }).
 * 실패(정책 위배 / 동일 항목 진행중 / 동일 브랜치명 등) 시 stderr + exit 1.
 * 골격 생성 실패는 워크트리 생성을 무효화하지 않음 — exit 0 + scaffoldError로 보고(스킬이 폴백 Write).
 *
 * 호출 주체: `/task-init` Step 6 (사용자 직접 호출도 가능하나 통상 스킬 경유).
 */

const path = require('path');

const {
  MANIFEST_NAME,
  readManifest,
  getMainWorktreePath,
  forkTask,
  scaffoldTaskDoc,
} = require('./lib');

const VALID_TYPES = ['feature', 'bug', 'improve', 'refactor', 'docs', 'chore'];
const VALID_SIZES = ['micro', 'small', 'medium', 'large'];

async function main() {
  // 위치 인자 4개 + 플래그(--size <s> / --title "<t>" / --promote).
  const argv = process.argv.slice(2);
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--promote') {
      opts.promote = true;
    } else if (a.startsWith('--')) {
      opts[a.slice(2)] = argv[++i];
    } else {
      positional.push(a);
    }
  }
  const [type, dev, src, slug] = positional;

  if (!type || !dev || !src || !slug) {
    console.error(
      '사용법: npx @angar2/taskery fork <type> <dev> <src> <slug> [--size <s> --title "<제목>" --promote]',
    );
    console.error('예: npx @angar2/taskery fork feature claude BL-003 login --size medium --title "로그인 기능"');
    process.exit(1);
  }
  if (opts.size && !VALID_SIZES.includes(opts.size)) {
    console.error(`--size는 ${VALID_SIZES.join(' | ')} 중 하나 (받음: ${opts.size})`);
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

  let result;
  try {
    result = await forkTask(mainWt, { type, dev, src, slug });
  } catch (e) {
    console.error(`taskery fork 실패: ${e.message}`);
    process.exit(1);
  }

  // 골격 자동 생성 (--size·--title 제공 시). 워크트리는 이미 생성됐으므로 실패해도 exit 1 X.
  let out = result;
  if (opts.size && opts.title) {
    try {
      const doc = scaffoldTaskDoc(mainWt, result.wtPath, {
        taskNum: result.taskNum,
        slug,
        title: opts.title,
        type,
        size: opts.size,
        promoted: !!opts.promote,
      });
      out = { ...result, docPath: doc.file, registered: doc.registered, promoted: doc.promoted };
    } catch (e) {
      out = { ...result, scaffoldError: e.message };
    }
  }
  process.stdout.write(JSON.stringify(out) + '\n');
}

main();
