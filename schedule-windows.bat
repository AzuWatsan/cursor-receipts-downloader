@echo off
REM 毎月20日 11:00 に自動実行するタスクを登録する（Windowsタスクスケジューラ）。
REM 実行: このファイルを右クリック→「管理者として実行」推奨。

set TASKNAME=CursorReceipts
set RUNBAT=%~dp0run.bat

schtasks /Create /TN "%TASKNAME%" /TR "cmd /c \"%RUNBAT%\"" /SC MONTHLY /D 20 /ST 11:00 /F

if %errorlevel%==0 (
  echo.
  echo 登録しました: 毎月20日 11:00 に実行されます。
  echo 今すぐテスト実行する場合: schtasks /Run /TN "%TASKNAME%"
) else (
  echo.
  echo 登録に失敗しました。管理者として実行しているか確認してください。
)
pause
