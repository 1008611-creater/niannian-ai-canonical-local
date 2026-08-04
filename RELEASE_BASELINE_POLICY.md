# ai.cauai.fun 发布基线政策

## 当前唯一线上基线

当前可发布基线不是本机预览，也不是任意 Git 工作树。它是 Haika 上实际服务
`https://ai.cauai.fun` 的完整版本化应用包：

```text
release_id: niannian-web-20260804-workbench-clarity-r2-short-drama-modal-fix1
host: haika-niannian / ser087508269396
static link: /var/www/niannian-ai
application links: /opt/niannian-ai and /opt/niannian-ai-current
active package: /opt/niannian-ai-releases/niannian-web-20260804-workbench-clarity-r2-short-drama-modal-fix1/package
public origin: https://ai.cauai.fun
```

完整的逐项哈希、父版本、回滚路径和源码对应状态见：
[`release-baselines/ai.cauai.fun/20260804-workbench-clarity-r2-short-drama-modal-fix1.json`](release-baselines/ai.cauai.fun/20260804-workbench-clarity-r2-short-drama-modal-fix1.json)。

## 当前源码关系

GitHub `main` 的初始提交 `1b8d3f9` 是经过数据与凭据清理的主站源码档案，
但它**不是**当前上线包的可发布替代品。已核验的 `index.html`、`app.js`、
`product.css` 和 `mvp-step02-r13.js` 哈希都与线上包不一致；只有 `server.js`
在该组抽查中一致。

因此，在完成“线上包源码对齐”之前：

- 不得从 GitHub `main`、本机目录、旧候选、`localhost`、`sd2.cauai.fun` 或
  `niannian-ai-web` 直接发布 `ai.cauai.fun`。
- 不得把 Haika 的完整包复制进 Git：该包含有依赖、运行目录和数据目录，不是
  可安全提交的纯源码树。
- 任何未来候选必须在 Haika 上由上述活动完整包复制得到，并声明父版本、改动范围、
  允许文件和受保护页面。

## 单一发布路径

```text
Haika 当前完整线上包
-> Haika 中单独命名的候选完整包
-> 本地构建与真实浏览器验证
-> 原子切换 /var/www/niannian-ai、/opt/niannian-ai-current、/opt/niannian-ai
-> 公网 HTML、版本化资源与用户路径回读
-> 保存下一份线上基线
```

GitHub 的作用是保存经过清理的源码、发布政策和未来可复现的变更历史；它不取代
当前 Haika 上的完整应用包，也不允许用不完整的源码工作树覆盖生产。

## 下一项工程工作

在任何产品改动前，先将当前 Haika 包中实际生效的可提交源码与 GitHub `main`
逐项对齐，并保留运行数据与依赖目录在 Git 外。对齐完成后，新的 Git 提交才可以
成为后续候选的源码起点。
