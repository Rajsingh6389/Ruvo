const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory() && !file.includes('node_modules')) { 
        results = results.concat(walk(file));
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) { 
        results.push(file);
      }
    });
  } catch (e) { }
  return results;
}

const files = walk('c:/Users/rm273/Downloads/RuVo');
let missingImports = [];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (c.includes('StyleSheet.hairlineWidth')) {
    // Check if StyleSheet is imported
    if (!/import[\s\S]*?StyleSheet[\s\S]*?from\s+['"]react-native['"]/.test(c)) {
      missingImports.push(f);
      
      // Try to inject it into an existing react-native import
      let fixed = false;
      c = c.replace(/import\s+{([^}]*)}\s+from\s+['"]react-native['"]/, (match, p1) => {
          fixed = true;
          return `import { StyleSheet, ${p1.trim()} } from 'react-native'`;
      });
      
      // If we couldn't find an existing destructured import, add a new one at the top
      if (!fixed) {
         c = `import { StyleSheet } from 'react-native';\n${c}`;
      }
      
      fs.writeFileSync(f, c, 'utf8');
      console.log('Fixed missing import in:', f);
    }
  }
});
console.log('Total fixed missing imports:', missingImports.length);
