// scripts/install-launcher-icon.js
// Copies assets/images/zumi-icon.png into Android mipmap folders with the launcher icon names.
// Usage: node scripts/install-launcher-icon.js

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcIcon = path.join(projectRoot, 'assets', 'images', 'zumi-icon.png');
const androidRes = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const mipmapDirs = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
  // Note: mipmap-anydpi-v26 should only contain XML files, not PNG files
];

const destNames = ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png'];

function ensureFileExists(p) {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

if (!ensureFileExists(srcIcon)) {
  console.error('Source icon not found:', srcIcon);
  process.exit(2);
}

let written = 0;
for (const dir of mipmapDirs) {
  const destDir = path.join(androidRes, dir);
  if (!ensureFileExists(destDir)) {
    // try create it
    try {
      fs.mkdirSync(destDir, { recursive: true });
      console.log('Created missing res directory:', destDir);
    } catch (e) {
      console.warn('Could not create res dir:', destDir, e.message);
      continue;
    }
  }

  for (const name of destNames) {
    const destPath = path.join(destDir, name);
    try {
      fs.copyFileSync(srcIcon, destPath);
      console.log('Wrote', destPath);
      written++;
    } catch (e) {
      console.error('Failed to copy to', destPath, e.message);
    }
  }
}

if (written > 0) {
  console.log(`Installed ${written} icon files. Rebuild the Android app (./gradlew assembleDebug or via 'npm run build:android:apk') to apply.`);
} else {
  console.error('No icon files were written.');
  process.exit(1);
}
