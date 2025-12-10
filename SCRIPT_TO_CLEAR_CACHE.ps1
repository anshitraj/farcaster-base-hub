# Quick script to clear Next.js cache and restart dev server
# Run: .\SCRIPT_TO_CLEAR_CACHE.ps1

Write-Host "🧹 Clearing Next.js build cache..." -ForegroundColor Yellow

if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ .next folder deleted" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .next folder not found (already clean)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🚀 Starting dev server..." -ForegroundColor Yellow
Write-Host ""

npm run dev






