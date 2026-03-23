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
  const buffer = fs.readFileSync(file);
  // Simple UTF-8 check: try to decode and see if it throws or has replacement characters
  const content = buffer.toString('utf8');
  if (content.includes('\uFFFD')) {
     console.log(`ENCODING ISSUE (Potential) in ${path.relative(srcDir, file)}`);
  }
});
console.log('Done.');
