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
const allFilesNormalized = allFiles.map(f => f.replace(/\\/g, '/'));

allFilesNormalized.forEach(file => {
  if (file.endsWith('.jsx') || file.endsWith('.js')) {
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const absoluteImportPath = path.resolve(path.dirname(file), importPath);
        
        // Try with and without extensions
        const possibleFiles = [
          absoluteImportPath,
          absoluteImportPath + '.jsx',
          absoluteImportPath + '.js',
          absoluteImportPath + '.css',
          path.join(absoluteImportPath, 'index.jsx'),
          path.join(absoluteImportPath, 'index.js'),
          path.join(absoluteImportPath, 'index.css')
        ];

        let found = false;
        let casedMatch = null;
        let casedDir = null;

        for (const p of possibleFiles) {
          const dir = path.dirname(p);
          const base = path.basename(p);
          if (fs.existsSync(dir)) {
            const actualFiles = fs.readdirSync(dir);
            if (actualFiles.includes(base)) {
              found = true;
              break;
            } else {
              // Check if it exists with DIFFERENT casing
              const lowerActualFiles = actualFiles.map(f => f.toLowerCase());
              const index = lowerActualFiles.indexOf(base.toLowerCase());
              if (index !== -1) {
                casedMatch = actualFiles[index];
                casedDir = dir;
              }
            }
          }
        }

        if (!found && casedMatch) {
          console.log(`CASE MISMATCH in ${path.relative(srcDir, file)}:`);
          console.log(`  Import: ${importPath}`);
          console.log(`  Actual file: ${casedMatch} in ${path.relative(srcDir, casedDir)}`);
        }
      }
    }
  }
});
console.log('Done.');
