#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('📱 Copying custom splash screen...');

const sourceFile = path.join(__dirname, '../assets/splash-icon.png');
const targetFolders = [
  'android/app/src/main/res/drawable-hdpi',
  'android/app/src/main/res/drawable-mdpi',
  'android/app/src/main/res/drawable-xhdpi',
  'android/app/src/main/res/drawable-xxhdpi',
  'android/app/src/main/res/drawable-xxxhdpi',
];

targetFolders.forEach(folder => {
  const targetPath = path.join(__dirname, '..', folder, 'splashscreen_logo.png');
  
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(sourceFile, targetPath);
    console.log(`✅ Copied to ${folder}`);
  } catch (error) {
    console.error(`❌ Failed to copy to ${folder}:`, error.message);
  }
});

console.log('✨ Splash screen copy complete!');

