# Dang ky task BotTiem_TraLoi: moi 3 phut chay launcher an. Chay: powershell -ExecutionPolicy Bypass -File D:\bot-tiem\local\dang-ky-task.ps1
$action  = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "D:\bot-tiem\local\tra-loi-hidden.vbs"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 3)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName "BotTiem_TraLoi" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName "BotTiem_TraLoi"
Start-Sleep -Seconds 20
Get-ScheduledTaskInfo -TaskName "BotTiem_TraLoi" | Select-Object LastRunTime, LastTaskResult, NextRunTime | Format-List
