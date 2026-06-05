@echo off
REM 自動実行タスクを削除する。
set TASKNAME=CursorReceipts
schtasks /Delete /TN "%TASKNAME%" /F
pause
