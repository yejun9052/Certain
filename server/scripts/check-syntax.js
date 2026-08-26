'use strict';

/**
 * 프로젝트 전체 JS 문법 검사.
 *
 *   npm run check
 *
 * node --check 를 server/, public/, test/ 의 모든 .js 파일에 적용한다.
 * (public/app.js 는 브라우저용이라 require 로 불러올 수 없으므로 문법 검사만 한다.)
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TARGET_DIRS = ['server', 'public', 'test'];

function collect(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      collect(full, found);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      found.push(full);
    }
  }
  return found;
}

const files = TARGET_DIRS.flatMap((dir) => collect(path.join(ROOT, dir)));
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`  ok   ${path.relative(ROOT, file)}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL ${path.relative(ROOT, file)}`);
    console.error(String(error.stderr || error.message).trim());
  }
}

// JSON 파일도 파싱 가능한지 확인한다.
for (const jsonFile of [path.join(ROOT, 'package.json'), path.join(ROOT, 'content', 'content.json')]) {
  try {
    JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`  ok   ${path.relative(ROOT, jsonFile)}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL ${path.relative(ROOT, jsonFile)}: ${error.message}`);
  }
}

console.log(`\n검사 ${files.length + 2}개 파일 · 실패 ${failed}개`);
process.exit(failed ? 1 : 0);
