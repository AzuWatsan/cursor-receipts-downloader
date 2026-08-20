@echo off
REM 毎日 11:00 に起動するタスクを登録する（Windowsタスクスケジューラ）。
REM 実際にDLするのは「開始日(既定20日)以降・その月がまだ未取得」のときだけで、
REM 成功するまで翌日以降も毎日リトライする（制御は cli.js scheduled 側）。
REM 実行: このファイルを右クリック→「管理者として実行」推奨。

set TASKNAME=CursorReceipts
set RUNBAT=%~dp0run.bat

schtasks /Create /TN "%TASKNAME%" /TR "cmd /c \"%RUNBAT%\"" /SC DAILY /ST 11:00 /F

if %errorlevel%==0 (
  echo.
  echo 登録しました: 毎日11:00に起動します（実際のDLは20日以降・未取得の月のみ）。
  echo 今すぐテスト実行する場合: schtasks /Run /TN "%TASKNAME%"
) else (
  echo.
  echo 登録に失敗しました。管理者として実行しているか確認してください。
)
pause
