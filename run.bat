@echo off
REM Windowsのタスクスケジューラから呼び出す実行ラッパー。
setlocal
cd /d "%~dp0"

if not exist logs mkdir logs

echo ==== %date% %time% start ==== >> logs\run.log
REM scheduled: 毎日起動される前提。開始日(既定20日)以降・今月未取得のときだけDLする。
node "%~dp0cli.js" scheduled >> logs\run.log 2>&1
echo ==== %date% %time% end (exit=%errorlevel%) ==== >> logs\run.log
endlocal
