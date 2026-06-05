#!/bin/bash
# 毎月20日 11:00 に自動実行する launchd エージェントを登録する（mac用・配布対応）。
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
        <key>Day</key><integer>20</integer>
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

echo "登録しました: $LABEL （毎月20日 11:00）"
echo "テスト実行: launchctl start $LABEL"
echo "解除:       launchctl unload \"$PLIST\" && rm \"$PLIST\""
