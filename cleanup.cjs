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
      
      // Simplify focus rings to flat style
      content = content.replace(/focus:ring-4 focus:ring-slate-900\/5/g, 'focus:ring-1 focus:ring-slate-900');
      content = content.replace(/focus:ring-2 focus:ring-slate-900\/10/g, 'focus:ring-1 focus:ring-slate-900');
      content = content.replace(/shadow-sm/g, ''); // Ensure NO shadows except specific ones
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Cleanup focus rings done!');
