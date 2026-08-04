const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const {chromium} = require('playwright');

const root = __dirname;
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitForHealth(baseUrl) {
  let lastError = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl + '/api/health');
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await pause(75);
  }
  throw lastError || new Error('workbench_preview_server_unavailable');
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'niannian-workbench-launcher-'));
  const port = 25000 + crypto.randomInt(1000);
  const baseUrl = 'http://127.0.0.1:' + port;
  const server = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root,
    env: {...process.env, PORT:String(port), DATA_DIR:path.join(tempRoot, 'data')},
    stdio:['ignore', 'ignore', 'ignore']
  });
  let browser = null;
  try {
    await waitForHealth(baseUrl);
    browser = await chromium.launch({headless:true});

    const desktop = await browser.newPage({viewport:{width:1280, height:900}});
    const apiRequests = [];
    desktop.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === baseUrl && url.pathname.startsWith('/api/')) apiRequests.push(url.pathname);
    });
    await desktop.goto(baseUrl + '/#workbench', {waitUntil:'domcontentloaded'});
    await desktop.locator('.workbench-launcher').waitFor({state:'visible'});
    const cards = desktop.locator('.workbench-launch-card');
    assert.equal(await cards.count(), 3, 'workbench must expose exactly three launch cards');
    assert.equal(await desktop.locator('[data-workbench-project]').count(), 0, 'workbench must not regress into a project dashboard');
    assert.deepEqual(apiRequests, ['/api/auth/session'], 'anonymous workbench may only check the current session');
    const desktopGeometry = await desktop.evaluate(() => Array.from(document.querySelectorAll('.workbench-launch-card')).map(card => {
      const box = card.getBoundingClientRect();
      return {width:Math.round(box.width), height:Math.round(box.height)};
    }));
    assert(desktopGeometry.every(box => box.width > 240 && box.height > 180), 'desktop launch cards must remain stable and usable');

    const canvasEntry = desktop.locator('.workbench-launcher [data-open-formal-studio]');
    assert.equal(await canvasEntry.count(), 1, 'workbench must expose one formal studio entry');
    await canvasEntry.click();
    await desktop.waitForURL('**/studio/');

    await desktop.goto(baseUrl + '/#workbench', {waitUntil:'domcontentloaded'});
    const redrawEntry = desktop.locator('.workbench-launcher [data-open-project-wizard]');
    assert.equal(await redrawEntry.count(), 1, 'workbench must expose one redraw entry');
    await redrawEntry.click();
    await desktop.locator('#modalBackdrop').waitFor({state:'visible'});
    assert.equal((await desktop.locator('#modalTitle').innerText()).trim(), '登录念念 AI', 'anonymous redraw entry must preserve the login boundary');
    await desktop.locator('#modalClose').click();

    const scriptEntry = desktop.locator('.workbench-launcher [data-open-script-drama-wizard]');
    assert.equal(await scriptEntry.count(), 1, 'workbench must expose one script entry');
    await scriptEntry.click();
    await desktop.locator('#modalBackdrop').waitFor({state:'visible'});
    assert.equal((await desktop.locator('#modalTitle').innerText()).trim(), '登录念念 AI', 'anonymous script entry must preserve the login boundary');
    await desktop.locator('#modalClose').click();
    const desktopDimensions = await desktop.evaluate(() => ({scrollWidth:document.documentElement.scrollWidth, viewportWidth:window.innerWidth}));
    assert(desktopDimensions.scrollWidth <= desktopDimensions.viewportWidth, 'desktop workbench must not overflow horizontally');
    await desktop.close();

    const mobile = await browser.newPage({viewport:{width:390, height:844}});
    await mobile.goto(baseUrl + '/#workbench', {waitUntil:'domcontentloaded'});
    await mobile.locator('.workbench-launch-card').first().waitFor({state:'visible'});
    const mobileGeometry = await mobile.evaluate(() => ({
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:window.innerWidth,
      cards:Array.from(document.querySelectorAll('.workbench-launch-card')).map(card => {
        const box = card.getBoundingClientRect();
        return {width:Math.round(box.width), height:Math.round(box.height)};
      })
    }));
    assert.equal(mobileGeometry.cards.length, 3, 'mobile workbench must keep all three launch cards');
    assert(mobileGeometry.cards.every(box => box.width > 280 && box.height > 160), 'mobile launch cards must remain stable and usable');
    assert(mobileGeometry.scrollWidth <= mobileGeometry.viewportWidth, 'mobile workbench must not overflow horizontally');
    await mobile.close();

    await browser.close();
    browser = null;
    console.log(JSON.stringify({ok:true, verified:['three fixed workbench creation entries', 'formal studio route entry', 'anonymous redraw and script login boundary', 'desktop stable layout without overflow', 'mobile stacked layout without overflow']}));
  } finally {
    if (browser) await browser.close();
    server.kill();
    await fs.rm(tempRoot, {recursive:true, force:true});
  }
}

main().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
