'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const mvp = fs.readFileSync(path.join(root, 'mvp.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const storyUi = fs.readFileSync(path.join(root, 'mvp-step01-story-r1.js'), 'utf8');
const storyAuthority = fs.readFileSync(path.join(root, 'bridge', 'niannian_step01_story_authority.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));

assert.equal(manifest.name, '念念 AI');
assert.equal(manifest.start_url, '/#home');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some(icon => icon.src === '/assets/brand/niannian-ai-fused-monogram-v6-brand-pink.png' && icon.type === 'image/png' && icon.sizes === '3840x3840'));
assert.match(index, /rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(index, /id="connectionStatus"/);
assert.match(index, /assets\/brand\/niannian-ai-mark-transparent\.svg/);
assert.match(index, /rel="icon" href="\.\/assets\/brand\/niannian-ai-mark-transparent\.svg" type="image\/svg\+xml"/);
assert.match(index, /hero-oil-paint\.css\?v=20260727-media-direct-r1/);
assert.match(index, /id="fluidCanvas"/);
assert.doesNotMatch(index, /id="heroVideo"/);
assert.doesNotMatch(index, /niannian-hero-oil-vortex-loop-v2\.mp4/);
assert.doesNotMatch(index, />AI 影像生产</);
assert.doesNotMatch(index, /把创意沿着真实制作流程推进成片。/);
assert.doesNotMatch(index, />查看流程</);
assert.match(index, /styles\.css\?v=20260728-header-logo-removed-r1/);
assert.match(index, /app\.js\?v=20260802-workbench-launcher-r1/);
assert.match(index, /mvp-step02-r13\.js\?v=20260802-workbench-launcher-r1/);
assert.match(index, /canvas\.css\?v=20260802-project-media-canvas-r1/);
assert.match(index, /canvas\.js\?v=20260802-project-media-canvas-r1/);
assert.match(index, /mvp-step03-r1\.js\?v=20260727-step05-reference-dual-track-r1/);
assert.match(index, /product\.css\?v=20260727-step05-reference-dual-track-r1/);
assert.match(index, /mvp-source-truth-r1\.js\?v=20260727-media-direct-r1/);
assert.match(index, /product-system\.css\?v=20260727-media-direct-r1/);

assert.match(app, /navigator\.serviceWorker\.register\("\/sw\.js\?v=" \+ serviceWorkerRelease, \{ scope: "\/" \}\)/);
assert.match(app, /const serviceWorkerRelease = "20260802-workbench-launcher-r1"/);
assert.match(app, /const fluidCanvas = document\.querySelector\("#fluidCanvas"\)/);
assert.match(app, /function createFluidRenderer\(canvas\)/);
assert.match(app, /canvas\.getContext\("webgl"/);
assert.match(app, /const createFallback = \(\) => \{/);
assert.match(app, /function syncHeroRenderer\(\)/);
assert.doesNotMatch(app, /const heroVideo = document\.querySelector\("#heroVideo"\)/);
assert.match(app, /navigator\.serviceWorker\.addEventListener\("controllerchange"/);
assert.match(app, /const hadServiceWorkerController = Boolean\(navigator\.serviceWorker\.controller\)/);
assert.match(app, /if \(!hadServiceWorkerController\) return;/);
assert.match(app, /niannian:service-worker-controller:/);
assert.match(app, /window\.location\.reload\(\)/);
assert.match(app, /function updateConnectionStatus\(\)/);
assert.match(app, /window\.addEventListener\("offline", updateConnectionStatus\)/);
assert.match(app, /new CustomEvent\("niannian:network-restored"\)/);
assert.match(mvp, /window\.addEventListener\('niannian:network-restored'/);
assert.match(mvp, /reconcileProjectEvents\(\{source:'network-restored'\}\)/);

assert.match(worker, /const CACHE_NAME = 'niannian-app-shell-20260802-workbench-launcher-r1';/);
assert.match(worker, /const APP_SHELL = \[/);
assert.match(worker, /'\/product-system\.css\?v=20260727-media-direct-r1'/);
assert.match(worker, /'\/hero-oil-paint\.css\?v=20260727-media-direct-r1'/);
assert.match(worker, /'\/styles\.css\?v=20260728-header-logo-removed-r1'/);
assert.match(worker, /'\/app\.js\?v=20260802-workbench-launcher-r1'/);
assert.match(worker, /'\/mvp-step02-r13\.js\?v=20260802-workbench-launcher-r1'/);
assert.match(worker, /'\/canvas\.css\?v=20260802-project-media-canvas-r1'/);
assert.match(worker, /'\/canvas\.js\?v=20260802-project-media-canvas-r1'/);

const publicWorkbenchRelease = '20260802-workbench-launcher-r1';
const indexAppRelease = index.match(/app\.js\?v=([^"']+)/)?.[1];
const indexWorkbenchRelease = index.match(/mvp-step02-r13\.js\?v=([^"']+)/)?.[1];
const workerAppRelease = worker.match(/app\.js\?v=([^"']+)/)?.[1];
const workerWorkbenchRelease = worker.match(/mvp-step02-r13\.js\?v=([^"']+)/)?.[1];
const workerCacheRelease = worker.match(/const CACHE_NAME = 'niannian-app-shell-([^']+)'/)?.[1];
const appWorkerRelease = app.match(/const serviceWorkerRelease = "([^"]+)"/)?.[1];

assert.equal(indexAppRelease, publicWorkbenchRelease, 'index must request the current service-worker registrar release');
assert.equal(indexWorkbenchRelease, publicWorkbenchRelease, 'index must request the current workbench release');
assert.equal(workerAppRelease, publicWorkbenchRelease, 'service worker must precache the current registrar release');
assert.equal(workerWorkbenchRelease, publicWorkbenchRelease, 'service worker must precache the current workbench release');
assert.equal(workerCacheRelease, publicWorkbenchRelease, 'cache name must rotate with the workbench release');
assert.equal(appWorkerRelease, publicWorkbenchRelease, 'service worker registration must rotate with the workbench release');
assert.match(worker, /'\/product\.css\?v=20260727-media-direct-r1'/);
assert.match(worker, /'\/mvp-step01-story-r1\.js\?v=20260727-media-direct-r1'/);
assert.match(worker, /'\/mvp-source-truth-r1\.js\?v=20260727-media-direct-r1'/);
assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/);
assert.match(worker, /url\.pathname\.startsWith\('\/assets\/'\)/);
assert.match(worker, /event\.respondWith\(fetch\(request\)\)/);
assert.match(worker, /request\.mode === 'navigate'/);
assert.match(worker, /caches\.match\('\/index\.html'\)/);
assert.doesNotMatch(worker, /cache\.put\(/);
assert.doesNotMatch(worker, /caches\.open\([^)]*\)\.then\([^)]*=>[^)]*cache\.put/);
assert.match(storyUi, /1\. 角色卡/);
assert.match(storyUi, /2\. 权威剧情大纲/);
assert.match(storyUi, /step01\/role-cards/);
assert.match(storyUi, /if\(!state\.roles&&state\.story\)/);
assert.match(storyUi, /role-card-evidence/);
assert.doesNotMatch(storyUi, /data-role-confirm/);
assert.match(storyUi, /step01\/ledger-frames/);
assert.doesNotMatch(storyUi, /step01-evidence'\)\]/);
assert.match(server, /step01RoleCardAuthority/);
assert.match(server, /serveProjectStep01LedgerFrame/);
assert.match(storyAuthority, /STEP01_STORY_IMPORTANT_ROLE_UNCONFIRMED/);

assert.match(server, /'\.webmanifest':'application\/manifest\+json; charset=utf-8'/);
assert.match(server, /\['index\.html','mvp\.js','app\.js','sw\.js','manifest\.webmanifest','product\.css','product-system\.css'\]/);

console.log(JSON.stringify({
  ok:true,
  verified:[
    'installable manifest metadata',
    'offline shell registration',
    'offline status copy',
    'online state refresh event',
    'API and project media cache exclusion',
    'network-first navigation fallback',
    'manifest MIME and service-worker no-store headers'
  ]
}));
