const path = require('path');
const os = require('os');

// データの保存基準ディレクトリ。
// - 通常(node)実行: このファイルのあるフォルダ
// - pkgでexe化した場合: __dirname は読み取り専用の仮想FSになるため、exeのある実フォルダを使う
const BASE_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;

module.exports = {
  BASE_DIR,

  // 取り込んだログインセッション(Cookie等)の保存先
  AUTH_FILE: path.join(BASE_DIR, 'auth.json'),

  // ログイン用デバッグChromeのプロファイル/接続先
  DEBUG_PROFILE_DIR: path.join(BASE_DIR, '.chrome-debug'),
  CDP_ENDPOINT: 'http://localhost:9222',

  // 領収書/請求書PDFの保存先
  DOWNLOAD_DIR: path.join(os.homedir(), 'Downloads'),

  // デバッグ用スクリーンショット/ログの保存先
  ARTIFACTS_DIR: path.join(BASE_DIR, 'artifacts'),

  // 実行ログ・状態ファイルの保存先
  LOG_DIR: path.join(BASE_DIR, 'logs'),
  // 「その月に取得済みか」を記録するマーカー（成功した年月 "YYYY-MM" を書き込む）
  STATE_FILE: path.join(BASE_DIR, 'logs', '.last-success'),

  // 開始ページ（Cursorのダッシュボード）
  START_URL: 'https://cursor.com/dashboard',

  // Billing/設定ページの候補（環境差を吸収するため複数試す）
  BILLING_URLS: [
    'https://cursor.com/dashboard?tab=billing',
    'https://cursor.com/settings',
  ],
};
