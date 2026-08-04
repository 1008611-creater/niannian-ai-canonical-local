'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const mvp = fs.readFileSync(path.join(projectRoot, 'mvp.js'), 'utf8');
const index = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const publicSurface = [
  mvp,
  index,
  fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8')
].join('\n');

assert.match(mvp, /参考视频用于理解镜头、叙事、节奏和视觉目标；它不自动等同于动作迁移/);
assert.match(mvp, /参考原视频，规划新版本/);
assert.match(index, /参考原视频，规划新版本/);
assert.match(mvp, /关键资产与场景/);
assert.doesNotMatch(mvp, /替换主体，复刻原视频/);
assert.doesNotMatch(publicSurface, /(?:服装图|商品图|LDXP)/i);
assert.doesNotMatch(publicSurface, /1\s*积分\s*=\s*[¥￥]?\s*0\.1(?:0)?/i);
assert.doesNotMatch(publicSurface, /(?:单图|一张图|single image)/i);

process.stdout.write(JSON.stringify({
  ok:true,
  verified:[
    'reference video is not action transfer by default',
    'redraw mode avoids a direct-copy promise',
    'key asset terminology is user-facing',
    'no fixed credit exchange rate or LDXP label',
    'no single-image limitation on the public redraw surface'
  ]
}) + '\n');
