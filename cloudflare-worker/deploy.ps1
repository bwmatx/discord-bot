# ============================================
# SCRIPT DEPLOY DISCORD BOT KE CLOUDFLARE WORKERS
# Jalankan script ini di PowerShell
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY DISCORD BOT KE CLOUDFLARE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# LANGKAH 1: Cek Node.js
Write-Host "[1/5] Mengecek Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  Node.js terdeteksi: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js belum terinstall!" -ForegroundColor Red
    Write-Host "  Download di: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# LANGKAH 2: Install Wrangler
Write-Host ""
Write-Host "[2/5] Menginstall Wrangler (CLI Cloudflare)..." -ForegroundColor Yellow
npm install -g wrangler
Write-Host "  Wrangler terinstall!" -ForegroundColor Green

# LANGKAH 3: Login ke Cloudflare
Write-Host ""
Write-Host "[3/5] Login ke Cloudflare..." -ForegroundColor Yellow
Write-Host "  Browser akan terbuka. Klik ALLOW untuk mengizinkan." -ForegroundColor Cyan
wrangler login

# LANGKAH 4: Deploy Worker
Write-Host ""
Write-Host "[4/5] Men-deploy Worker ke Cloudflare..." -ForegroundColor Yellow
Set-Location "e:\008 BW 2026\Juli\Discord_BOT\cloudflare-worker"
npx wrangler deploy

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "CATAT URL Worker kamu dari output di atas!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Selanjutnya, jalankan script: setup_secrets.ps1" -ForegroundColor Cyan
Write-Host ""
