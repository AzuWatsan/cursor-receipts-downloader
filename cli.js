#!/usr/bin/env node
// 単体exe化(pkg)用のエントリポイント。サブコマンドを振り分ける。
//   cursor-receipts login              … ログインしてセッション保存
//   cursor-receipts download           … 請求書/領収書をDL（ヘッドレス）
//   cursor-receipts download --headed  … 画面を表示しながらDL（確認用）
//   cursor-receipts help               … ヘルプ

const fs = require('fs');
const path = require('path');
const { runLogin } = require('./login');
const { runDownload } = require('./download');
const { STATE_FILE } = require('./config');

// スケジュール実行で「この日以降だけDLを試みる」開始日（既定20日）。
const START_DAY = parseInt(process.env.START_DAY || '20', 10);

const HELP = `cursor-receipts - Cursorの請求書/領収書 自動DL

使い方:
  cursor-receipts login                 ログインしてセッションを保存（初回/失効時）
  cursor-receipts download              請求書・領収書をDL（手動・毎回実行）
  cursor-receipts download --headed     画面を表示しながらDL（動作確認用）
  cursor-receipts download --max N      直近N件をDL（既定1）
  cursor-receipts scheduled             自動実行向け（開始日以降・今月未取得なら実行）
  cursor-receipts help                  このヘルプ

保存先: ユーザーのDownloadsフォルダ
`;

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function readMarker() {
  try {
    return fs.readFileSync(STATE_FILE, 'utf8').trim();
  } catch {
    return '';
  }
}

function writeMarker(value) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, value);
}

// 自動実行用。毎日起動される前提で、
//   - 開始日(START_DAY)より前 → 何もしない
//   - 今月すでに取得済み       → 何もしない
//   - それ以外                 → DL実行。成功したら今月分として記録し、以降スキップ。
// 失敗時は記録を残さないので、翌日また試行される（成功するまで毎日再試行）。
async function runScheduled(args) {
  const now = new Date();
  const month = monthKey(now);
  const day = now.getDate();

  if (day < START_DAY) {
    console.log(`[scheduled] ${day}日は開始日(${START_DAY}日)より前のためスキップします。`);
    return;
  }
  if (readMarker() === month) {
    console.log(`[scheduled] 今月(${month})は取得済みのためスキップします。`);
    return;
  }

  console.log(`[scheduled] ${month} の取得を試みます（開始日${START_DAY}日 / 今日${day}日）。`);
  await runDownload({
    headed: args.includes('--headed'),
    maxInvoices: parseMax(args),
  });
  writeMarker(month);
  console.log(`[scheduled] 取得に成功しました。今月(${month})は以降スキップします。`);
}

function parseMax(args) {
  const i = args.indexOf('--max');
  if (i !== -1 && args[i + 1]) {
    const n = parseInt(args[i + 1], 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return undefined;
}

(async () => {
  const [cmd, ...args] = process.argv.slice(2);

  try {
    switch (cmd) {
      case 'login':
        await runLogin();
        break;

      case 'download':
        await runDownload({
          headed: args.includes('--headed'),
          maxInvoices: parseMax(args),
        });
        break;

      case 'scheduled':
        await runScheduled(args);
        break;

      case undefined:
      case 'help':
      case '-h':
      case '--help':
        console.log(HELP);
        break;

      default:
        console.error(`不明なコマンド: ${cmd}\n`);
        console.log(HELP);
        process.exit(2);
    }
    process.exit(0);
  } catch (e) {
    console.error('エラー:', e.message);
    process.exit(1);
  }
})();
