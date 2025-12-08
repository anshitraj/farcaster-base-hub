/**
 * Script to add Edge Runtime to all GET routes
 * This ensures all GET routes use Edge Runtime for instant responses
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const API_DIR = path.join(__dirname, '../src/app/api');

// Find all route.ts files
const routeFiles = glob.sync('**/route.ts', { cwd: API_DIR, absolute: true });

let updated = 0;
let skipped = 0;

routeFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if file has GET function
  if (!content.includes('export async function GET')) {
    skipped++;
    return;
  }
  
  // Check if already has Edge Runtime
  if (content.includes('export const runtime = "edge"')) {
    skipped++;
    return;
  }
  
  // Check if has revalidate or dynamic - we'll add runtime after those
  const hasRevalidate = content.includes('export const revalidate');
  const hasDynamic = content.includes('export const dynamic');
  
  // Find the line after imports and before GET function
  const lines = content.split('\n');
  let insertIndex = -1;
  
  // Find where to insert (after imports, before GET function)
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
  
  // Insert Edge Runtime export
  // If there's revalidate or dynamic, insert after them, otherwise before GET
  let runtimeLine = 'export const runtime = "edge";';
  
  // Check if we should insert after revalidate/dynamic
  let insertAfter = -1;
  for (let i = insertIndex - 1; i >= 0; i--) {
    if (lines[i].includes('export const revalidate') || lines[i].includes('export const dynamic')) {
      insertAfter = i;
      break;
    }
  }
  
  if (insertAfter !== -1) {
    lines.splice(insertAfter + 1, 0, '', runtimeLine);
  } else {
    lines.splice(insertIndex, 0, '', runtimeLine);
  }
  
  content = lines.join('\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    updated++;
    console.log(`✅ Added Edge Runtime to: ${path.relative(API_DIR, filePath)}`);
  } else {
    skipped++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Updated: ${updated} files`);
console.log(`   ⏭️  Skipped: ${skipped} files`);

