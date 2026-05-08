#!/usr/bin/env node
/**
 * bin/create.js
 * `npx create-taskery <project-name>` — 새 디렉토리 생성 + 진입 + init 흐름.
 *
 * 동작:
 *   1. <project-name> 인자 검증 (없으면 에러)
 *   2. 동일 이름 디렉토리 존재 검사 (있으면 에러)
 *   3. mkdir <project-name> + cd
 *   4. init.js 호출 (현재 디렉토리에 카피)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function fail(msg) {
  console.error(`create-taskery: ${msg}`);
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  fail(`프로젝트 이름 인자 필요. 예: npx create-taskery my-app`);
}

// 안전한 디렉토리 이름 검증 — 절대경로 / .. / 빈 문자열 등 차단
if (arg.startsWith('/') || arg.includes('..') || arg.trim() === '') {
  fail(`'${arg}'는 유효한 디렉토리 이름이 아님. 상대 경로 + 단순 이름 사용.`);
}

const targetDir = path.resolve(process.cwd(), arg);

if (fs.existsSync(targetDir)) {
  fail(`'${arg}' 이미 존재. 다른 이름 사용하거나 'cd ${arg} && npx taskery init' 호출.`);
}

console.log(`create-taskery: '${arg}' 생성 + taskery init...`);
fs.mkdirSync(targetDir, { recursive: true });

const initScript = path.resolve(__dirname, 'init.js');
const r = spawnSync(process.execPath, [initScript], {
  cwd: targetDir,
  stdio: 'inherit',
});

if (r.status !== 0) {
  console.error(`create-taskery: init 실패 — '${targetDir}' 정리는 사용자 직접 수행.`);
  process.exit(r.status ?? 1);
}

console.log(`\n다음: cd ${arg}`);
