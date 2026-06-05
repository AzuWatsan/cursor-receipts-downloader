@echo off
REM Windowsのタスクスケジューラから呼び出す実行ラッパー。
setlocal
cd /d "%~dp0"

if not exist logs mkdir logs

echo ==== %date% %time% start ==== >> logs\run.log
node "%~dp0download.js" >> logs\run.log 2>&1
echo ==== %date% %time% end (exit=%errorlevel%) ==== >> logs\run.log
endlocal
