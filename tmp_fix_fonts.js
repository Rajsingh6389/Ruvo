const fs = require('fs');
const path = require('path');

const directoryPath = 'c:/Users/rm273/Downloads/RuVo/RuvoMobile/src';

function replaceFonts(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceFonts(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const getFamily = (weight) => {
        if (weight === '400' || weight === 'normal') return 'Poppins_400Regular';
        if (weight === '500') return 'Poppins_500Medium';
        if (weight === 'auto' || weight === '600') return 'Poppins_600SemiBold';
        if (weight === '700' || weight === 'bold') return 'Poppins_700Bold';
        if (weight === '800' || weight === '900' || weight === 'black') return 'Poppins_800ExtraBold';
        return 'Poppins_400Regular';
      };

      // Handle fontWeight: "700", fontWeight: 'bold' etc
      content = content.replace(/fontWeight:\s*['"](400|500|600|700|800|900|bold|normal)['"]/g, (match, weight) => {
        return `fontFamily: '${getFamily(weight)}'`;
      });

      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceFonts(directoryPath);
console.log('Fonts updated successfully!');
