const fs = require('fs');
const filepath = 'c:/Users/rm273/Downloads/RuVo/RuvoMobile/src/theme/typography.ts';
let content = fs.readFileSync(filepath, 'utf8');

// Replace the old fontFamily definition
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

// We need to replace `fontFamily,` with nothing (or wait, we remove it), and `fontWeight: '400' as const,` with `fontFamily: getPoppinsFont('400'),` but keeping the weight if needed for web. Actually React Native might complain if `fontWeight` is used with custom fonts on Android, so let's remove fontWeight! Wait, iOS is fine with fontWeight if we use exact name, Android hates it. Let's remove `fontWeight: 'XXX' as const,` and replace `fontFamily,\n` with `fontFamily: getPoppinsFont('XXX'),\n`.

// Actually, I can use a regex loop to find the weight in each block.
const blocks = content.split(/(\w+:\s*\{[^}]+\})/);

for (let i = 0; i < blocks.length; i++) {
  const match = blocks[i].match(/fontWeight:\s*'(\d+)'\s*as const,?/);
  if (match) {
    const weight = match[1];
    blocks[i] = blocks[i].replace(/\s*fontFamily,/, ''); // remove old
    // replace fontWeight with fontFamily
    blocks[i] = blocks[i].replace(/fontWeight:\s*'\d+'\s*as const,/, `fontFamily: getPoppinsFont('${weight}'),`);
  }
}

fs.writeFileSync(filepath, blocks.join(''));
console.log('Done!');
