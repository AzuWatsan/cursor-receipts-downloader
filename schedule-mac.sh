#!/bin/bash
# 毎日 11:00 に起動する launchd エージェントを登録する（mac用・配布対応）。
# 実際にDLするのは「開始日(既定20日)以降・その月がまだ未取得」のときだけで、
# 成功するまで翌日以降も毎日リトライする（制御は cli.js scheduled 側）。
# 配置パスから plist を生成するので、どのユーザー/場所に置いても動きます。
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LABEL="com.cursor-receipts.$USER"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

chmod +x "$PROJECT_DIR/run.sh"
mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT_DIR/logs"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$PROJECT_DIR/run.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>11</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <key>StandardOutPath</key><string>$PROJECT_DIR/logs/launchd.out.log</string>
    <key>StandardErrorPath</key><string>$PROJECT_DIR/logs/launchd.err.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "登録しました: $LABEL （毎日 11:00 起動 / 実際のDLは20日以降・未取得の月のみ）"
echo "開始日を変える場合: 環境変数 START_DAY（例: START_DAY=25）"
echo "テスト実行: launchctl start $LABEL"
echo "解除:       launchctl unload \"$PLIST\" && rm \"$PLIST\""
