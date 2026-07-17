@echo off
chcp 65001 >nul
title Instagram Scraper - Tramontina/Guru
color 0A

echo ============================================================
echo   INSTAGRAM SCRAPER - Tramontina / Guru / Live / Cupom
echo ============================================================
echo.

REM ── Vai para a pasta C:\scraper (cria se nao existir) ──────────────────────
if not exist "C:\scraper" mkdir "C:\scraper"
cd /d "C:\scraper"

REM ── Verifica se o Node.js esta instalado ──────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo.
  echo  1. Acesse https://nodejs.org
  echo  2. Baixe a versao LTS e instale ^(Next em tudo^)
  echo  3. Rode este arquivo novamente
  echo.
  pause
  exit /b
)
echo [OK] Node.js encontrado.
echo.

REM ── Instala o Playwright na primeira vez ──────────────────────────────────
if not exist "C:\scraper\node_modules\playwright" (
  echo [1/3] Instalando Playwright ^(demora ~1 min^)...
  call npm install playwright
  echo [2/3] Baixando o navegador ^(~200 MB, demora ~2 min^)...
  call npx playwright install chromium
) else (
  echo [OK] Playwright ja instalado.
)
echo.

REM ── Baixa sempre a versao mais recente do script ──────────────────────────
echo [3/3] Baixando a versao mais recente do script...
curl -s -o instagram_scraper_local.js https://raw.githubusercontent.com/dcneuwald-spec/casalfinan/claude/lucid-hawking-n5jll8/instagram_scraper_local.js
if errorlevel 1 (
  echo [AVISO] Nao consegui baixar a versao nova. Usando a que ja existe.
)
echo.

echo ============================================================
echo   Iniciando... uma janela do navegador vai abrir.
echo   Se pedir login, entre manualmente ^(danielcalvo^).
echo ============================================================
echo.

REM ── Roda o script ^(pergunta as datas no terminal^) ─────────────────────────
node instagram_scraper_local.js

echo.
echo ============================================================
echo   Concluido. O arquivo esta em:
echo   C:\scraper\resultados_instagram.csv
echo ============================================================
echo.
pause
