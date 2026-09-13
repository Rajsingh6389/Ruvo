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
  } catch(e) {}
  return results;
}

const files = walk('c:/Users/rm273/Downloads/RuVo');
let modifiedCount = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // 1. Safe regex for borderWidth: 1 or 2, specifically NOT followed by a dot or digit.
  // We match borderWidth:\s*(1|2)(?![\.\d])
  const borderRegex = /borderWidth:\s*(1|2)(?![\.\d])/g;
  
  if (borderRegex.test(content)) {
    content = content.replace(borderRegex, 'borderWidth: StyleSheet.hairlineWidth');
    changed = true;
  }

  // Also replace Tailwind classes border-2 with border (since border defaults to 0.5 in tailwind config)
  const twBorder2 = /\bborder-2\b/g;
  if (twBorder2.test(content)) {
    content = content.replace(twBorder2, 'border');
    changed = true;
  }
  
  // Make sure StyleSheet is imported if we injected hairlineWidth
  if (changed && content.includes('StyleSheet.hairlineWidth')) {
    if (!/import.*StyleSheet.*from\s+['"]react-native['"]/.test(content)) {
      if (/import\s+{([^}]*)}\s+from\s+['"]react-native['"]/.test(content)) {
        content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]react-native['"]/, (match, p1) => {
          if (!p1.includes('StyleSheet')) {
            return `import { StyleSheet, ${p1.trim()} } from 'react-native'`;
          }
          return match;
        });
      } else {
        content = `import { StyleSheet } from 'react-native';\n${content}`;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    modifiedCount++;
  }
});
console.log('Successfully fixed bold borders in', modifiedCount, 'files.');
