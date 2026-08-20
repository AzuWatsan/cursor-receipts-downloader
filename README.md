# cursor-receipts-downloader

Cursor の **請求書（invoice）** と **領収書（receipt）** の PDF を、毎月決まった日時に自動でダウンロードするスクリプトです。

- 対応 OS: **macOS / Windows**
- 取得元: [cursor.com](https://cursor.com) → Billing → Stripe カスタマーポータル
- 保存先: 各ユーザーの **Downloads** フォルダ
- 既定スケジュール: **毎日 11:00 に起動**し、**毎月 20 日以降でその月をまだ取得していなければ** DL。**成功するまで翌日以降も毎日リトライ**し、成功したらその月は以降スキップします。

会社契約でメール通知が来ない場合でも、ブラウザから手動で取れる領収書を自動化する用途を想定しています。

---

## 仕組み（なぜこうなっているか）

Google SSO は **自動操作ブラウザでのログインをブロック** します（「サインインできません」等）。

そのため本ツールは次の流れです。

1. **初回だけ** 人間が Chrome で Cursor にログインする（`npm run login`）
2. ログイン状態（Cookie）を `auth.json` に保存する
3. 以降は `auth.json` を使い、**Google ログインなし** で PDF を DL する

パスワードは保存しません。保存するのは「ログイン済みセッション」だけです（ブラウザにログインしっぱなしにしているのと同程度のリスク）。

---

## 前提

| 項目 | 内容 |
|---|---|
| Node.js | v18 以上推奨（[nodejs.org](https://nodejs.org/)） |
| Google Chrome | インストール済み（Playwright 同梱 Chromium は使いません） |
| Cursor アカウント | 請求画面（Billing）にアクセスできる権限 |

---

## クイックスタート

```bash
# 1. フォルダに移動して依存関係を入れる
cd cursor-receipts-downloader
npm install

# 2. ログイン（Chrome が開く → Google SSO で Cursor にログイン → 自動で保存）
npm run login

# 3. 動作確認（ブラウザが見えるモード）
npm run download:headed
```

`Downloads` に次のようなファイルが出れば成功です。

- `cursor_invoice_..._Invoice-....pdf`（請求書）
- `cursor_receipt_..._Receipt-....pdf`（領収書）

---

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `npm run login` | Chrome を起動し、手動ログイン後に `auth.json` を保存 |
| `npm run download` | 請求書・領収書を DL（手動・毎回実行） |
| `npm run download:headed` | 上記と同じだが Chrome を表示（デバッグ用） |
| `node cli.js scheduled` | 自動実行向け。開始日(既定20日)以降・その月が未取得のときだけ DL |
| `node cli.js help` | ヘルプ表示 |

### オプション

```bash
# 直近 3 件分を DL（既定は 1 件＝最新のみ）
node cli.js download --max 3

# Windows (cmd)
set MAX_INVOICES=3 && npm run download
```

---

## 自動実行の登録（毎日 11:00 起動 / 20日以降・未取得の月のみDL）

毎日 11:00 に起動し、`cli.js scheduled` が「今日が開始日（既定 20 日）以降」かつ「その月をまだ取得していない」場合だけ DL します。失敗した日は記録を残さないので、**成功するまで翌日以降も毎日再試行**します。成功すると `logs/.last-success` にその年月を記録し、以降その月は起動してもスキップします。

開始日を変えたい場合は環境変数 `START_DAY`（例: `START_DAY=25`）で調整できます。

### macOS

```bash
chmod +x schedule-mac.sh run.sh
./schedule-mac.sh
```

- 登録名: `com.cursor-receipts.<ユーザー名>`（配置パスから自動生成）
- ログ: `logs/run.log`, `logs/launchd.out.log`, `logs/launchd.err.log`

**今すぐテスト実行**

```bash
launchctl start com.cursor-receipts.$(whoami)
```

**解除**

```bash
launchctl unload ~/Library/LaunchAgents/com.cursor-receipts.$(whoami).plist
rm ~/Library/LaunchAgents/com.cursor-receipts.$(whoami).plist
```

※ 既に別名の plist（`com.azwatanabe.cursor-receipts` 等）を登録している場合は、重複登録しないようどちらか一方だけ使ってください。

### Windows

1. `schedule-windows.bat` を **右クリック** → **管理者として実行**
2. タスク名 `CursorReceipts` が毎日 11:00 に登録されます（実際の DL は 20 日以降・未取得の月のみ）
3. ログ: `logs\run.log`

**今すぐテスト実行**

```cmd
schtasks /Run /TN CursorReceipts
```

**解除**

`unschedule-windows.bat` を実行（または管理者 cmd で `schtasks /Delete /TN CursorReceipts /F`）。

---

## ファイル構成

```
cursor-receipts-downloader/
├── cli.js              # エントリ（login / download / scheduled を振り分け）
├── login.js            # 手動ログイン → auth.json 保存
├── download.js         # Stripe から PDF DL（失敗時は自動リトライ）
├── browser.js          # Chrome 起動（auth.json 利用）
├── chrome-path.js      # OS 別 Chrome パス検出
├── config.js           # 保存先・URL など
├── package.json
├── run.sh / run.bat    # スケジューラから呼ぶラッパー
├── schedule-mac.sh
├── schedule-windows.bat
├── unschedule-windows.bat
├── README.md
│
├── auth.json           # ★ ログイン後に自動生成（配布しない）
├── .chrome-debug/      # ログイン用 Chrome プロファイル（自動生成）
├── artifacts/          # 失敗時のスクショ・HTML（デバッグ用）
└── logs/               # 実行ログ / .last-success（取得済みの月を記録）
```

---

## トラブルシューティング

### 「セッションが見つかりません」「セッションが切れている」

```bash
npm run login
```

を再実行してください。数ヶ月に一度、Cursor 側でセッションが失効します。

### Google で「サインインできません」

`npm run login` 実行時は **人間が手で** Chrome にログインします。自動操作ではないので、通常は通ります。  
それでも失敗する場合は会社の SSO（Okta 等）の追加認証を完了してから、ダッシュボードが表示されるまで待ってください。

### PDF が 1 つしか落ちない（請求書だけ / 領収書だけ）

`npm run download:headed` で画面を見ながら再実行し、`artifacts/` 内の `invoice-page.png` を確認してください。Stripe の UI 変更時は `download.js` のボタン文言の調整が必要になることがあります。

### 自動実行されない / ページ読み込みでタイムアウトする

- **mac**: 20 日に Mac がスリープ・電源 OFF だと当日は実行されないことがあります（起動後に遅延実行される場合あり）。その場合でも **翌日以降 11:00 に毎日再試行**し、成功したらその月は止まります。
- 1 回の実行の中でも、スリープ復帰直後に回線が繋がる前に起動してページ読み込みがタイムアウトすることがあります。そのため既定で **20 秒間隔・最大 3 回** 自動リトライします。挙動は環境変数で調整できます。
  - `MAX_ATTEMPTS`（既定 3）: 試行回数
  - `RETRY_DELAY_MS`（既定 20000）: リトライ間隔(ms)
  - `NAV_TIMEOUT_MS`（既定 60000）: ダッシュボード読み込み待ちの上限(ms)
- **Windows**: タスクスケジューラで「ログオンしているときのみ実行」等の条件を確認
- ログ `logs/run.log` を確認

### `node` が見つからない（スケジューラ実行時）

ターミナルでは動くが自動実行だけ失敗する場合、Node の PATH が通っていません。  
`run.sh` / `run.bat` は nodenv / nvm / Homebrew 等を想定していますが、それでもダメな場合は `run.bat` 内の `node` をフルパスに書き換えてください。

---

## セキュリティ上の注意

- **`auth.json` はログインセッション（合鍵）** です。他人に渡さない・Git にコミットしない・クラウド同期フォルダに置かないでください。
- 配布 ZIP には `auth.json` を **含めない** でください（各自が `npm run login` で作成します）。
- Mac では `auth.json` を可能な限り自分だけが読める権限（600）にしています。
- 退職・漏洩が疑われる場合は、Cursor の設定から **全セッションをログアウト** すると `auth.json` も無効化されます。

---

## チームへ配布するとき

1. `cursor-receipts-downloader-scripts.zip`（またはリポジトリ内のスクリプト一式）を渡す  
   **含めないもの:** `auth.json`, `node_modules`, `.chrome-debug`, `artifacts`, `logs`
2. 受け取った人が実行:

   ```bash
   unzip cursor-receipts-downloader-scripts.zip -d cursor-receipts-downloader
   cd cursor-receipts-downloader
   npm install
   npm run login
   npm run download:headed
   ```

3. 問題なければ OS に応じて `schedule-mac.sh` または `schedule-windows.bat` で自動実行を登録

---

## ライセンス・免責

社内・個人利用を想定した非公式ツールです。Cursor / Stripe の利用規約・画面変更により動作しなくなる可能性があります。  
問題があれば `artifacts/` のスクショと `logs/run.log` を添えて報告してください。
