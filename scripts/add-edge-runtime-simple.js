const fs = require('fs');
const path = require('path');

function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const apiDir = path.join(__dirname, '../src/app/api');
const routeFiles = findRouteFiles(apiDir);

let updated = 0;
let skipped = 0;

routeFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Skip if no GET function
  if (!content.includes('export async function GET')) {
    skipped++;
    return;
  }
  
  // Skip if already has Edge Runtime
  if (content.includes('export const runtime = "edge"')) {
    skipped++;
    return;
  }
  
  // Find where to insert
  const lines = content.split('\n');
  let insertIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export async function GET')) {
      insertIndex = i;
      break;
    }
  }
  
  if (insertIndex === -1) {
    skipped++;
    return;
  }
  
  // Check if there's a dynamic/revalidate export before GET
  let insertAfter = -1;
  for (let i = insertIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.includes('export const revalidate') || line.includes('export const dynamic')) {
      insertAfter = i;
      break;
    }
    if (line && !line.startsWith('//') && !line.startsWith('import') && !line.startsWith('const') && !line.startsWith('function')) {
      break;
    }
  }
  
  // Insert Edge Runtime
  if (insertAfter !== -1) {
    lines.splice(insertAfter + 1, 0, 'export const runtime = "edge";');
  } else {
    lines.splice(insertIndex, 0, '', 'export const runtime = "edge";');
  }
  
  content = lines.join('\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log(`✅ ${path.relative(apiDir, filePath)}`);
  } else {
    skipped++;
  }
});

console.log(`\n📊 Summary: Updated ${updated}, Skipped ${skipped}`);

