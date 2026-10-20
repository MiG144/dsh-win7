#!/usr/bin/env node
'use strict';

/**
 * Extracts the Harness runtime tree (`dsh/`) from an installed Electron app.asar.
 *
 * Usage:
 *   node extract-host.js <app.asar> <outDir> [subdir]
 *
 * Example (Windows):
 *   node extract-host.js ^
 *     "%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\app.asar" ^
 *     apps\shell\vendor\host dsh
 *
 * Entries marked `unpacked` are copied from `<app.asar>.unpacked`.
 */

const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [, , asarArg, outArg, subArg = 'dsh'] = process.argv;
if (!asarArg || !outArg) fail('usage: node extract-host.js <app.asar> <outDir> [subdir]');

const asar = path.resolve(asarArg);
const outRoot = path.resolve(outArg);
const unpackedRoot = `${asar}.unpacked`;

if (!fs.existsSync(asar)) fail(`not found: ${asar}`);

const fd = fs.openSync(asar, 'r');
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const headerSize = head.readUInt32LE(12);
const headerBuf = Buffer.alloc(headerSize);
fs.readSync(fd, headerBuf, 0, headerSize, 16);
const header = JSON.parse(headerBuf.toString('utf8').replace(/\u0000+$/, ''));
const base = 16 + headerSize;

const root = header.files[subArg];
if (!root) fail(`entry not found in asar: ${subArg}`);

let files = 0;
let bytes = 0;
let missing = 0;

function walk(node, rel) {
  for (const [name, entry] of Object.entries(node.files || {})) {
    const relPath = rel ? `${rel}/${name}` : name;
    const dst = path.join(outRoot, relPath);
    if (entry.files) {
      fs.mkdirSync(dst, { recursive: true });
      walk(entry, relPath);
      continue;
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (entry.unpacked) {
      const src = path.join(unpackedRoot, relPath);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        files += 1;
        bytes += fs.statSync(dst).size;
      } else {
        missing += 1;
      }
      continue;
    }
    const size = Number(entry.size) || 0;
    const buf = Buffer.alloc(size);
    if (size) fs.readSync(fd, buf, 0, size, base + Number(entry.offset));
    fs.writeFileSync(dst, buf);
    files += 1;
    bytes += size;
  }
}

fs.mkdirSync(outRoot, { recursive: true });
walk(root, subArg);
fs.closeSync(fd);

console.log(
  `extracted ${files} files, ${(bytes / 1048576).toFixed(1)} MB` +
    (missing ? `, ${missing} unpacked entries missing` : ''),
);
