#!/usr/bin/env node
/**
 * Lifecycle script for `npm version`.
 * package.json has already been bumped when this runs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const version =
  process.env.npm_package_version ??
  JSON.parse(readFileSync('package.json', 'utf8')).version;
const date = new Date().toISOString().slice(0, 10);

const changelogPath = 'CHANGELOG.md';
const text = readFileSync(changelogPath, 'utf8');
const next = text
  .replace(/^## Unreleased\s*$/m, `## ${version} _${date}_`)
  .replace(/\[Unreleased\]/g, `${version} _${date}_`);

if (next === text) {
  console.warn('version.mjs: no Unreleased heading found in CHANGELOG.md');
} else {
  writeFileSync(changelogPath, next);
}

const git = spawnSync('git', ['add', 'CHANGELOG.md'], { stdio: 'inherit' });
if (git.status !== 0) process.exit(git.status ?? 1);
