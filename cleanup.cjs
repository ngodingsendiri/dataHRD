const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Standardize border radiuses to rounded-lg or rounded-xl
      content = content.replace(/rounded-2xl/g, 'rounded-xl');
      content = content.replace(/rounded-3xl/g, 'rounded-xl');
      
      // Remove specific long shadows
      content = content.replace(/shadow-\[0_1px_2px_rgba\(0,0,0,0\.03\)\]/g, '');
      content = content.replace(/shadow-\[0_1px_2px_rgba\(0,0,0,0\.02\)\]/g, '');
      content = content.replace(/shadow-\[0_1px_4px_rgba\(0,0,0,0\.02\)\]/g, '');
      content = content.replace(/shadow-\[0_2px_8px_rgba\(0,0,0,0\.02\)\]/g, '');
      content = content.replace(/shadow-\[inset_0_0_0_1px_rgba\(0,0,0,0\.05\)\]/g, '');
      content = content.replace(/shadow-\[0_-1px_0_0_rgba\(0,0,0,0\.05\)\]/g, 'border-t border-slate-100');
      
      // Remove all shadow classes to make it flat
      content = content.replace(/\bshadow-sm\b/g, '');
      content = content.replace(/\bshadow-md\b/g, '');
      content = content.replace(/\bshadow-lg\b/g, '');
      content = content.replace(/\bshadow-xl\b/g, 'shadow-sm'); // but keep modals a bit distinguished
      content = content.replace(/\bshadow-2xl\b/g, 'shadow-md');
      content = content.replace(/\bshadow-red-200\b/g, '');
      content = content.replace(/\bdrop-shadow-sm\b/g, '');
      
      // Remove double spaces
      content = content.replace(/  +/g, ' ');

      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Cleanup done!');
