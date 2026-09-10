' Chay bo nao bot Messenger an hoan toan (moi 3 phut, task BotTiem_TraLoi). Sua <user-wsl> va duong dan.
Set sh = CreateObject("WScript.Shell")
sh.Run "wsl.exe -u <user-wsl> -- bash /mnt/d/bot-tiem/local/tra-loi.sh", 0, True
