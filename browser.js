// 取り込み済みセッション(auth.json)で本物のChromeを起動する共通処理。
// Google認証は行わない(Cookie流用)ため、ヘッドレスでも問題なく動く。
const fs = require('fs');
const { chromium } = require('playwright-core');
const { findChrome } = require('./chrome-path');
const { AUTH_FILE } = require('./config');

// 検出したChromeを優先的に使い、見つからなければ channel:'chrome' にフォールバック
function chromeLaunchOpts() {
  const exe = findChrome();
  return exe ? { executablePath: exe } : { channel: 'chrome' };
}

async function launchWithAuth({ headless, slowMo = 0 }) {
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(
      `セッションファイルがありません: ${AUTH_FILE}\n` +
        '先に `npm run login` を実行してログインしてください。'
    );
  }
  const browser = await chromium.launch({
    headless,
    slowMo,
    ...chromeLaunchOpts(),
  });
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  return { browser, context };
}

module.exports = { launchWithAuth };
