'use strict';

/**
 * electron-builder configuration.
 *
 * Kept as JS so the bundling of `vendor/node` and `vendor/host` is conditional:
 * a plain shell-only build (CI on a fresh checkout) has no vendor directory and
 * must still succeed.
 */

const fs = require('node:fs');
const path = require('node:path');

const extraResources = [];
for (const [dir, to] of [
  ['vendor/node', 'node'],
  ['vendor/host', 'host'],
]) {
  const abs = path.join(__dirname, dir);
  if (fs.existsSync(abs) && fs.readdirSync(abs).length > 0) {
    extraResources.push({ from: dir, to });
  }
}

module.exports = {
  appId: 'io.github.dshwin7.harness7',
  productName: 'Harness7',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  files: [
    'src/**/*',
    'assets/tray.png',
    'assets/icon.ico',
    'package.json',
  ],
  extraResources,
  win: {
    icon: 'assets/icon.ico',
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    artifactName: 'Harness7-${version}-setup.${ext}',
    runAfterFinish: true,
  },
  portable: {
    artifactName: 'Harness7-${version}-portable.${ext}',
  },
};
