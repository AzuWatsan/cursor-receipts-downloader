// 領収書(receipt)・請求書(invoice)の自動DLスクリプト。
// 事前に `npm run login` でログイン済みであることが前提です。
//
// 環境変数:
//   HEADLESS=false      画面表示モードで実行（初回の動作確認・デバッグ用）
//   MAX_INVOICES=1      DL対象の請求書件数（新しい順。既定=1）
//   SLOWMO=0            操作のスローモーション(ms)。デバッグ時に便利

const fs = require('fs');
const path = require('path');
const { launchWithAuth } = require('./browser');
const {
  AUTH_FILE,
  DOWNLOAD_DIR,
  ARTIFACTS_DIR,
  START_URL,
  BILLING_URLS,
} = require('./config');

// DL件数（新しい順）。runDownload で上書きされる。
let MAX_INVOICES = parseInt(process.env.MAX_INVOICES || '1', 10);
const SLOWMO = parseInt(process.env.SLOWMO || '0', 10);

const ts = () => new Date().toISOString().replace(/[:.]/g, '-');
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function snap(page, name) {
  try {
    ensureDir(ARTIFACTS_DIR);
    const base = path.join(ARTIFACTS_DIR, `${ts()}_${name}`);
    await page.screenshot({ path: `${base}.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`${base}.html`, html);
    log(`debug saved: ${base}.png / .html  (url=${page.url()})`);
  } catch (e) {
    log('snap failed:', e.message);
  }
}

async function saveDownload(download, label) {
  ensureDir(DOWNLOAD_DIR);
  const filename = download.suggestedFilename() || `${label}.pdf`;
  const dest = path.join(DOWNLOAD_DIR, filename);
  await download.saveAs(dest);
  log(`saved: ${dest}`);
  return dest;
}

// ページ内から「Stripeカスタマーポータル / 請求管理」へ遷移するリンクを探してクリック
async function gotoStripePortal(context, page) {
  // すでにStripe上ならそのまま
  if (/stripe\.com/.test(page.url())) return page;

  const candidates = [
    'Manage subscription',
    'Manage billing',
    'Manage Billing',
    'Billing',
    'Invoices',
    'View invoices',
    'Manage',
    '請求',
    '請求情報',
    'お支払い',
  ];

  for (const url of BILLING_URLS) {
    try {
      log(`open billing page: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    } catch (e) {
      log('goto failed:', url, e.message);
      continue;
    }
    await snap(page, 'billing-page');

    for (const text of candidates) {
      const link = page.getByRole('link', { name: new RegExp(text, 'i') })
        .or(page.getByRole('button', { name: new RegExp(text, 'i') }));
      const count = await link.count().catch(() => 0);
      if (count > 0) {
        log(`click candidate: "${text}"`);
        const [popup] = await Promise.all([
          context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
          link.first().click().catch(() => null),
        ]);
        const target = popup || page;
        await target.waitForLoadState('domcontentloaded').catch(() => {});
        await target.waitForTimeout(2500);
        if (/stripe\.com/.test(target.url())) {
          log('reached Stripe portal:', target.url());
          return target;
        }
      }
    }
  }

  // 最後の手段: 既に開いているページの中でstripeのものを探す
  for (const p of context.pages()) {
    if (/stripe\.com/.test(p.url())) return p;
  }
  return page;
}

// Stripeポータル/請求書ページから invoice / receipt のPDFをDL
async function downloadFromStripe(context, portal) {
  await portal.waitForTimeout(1500);
  await snap(portal, 'stripe-portal');

  // Stripeポータルでは各invoiceがリンク or 行クリックで invoice.stripe.com へ遷移する
  let invoiceHrefs = await portal
    .locator('a[href*="invoice.stripe.com"]')
    .evaluateAll((els) => Array.from(new Set(els.map((e) => e.href))).filter(Boolean))
    .catch(() => []);

  log(`found ${invoiceHrefs.length} candidate invoice link(s)`);

  if (invoiceHrefs.length === 0) {
    // リンクで取れない場合は、行クリックで詳細へ入る方式を試す
    log('no direct invoice links; trying to click rows');
    const rows = portal.locator('tr, [role="row"], a').filter({ hasText: /\$|¥|JPY|USD|Paid|支払/ });
    const rowCount = Math.min(await rows.count().catch(() => 0), MAX_INVOICES);
    for (let i = 0; i < rowCount; i++) {
      const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
        rows.nth(i).click().catch(() => null),
      ]);
      const detail = popup || portal;
      await detail.waitForLoadState('domcontentloaded').catch(() => {});
      await downloadOnInvoicePage(detail);
      if (popup) await popup.close().catch(() => {});
    }
    return;
  }

  const targets = invoiceHrefs.slice(0, MAX_INVOICES);
  for (const href of targets) {
    log(`open invoice page: ${href}`);
    const detail = await context.newPage();
    await detail.goto(href, { waitUntil: 'load' }).catch((e) => log('open fail', e.message));
    await downloadOnInvoicePage(detail);
    await detail.close().catch(() => {});
  }
}

