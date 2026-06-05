// ログイン＆セッション取り込み（mac / Windows 共通）。
//
// 1. Google Chrome をデバッグポート付き・専用プロファイルで自動起動
// 2. 開いたウィンドウで普段どおり Cursor にログイン（人間の手操作なのでGoogleに弾かれない）
// 3. ログインを検知したら自動でセッション(auth.json)を保存してChromeを閉じる
//
// これ1つで完結します（旧 chrome-debug.sh + capture-session.js の統合版）。

const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright-core');
const { findChrome } = require('./chrome-path');
const {
  AUTH_FILE,
  DEBUG_PROFILE_DIR,
  CDP_ENDPOINT,
  START_URL,
} = require('./config');

const DEBUG_PORT = 9222;
const LOGIN_COOKIE = 'WorkosCursorSessionToken'; // cursor.com のログイン判定に使う
const POLL_INTERVAL_MS = 3000;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5分

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[login]', ...a);

async function connectWithRetry(maxMs = 30000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < maxMs) {
    try {
      return await chromium.connectOverCDP(CDP_ENDPOINT);
    } catch (e) {
      lastErr = e;
      await sleep(1000);
    }
  }
  throw lastErr || new Error('CDP接続に失敗しました');
}

async function runLogin() {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error('Google Chrome が見つかりませんでした。Chromeをインストールしてから再実行してください。');
  }

  fs.mkdirSync(DEBUG_PROFILE_DIR, { recursive: true });

  log('Chromeを起動します。開いたウィンドウでCursorにログインしてください。');
  const child = spawn(
    chromePath,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${DEBUG_PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      START_URL,
    ],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();

  let browser;
  try {
    browser = await connectWithRetry();
  } catch (e) {
    throw new Error('起動したChromeに接続できませんでした: ' + e.message);
  }

  try {
    const context = browser.contexts()[0] || (await browser.newContext());

    log('ログイン待機中... (最大5分) 完了すると自動で保存します。');
    const start = Date.now();
    let loggedIn = false;
    while (Date.now() - start < LOGIN_TIMEOUT_MS) {
      const cookies = await context.cookies('https://cursor.com').catch(() => []);
      if (cookies.some((c) => c.name === LOGIN_COOKIE && c.value)) {
        loggedIn = true;
        break;
      }
      await sleep(POLL_INTERVAL_MS);
    }

    if (!loggedIn) {
      throw new Error('時間内にログインを検知できませんでした。もう一度実行してください。');
    }

    // セッションが確実に行き渡るよう一度cursor.comを開いてから保存
    const page = await context.newPage();
    await page.goto(START_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(1500);

    await context.storageState({ path: AUTH_FILE });
    try {
      if (process.platform !== 'win32') fs.chmodSync(AUTH_FILE, 0o600);
    } catch (e) {
      /* noop */
    }

    const all = await context.cookies().catch(() => []);
    log(`セッションを保存しました: ${AUTH_FILE} (cookies: ${all.length}件)`);
    log('Chromeを閉じます。動作確認は download --headed でどうぞ。');
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { runLogin };

// 単体実行（node login.js）にも対応
if (require.main === module) {
  runLogin().then(
    () => process.exit(0),
    (e) => {
      console.error('[login] エラー:', e.message);
      process.exit(1);
    }
  );
}
