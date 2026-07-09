# ============================================
# SCRIPT SETUP SECRETS (Jalankan SETELAH deploy.ps1)
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP SECRETS DISCORD BOT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "e:\008 BW 2026\Juli\Discord_BOT\cloudflare-worker"

# SECRET 1: Bot Token
Write-Host "[1/4] Setting DISCORD_BOT_TOKEN..." -ForegroundColor Yellow
Write-Host "  Paste token bot Discord kamu, lalu tekan Enter" -ForegroundColor Cyan
npx wrangler secret put DISCORD_BOT_TOKEN

# SECRET 2: Public Key
Write-Host ""
Write-Host "[2/4] Setting DISCORD_PUBLIC_KEY..." -ForegroundColor Yellow
Write-Host "  Buka Discord Developer Portal > General Information > PUBLIC KEY" -ForegroundColor Cyan
Write-Host "  Copy-paste Public Key tersebut, lalu tekan Enter" -ForegroundColor Cyan
npx wrangler secret put DISCORD_PUBLIC_KEY

# SECRET 3: DeepSeek API Key
Write-Host ""
Write-Host "[3/4] Setting DEEPSEEK_API_KEY..." -ForegroundColor Yellow
Write-Host "  Paste API Key DeepSeek kamu, lalu tekan Enter" -ForegroundColor Cyan
npx wrangler secret put DEEPSEEK_API_KEY

# SECRET 4: Application ID
Write-Host ""
Write-Host "[4/4] Setting APPLICATION_ID..." -ForegroundColor Yellow
Write-Host "  Paste Application ID bot Discord kamu, lalu tekan Enter" -ForegroundColor Cyan
npx wrangler secret put APPLICATION_ID

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SEMUA SECRET TERSIMPAN!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor Yellow
Write-Host "1. Buka Discord Developer Portal" -ForegroundColor White
Write-Host "2. Tab 'General Information'" -ForegroundColor White
Write-Host "3. Isi INTERACTIONS ENDPOINT URL dengan URL Worker kamu" -ForegroundColor White
Write-Host "4. Klik Save Changes" -ForegroundColor White
Write-Host ""
Write-Host "5. Lalu daftarkan slash command dengan menjalankan di PowerShell:" -ForegroundColor White
Write-Host '   Invoke-WebRequest -Method POST -Uri "https://URL-WORKER-KAMU/register"' -ForegroundColor Cyan
Write-Host ""
