@echo off
REM ============================================================
REM  PUBLICAÇÃO DE CONTEÚDOS AGENDADOS (rodar às 16:00)
REM  Publica no TikTok e Instagram os conteúdos do dia.
REM ============================================================

SET PYTHON=python
SET SCRIPT_DIR=%~dp0

echo [%DATE% %TIME%] Iniciando publicacao de conteudos...

IF EXIST "%SCRIPT_DIR%venv\Scripts\activate.bat" (
    call "%SCRIPT_DIR%venv\Scripts\activate.bat"
)

cd /d "%SCRIPT_DIR%"
%PYTHON% main.py --publicar >> "%SCRIPT_DIR%logs\execution_log.txt" 2>&1

IF %ERRORLEVEL% NEQ 0 (
    echo [%DATE% %TIME%] ERRO na publicacao. Veja logs\erros.txt
    exit /b 1
)

echo [%DATE% %TIME%] Publicacao finalizada.
exit /b 0
