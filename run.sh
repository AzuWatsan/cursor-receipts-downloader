#!/bin/bash
# launchd から呼び出される実行ラッパー。
# launchd は最小限の環境変数で動くため、Node(nodenv) のパスをここで明示する。
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# launchd は最小PATHなので、Nodeのありそうな場所を広く通す（環境非依存）。
export PATH="\
$HOME/.anyenv/envs/nodenv/shims:\
$HOME/.nodenv/shims:\
$HOME/.nvm/current/bin:\
$HOME/.fnm/aliases/default/bin:\
$HOME/.volta/bin:\
/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# nvm をインストールしている場合は読み込む（default を使えるように）
if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true; fi

if ! command -v node >/dev/null 2>&1; then
  echo "node が見つかりません。PATH を確認してください。" >&2
  exit 127
fi

mkdir -p "$PROJECT_DIR/logs"
LOG="$PROJECT_DIR/logs/run.log"

echo "==== $(date '+%Y-%m-%d %H:%M:%S') start ====" >> "$LOG"
# 既定では新しい順に1件（その月の請求書+領収書）をDL
node "$PROJECT_DIR/download.js" >> "$LOG" 2>&1
echo "==== $(date '+%Y-%m-%d %H:%M:%S') end (exit=$?) ====" >> "$LOG"
