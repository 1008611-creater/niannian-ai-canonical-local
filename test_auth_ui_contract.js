const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const index = read('index.html');
const app = read('app.js');
const mvp = read('mvp.js');
const server = read('server.js');

assert(index.includes('从素材、首帧到成片'));
assert(!index.includes('同一个本地工作区'));
assert(index.includes('当前账户、项目与协作范围'));
assert(/<script src="\.\/mvp\.js\?v=[^"]+" defer><\/script>/.test(index));
assert(!index.includes('mvp.js?v=20260713r32'));
assert.equal((app.match(/label: "邮箱"/g) || []).length, 2);
assert(!app.includes('手机号或邮箱'));
assert(mvp.includes('data-open-auth-login'));
assert(!mvp.includes('data-open-local-login'));
assert(!mvp.includes('登录本地环境'));
assert(mvp.includes('workbench-empty-paths'));
assert(mvp.includes('选择制作路径'));
assert(mvp.includes('从一个项目开始'));
assert(mvp.includes('查看完整制作流程'));
assert(mvp.includes('登录后管理你的项目'));
assert(mvp.includes('登录后查看你的工作区'));
assert(mvp.includes('仅显示当前账户的项目与协作范围。'));
assert(!mvp.includes('不在公开页面预填任何团队或项目数据'));
assert(!mvp.includes('登录并开始'));
assert(!mvp.includes('登录开始'));
assert(index.includes('data-workbench-create-actions hidden'));
assert(mvp.includes('data-open-project-wizard'));
assert(mvp.includes('data-open-script-drama-wizard'));
assert(mvp.includes("api('/api/auth/' + type"));
assert(server.includes("if (request.method === 'POST' && pathname === '/api/auth/register') return handleRegister(request, response);"));
assert(server.includes("if (request.method === 'POST' && pathname === '/api/auth/login') return handleLogin(request, response);"));
assert(server.includes("if (request.method === 'GET' && pathname === '/api/auth/session')"));
assert(server.includes("NIANNIAN_LOCAL_PREVIEW_INSECURE_SESSION"));
assert(server.includes("...(localPreviewInsecureSession ? [] : ['Secure'])"));
assert(index.includes('id="accountMenu"'));
assert(mvp.includes("function toggleAccountMenu()"));
assert(mvp.includes("data-account-logout"));

process.stdout.write(JSON.stringify({
  ok:true,
  verified:[
    'production workbench copy and its runtime cache revision do not reuse the local-login asset',
    'auth modal labels match the email-only API contract',
    'workbench login controls target the shared login modal',
    'signed-out workbench keeps the two real creation paths visible before login',
    'register login session routes and the production-secure/local-preview cookie contract remain present',
    'signed-in navigation exposes a separate account menu before offering logout'
  ]
}) + '\n');