const BTN = {
  invoice: /請求書をダウンロード|download invoice/i,
  receipt: /領収書をダウンロード|download receipt/i,
};

// invoice.stripe.com の請求書ページ上で「請求書PDF」「領収書PDF」をDL
async function downloadOnInvoicePage(page) {
  // JS描画が重いので、DLボタンが現れるまで待つ
  const anyBtn = page
    .getByRole('button', { name: BTN.invoice })
    .or(page.getByRole('link', { name: BTN.invoice }))
    .or(page.getByRole('button', { name: BTN.receipt }))
    .or(page.getByRole('link', { name: BTN.receipt }));
  try {
    await anyBtn.first().waitFor({ state: 'visible', timeout: 30000 });
  } catch (e) {
    log('DLボタンの表示待ちでタイムアウト:', e.message);
  }
  await page.waitForTimeout(500);
  await snap(page, 'invoice-page');

  for (const [label, re] of Object.entries(BTN)) {
    const link = page.getByRole('button', { name: re }).or(page.getByRole('link', { name: re }));
    const cnt = await link.count().catch(() => 0);
    if (cnt === 0) {
      log(`"${label}" のボタンが見つかりませんでした`);
      continue;
    }
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        link.first().click(),
      ]);
      await saveDownload(download, label);
    } catch (e) {
      log(`"${label}" のDLに失敗:`, e.message);
    }
  }
}

// 領収書/請求書をDLする。成功時は何も投げず、致命的問題は Error を投げる。
async function runDownload(opts = {}) {
  const headed = !!opts.headed || process.env.HEADLESS === 'false';
  if (typeof opts.maxInvoices === 'number' && opts.maxInvoices > 0) {
    MAX_INVOICES = opts.maxInvoices;
  }

  ensureDir(ARTIFACTS_DIR);
  ensureDir(DOWNLOAD_DIR);

  if (!fs.existsSync(AUTH_FILE)) {
    const err = new Error('セッションが見つかりません。先に login を実行してください。');
    err.code = 'NO_SESSION';
    throw err;
  }

  const { browser, context } = await launchWithAuth({ headless: !headed, slowMo: SLOWMO });
  const page = context.pages()[0] || (await context.newPage());

  try {
    log('open dashboard:', START_URL);
    await page.goto(START_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await snap(page, 'dashboard');

    // ログイン状態チェック（セッション切れでログイン画面に飛ばされていないか）
    if (/sign-?in|login|authenticator|auth0|accounts\.google/i.test(page.url())) {
      const err = new Error(
        'セッションが切れている可能性があります。login で再ログインしてください。 url=' + page.url()
      );
      err.code = 'SESSION_EXPIRED';
      throw err;
    }

    const portal = await gotoStripePortal(context, page);
    await downloadFromStripe(context, portal);

    log('完了しました。DLされたファイルは', DOWNLOAD_DIR, 'を確認してください。');
  } catch (e) {
    await snap(page, 'error').catch(() => {});
    throw e;
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { runDownload };

// 単体実行（node download.js [--headed]）にも対応
if (require.main === module) {
  const headed = process.argv.includes('--headed');
  runDownload({ headed }).then(
    () => process.exit(0),
    (e) => {
      log('エラー:', e.stack || e.message);
      process.exit(1);
    }
  );
}
