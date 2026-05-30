/**
 * bin/lib.js
 * 공통 유틸 — taskery init/create/update 스크립트가 공유.
 *
 * 핵심:
 *   - findTemplateDir(): 패키지 설치 위치에서 template/ 디렉토리 찾기
 *   - walkTemplate(templateDir): template/ 안 *모든 파일* 상대경로 + 해시 맵 리턴
 *   - sha256(path): 파일 해시
 *   - mkdirp(path): mkdir -p
 *   - copyFile(src, dst): 파일 카피 + 디렉토리 자동 생성
 *   - writeManifest(manifest, dst): manifest JSON 기록
 *   - readManifest(path): 기존 manifest Read (없으면 null)
 *   - LOCAL_SUFFIX: '.local.md' suffix 검사 (npx 미터치 룰)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOCAL_SUFFIX = '.local.md';
const MANIFEST_NAME = '.taskery-manifest.json';

function findTemplateDir() {
  // 패키지 루트는 이 lib.js 파일의 부모(bin/)의 부모
  const pkgRoot = path.resolve(__dirname, '..');
  const tmpl = path.join(pkgRoot, 'template');
  if (!fs.existsSync(tmpl)) {
    throw new Error(`template/ not found at ${tmpl}. taskery 패키지 설치 손상 가능성.`);
  }
  return tmpl;
}

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

function walkTemplate(templateDir) {
  // template/ 안 모든 파일 상대경로 + 해시 맵 리턴
  // 결과: { 'CLAUDE.md': 'sha256:...', '.claude/skills/task-init/SKILL.md': 'sha256:...', ... }
  const result = {};
  function walk(dir, relBase) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.isFile()) {
        result[rel] = sha256(full);
      }
    }
  }
  walk(templateDir, '');
  return result;
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(src, dst) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
  // 실행 권한 보존 (hooks .sh 파일)
  if (src.endsWith('.sh')) {
    fs.chmodSync(dst, 0o755);
  }
}

function writeManifest(manifest, dst) {
  fs.writeFileSync(dst, JSON.stringify(manifest, null, 2) + '\n');
}

function readManifest(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`${filePath} 파싱 실패: ${e.message}`);
  }
}

function isLocalOverride(relPath) {
  // *.local.md suffix 사용자 오버라이드 — npx 미터치 명시
  return relPath.endsWith(LOCAL_SUFFIX);
}

function getPackageVersion() {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

module.exports = {
  LOCAL_SUFFIX,
  MANIFEST_NAME,
  findTemplateDir,
  sha256,
  walkTemplate,
  mkdirp,
  copyFile,
  writeManifest,
  readManifest,
  isLocalOverride,
  getPackageVersion,
};
