#!/bin/bash
# launchd から呼び出される実行ラッパー。
# launchd は最小限の環境変数で動くため、Node のパスをここで明示する。
set -eo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# nodenv / Homebrew 等（nvm は set -u と相性が悪いので使わない）
export NODENV_ROOT="${NODENV_ROOT:-$HOME/.anyenv/envs/nodenv}"
export PATH="$NODENV_ROOT/shims:$NODENV_ROOT/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

NODE=""
if [ -x "$NODENV_ROOT/shims/node" ]; then
  NODE="$NODENV_ROOT/shims/node"
elif command -v node >/dev/null 2>&1; then
  NODE="$(command -v node)"
fi

if [ -z "$NODE" ]; then
  echo "node が見つかりません。PATH を確認してください。" >&2
  exit 127
fi

mkdir -p "$PROJECT_DIR/logs"
LOG="$PROJECT_DIR/logs/run.log"

echo "==== $(date '+%Y-%m-%d %H:%M:%S') start ====" >> "$LOG"
# scheduled: 毎日起動される前提。開始日(既定20日)以降・今月未取得のときだけDLする。
"$NODE" "$PROJECT_DIR/cli.js" scheduled >> "$LOG" 2>&1
NODE_EXIT=$?
echo "==== $(date '+%Y-%m-%d %H:%M:%S') end (exit=$NODE_EXIT) ====" >> "$LOG"
exit "$NODE_EXIT"
