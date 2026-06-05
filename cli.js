#!/usr/bin/env node
// 単体exe化(pkg)用のエントリポイント。サブコマンドを振り分ける。
//   cursor-receipts login              … ログインしてセッション保存
//   cursor-receipts download           … 請求書/領収書をDL（ヘッドレス）
//   cursor-receipts download --headed  … 画面を表示しながらDL（確認用）
//   cursor-receipts help               … ヘルプ

const { runLogin } = require('./login');
const { runDownload } = require('./download');

const HELP = `cursor-receipts - Cursorの請求書/領収書 自動DL

使い方:
  cursor-receipts login                 ログインしてセッションを保存（初回/失効時）
  cursor-receipts download              請求書・領収書をDL（自動実行向け）
  cursor-receipts download --headed     画面を表示しながらDL（動作確認用）
  cursor-receipts download --max N      直近N件をDL（既定1）
  cursor-receipts help                  このヘルプ

保存先: ユーザーのDownloadsフォルダ
`;

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
