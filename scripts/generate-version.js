#!/usr/bin/env node

/**
 * Genererar public/version.json med semantisk version från package.json
 * och aktuellt git commit hash för cache busting.
 *
 * Versionshantering (semver):
 * - patch: bugfixar, justeringar
 * - minor: ny funktionalitet
 * - major: breaking changes
 *
 * Kommandona npm run release:patch|minor|major bumpar versionen
 * och kör detta script automatiskt.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);
const version = pkg.version || '0.0.0';

let commitHash;
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  commitHash = Date.now().toString(36);
}

const buildTime = new Date().toISOString();

const versionData = { version, commitHash, buildTime };

const outPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(outPath, JSON.stringify(versionData, null, 2) + '\n');

console.log(`Generated version.json: v${version} (${commitHash}) at ${buildTime}`);
