# Registra os Fluxos 1 e 2 no Windows Task Scheduler
# Execute como Administrador: powershell -ExecutionPolicy Bypass -File configurar_agendador.ps1

$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Fluxo 1 — Dia 29 às 08:00 ───────────────────────────────────────────────
$action1  = New-ScheduledTaskAction -Execute "$pasta\executar_fluxo1.bat"
$trigger1 = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 29 -At "08:00"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable

Register-ScheduledTask `
    -TaskName "NFS-e_Fluxo1_Dia29" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Fluxo 1 agendado: todo dia 29 às 08:00"

# ── Fluxo 2 — Dia 1° às 08:00 ───────────────────────────────────────────────
$action2  = New-ScheduledTaskAction -Execute "$pasta\executar_fluxo2.bat"
$trigger2 = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At "08:00"

Register-ScheduledTask `
    -TaskName "NFS-e_Fluxo2_Dia01" `
    -Action $action2 `
    -Trigger $trigger2 `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Fluxo 2 agendado: todo dia 1° às 08:00"
Write-Host ""
Write-Host "Tarefas registradas com sucesso no Agendador de Tarefas do Windows!"
