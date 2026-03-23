import fs from 'fs';
import path from 'path';

const srcDir = 'g:/final_project_pro/Final_Project/admin/src';

function getAllFiles(dir, allFiles = []) {
  if (!fs.existsSync(dir)) return allFiles;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, allFiles);
    } else {
      allFiles.push(filePath);
    }
  });
  return allFiles;
}

const allFiles = getAllFiles(srcDir);

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) > 127) {
      console.log(`NON-ASCII in ${path.relative(srcDir, file)} at offset ${i}: ${content[i]} (code: ${content.charCodeAt(i)})`);
      // Just one per file to avoid noise
      break;
    }
  }
});
console.log('Done.');
