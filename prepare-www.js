const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

// Clean and recreate www directory
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const filesToCopy = [
  'index.html',
  'style.css',
  'app.js',
  'sk_data.js',
  'bell.js',
  'manifest.json',
  'sw.js'
];

const dirsToCopy = [
  'img',
  'vendor',
  'audio'
];

console.log('📦 Preparing assets for Android APK build in ./www ...');

for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file}`);
  }
}

for (const dir of dirsToCopy) {
  const src = path.join(__dirname, dir);
  const dest = path.join(wwwDir, dir);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`  ✓ Copied directory ${dir}/`);
  }
}

console.log('🎉 Assets successfully assembled into ./www!');
