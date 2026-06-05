// OS別に Google Chrome の実行ファイルパスを検出する（mac / Windows / Linux 対応）。
const fs = require('fs');
const path = require('path');

function candidates() {
  const platform = process.platform;
  if (platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    ];
  }
  if (platform === 'win32') {
    const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
    const pfx86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const local = process.env['LOCALAPPDATA'] || path.join(process.env.USERPROFILE || 'C:\\', 'AppData', 'Local');
    return [
      path.join(pf, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(pfx86, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(local, 'Google\\Chrome\\Application\\chrome.exe'),
    ];
  }
  // linux
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/opt/google/chrome/chrome',
  ];
}

function findChrome() {
  for (const p of candidates()) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (e) {
      /* noop */
    }
  }
  return null; // 見つからなければ null（呼び出し側で channel:'chrome' にフォールバック）
}

module.exports = { findChrome };
