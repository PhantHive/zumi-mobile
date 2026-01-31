// scripts/remove-duplicate-icons.js
// Removes ic_launcher*.png files in android res mipmap folders to avoid duplicate resource errors.
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const androidRes = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const patterns = ['mipmap-*'];
const names = ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png'];

let removed = 0;
function walk(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p);
    else {
      if (names.includes(item)) {
        try {
          fs.unlinkSync(p);
          console.log('Removed:', p);
          removed++;
        } catch (e) {
          console.warn('Failed to remove', p, e.message);
        }
      }
    }
  }
}

if (!fs.existsSync(androidRes)) {
  console.error('android res dir not found:', androidRes);
  process.exit(2);
}

walk(androidRes);
if (removed === 0) console.log('No duplicate PNGs found');
else console.log('Removed', removed, 'files');
