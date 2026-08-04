'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const baseStaticFiles = [
  'index.html',
  'app.js',
  'mvp.js',
  'mvp-step02-r13.js',
  'mvp-step03-r1.js',
  'mvp-step01-ledger-r1.js',
  'mvp-step01-story-r1.js',
  'mvp-source-truth-r1.js',
  'styles.css',
  'product.css',
  'product-system.css',
  'hero-oil-paint.css',
  'sw.js',
  'manifest.webmanifest',
  'vendor/gsap-3.13.0.min.js',
  'vendor/gsap-flip-3.13.0.min.js',
  'assets/home/niannian-hero-oil-paint-quiet-v1.png',
  'assets/showcase/short-drama-keyart-v1.png',
  'assets/showcase/animation-drama-keyart-v1.png',
  'assets/showcase/redraw-keyart-partial-xuedi-v1.png'
];

function activeBrandAssetFromPackage(packageRoot) {
  const indexHtml = fs.readFileSync(path.join(packageRoot, 'index.html'), 'utf8');
  const imageTag = [...indexHtml.matchAll(/<img\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => /\bclass=(['"])[^'"]*\bbrand-monogram\b[^'"]*\1/i.test(tag));
  const src = imageTag?.match(/\bsrc=(['"])([^'"]+)\1/i)?.[2] || '';
  const normalized = src.replace(/^\.?(?:\/|\\)/, '').replace(/\\/g, '/');
  if (!normalized.startsWith('assets/brand/') || normalized.includes('..')) throw new Error('candidate_runtime_active_brand_asset_invalid');
  return normalized;
}

function readBounded(urlText, { connectTimeoutMs = 3000, requestTimeoutMs = 5000, maxBytes = 16 * 1024 * 1024 } = {}) {
  const url = new URL(urlText);
  if (url.protocol !== 'http:') throw new Error('candidate_runtime_protocol_invalid');
  return new Promise(resolve => {
    let settled = false;
    let connectTimer;
    let requestTimer;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(requestTimer);
      resolve(value);
    };
    const request = http.get(url, response => {
      const chunks = [];
      let bytes = 0;
      response.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxBytes) request.destroy(Object.assign(new Error('candidate_runtime_response_too_large'), { code:'response_too_large' }));
        else chunks.push(chunk);
      });
      response.on('end', () => finish({ statusCode:response.statusCode || 0, body:Buffer.concat(chunks), error:null }));
    });
    connectTimer = setTimeout(() => request.destroy(Object.assign(new Error('candidate_runtime_connect_timeout'), { code:'connect_timeout' })), connectTimeoutMs);
    requestTimer = setTimeout(() => request.destroy(Object.assign(new Error('candidate_runtime_request_timeout'), { code:'request_timeout' })), requestTimeoutMs);
    request.on('socket', socket => {
      if (!socket.connecting) clearTimeout(connectTimer);
      else socket.once('connect', () => clearTimeout(connectTimer));
    });
    request.on('error', error => finish({ statusCode:0, body:Buffer.alloc(0), error:error.code || 'request_error' }));
  });
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function verifyCandidateRuntime(stageRoot, origin) {
  const packageRoot = path.join(path.resolve(stageRoot), 'package');
  const staticFiles = [...baseStaticFiles, activeBrandAssetFromPackage(packageRoot)];
  const health = await readBounded(new URL('/api/health', origin).toString(), { maxBytes:1024 * 1024 });
  let healthJson = null;
  try { healthJson = JSON.parse(health.body.toString('utf8')); } catch {}
  if (health.statusCode !== 200 || healthJson?.ok !== true) throw new Error('candidate_runtime_health_not_ready');
  for (const relativePath of staticFiles) {
    const response = await readBounded(new URL('/' + relativePath, origin).toString());
    const expectedHash = sha256(fs.readFileSync(path.join(packageRoot, relativePath)));
    if (response.statusCode !== 200 || sha256(response.body) !== expectedHash) throw new Error('candidate_runtime_static_hash_mismatch:' + relativePath);
  }
  return { ok:true, health:'ok', static_files:staticFiles.length };
}

if (require.main === module) {
  const [stageRoot, origin] = process.argv.slice(2);
  verifyCandidateRuntime(stageRoot, origin)
    .then(result => process.stdout.write(JSON.stringify(result) + '\n'))
    .catch(error => { process.stderr.write(String(error.message || error) + '\n'); process.exitCode = 1; });
}

module.exports = { readBounded, verifyCandidateRuntime, baseStaticFiles, activeBrandAssetFromPackage };
