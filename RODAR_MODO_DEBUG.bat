@echo off
chcp 65001 >nul
title Instagram Scraper - MODO DEBUG
color 0E

echo ============================================================
echo   MODO DIAGNOSTICO ^(mostra o texto lido de cada post^)
echo ============================================================
echo.

if not exist "C:\scraper" mkdir "C:\scraper"
cd /d "C:\scraper"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Rode antes o INSTALAR_E_RODAR.bat
  pause
  exit /b
)

echo Baixando a versao mais recente do script...
curl -s -o instagram_scraper_local.js https://raw.githubusercontent.com/dcneuwald-spec/casalfinan/claude/lucid-hawking-n5jll8/instagram_scraper_local.js
echo.

set DEBUG=1
node instagram_scraper_local.js

echo.
pause
