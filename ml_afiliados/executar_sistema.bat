@echo off
REM ============================================================
REM  SISTEMA AUTOMÁTICO DE AFILIAÇÃO MERCADO LIVRE COM IA
REM  Arquivo de execução para Windows Task Scheduler
REM ============================================================
REM  COMO AGENDAR NO WINDOWS TASK SCHEDULER:
REM
REM  1. Abra "Agendador de Tarefas" (Task Scheduler)
REM  2. Clique em "Criar Tarefa Básica..."
REM  3. Nome: "ML Afiliados - Pipeline Completo"
REM  4. Gatilho: Diariamente às 07:00 (Ter a Sex)
REM  5. Ação: Iniciar um programa
REM     Programa: C:\Caminho\Para\executar_sistema.bat
REM  6. Repita o processo para 16:00 com "--publicar"
REM
REM  Para o pipeline de publicação (16h), crie outra tarefa
REM  apontando para: executar_publicar.bat
REM ============================================================

SET PYTHON=python
SET SCRIPT_DIR=%~dp0

echo [%DATE% %TIME%] Iniciando pipeline completo...

REM Ativa o ambiente virtual se existir
IF EXIST "%SCRIPT_DIR%venv\Scripts\activate.bat" (
    call "%SCRIPT_DIR%venv\Scripts\activate.bat"
)

REM Executa o pipeline principal
cd /d "%SCRIPT_DIR%"
%PYTHON% main.py >> "%SCRIPT_DIR%logs\execution_log.txt" 2>&1

IF %ERRORLEVEL% NEQ 0 (
    echo [%DATE% %TIME%] ERRO na execucao. Veja logs\erros.txt
    exit /b 1
)

echo [%DATE% %TIME%] Pipeline finalizado com sucesso.
exit /b 0
