#!/usr/bin/env bash
# Gọi từ Task Scheduler Windows mỗi 3 phút: wsl.exe -u <user-wsl> -- bash /mnt/d/bot-tiem/local/tra-loi.sh
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"
cd /mnt/d/bot-tiem && python3 local/tra-loi.py >> local/tra-loi.log 2>&1
