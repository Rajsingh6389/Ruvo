const fs = require('fs');

function resolve(file) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> .*\r?\n?/g, function(match, headContent, theirsContent) {
    return headContent;
  });
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Resolved: ' + file);
  } else {
    console.log('No conflict markers found structurally in: ' + file);
  }
}

resolve('src/screens/LoginScreen.tsx');
resolve('src/screens/marketplace/AddProductScreen.tsx');
resolve('src/screens/marketplace/MyProductsScreen.tsx');
