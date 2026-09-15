const fs = require('fs');
const path = require('path');

const getFamily = (weight) => {
  if (weight === '400' || weight === 'normal') return 'Poppins_400Regular';
  if (weight === '500') return 'Poppins_500Medium';
  if (weight === 'auto' || weight === '600') return 'Poppins_600SemiBold';
  if (weight === '700' || weight === 'bold') return 'Poppins_700Bold';
  if (weight === '800' || weight === '900' || weight === 'black') return 'Poppins_800ExtraBold';
  return 'Poppins_400Regular';
};

function replaceFonts(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceFonts(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Specifically target typography.ts first
      if (fullPath.endsWith('typography.ts')) {
        let oldContent = content;
        content = content.replace(
          /const fontFamily = [^;]+;/,
          `const getPoppinsFont = (weight: string) => {
  switch (weight) {
    case '400': return 'Poppins_400Regular';
    case '500': return 'Poppins_500Medium';
    case '600': return 'Poppins_600SemiBold';
    case '700': return 'Poppins_700Bold';
    case '800': return 'Poppins_800ExtraBold';
    default: return 'Poppins_400Regular';
  }
};`
        );
        // Replace fontWeight: 'XXX' as const, with fontFamily: getPoppinsFont('XXX'),
        const blocks = content.split(/(\w+:\s*\{[^}]+\})/);
        for (let i = 0; i < blocks.length; i++) {
          const match = blocks[i].match(/fontWeight:\s*'(\d+)'\s*as const,?/);
          if (match) {
            const weight = match[1];
            blocks[i] = blocks[i].replace(/\s*fontFamily,/, ''); // remove old
            blocks[i] = blocks[i].replace(/fontWeight:\s*'\d+'\s*as const,/, `fontFamily: getPoppinsFont('${weight}'),`);
          }
        }
        content = blocks.join('');
      } else {
        // Normal files: replace inline fontWeight: '900' with fontFamily: 'Poppins...'
        content = content.replace(/fontWeight:\s*['"](400|500|600|700|800|900|bold|normal)['"]/g, (match, weight) => {
          return `fontFamily: '${getFamily(weight)}'`;
        });
      }
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceFonts('c:/Users/rm273/Downloads/RuVo/RuvoPartner/src');
replaceFonts('c:/Users/rm273/Downloads/RuVo/RuvoShop/src');
console.log('Fonts updated successfully for Shop and Partner!');
