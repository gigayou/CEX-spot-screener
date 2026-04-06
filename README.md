# CEX Spot Screener

多交易所现货 EMA 筛选工具，支持 **Binance / OKX / Bybit / Coinbase**，批量扫描 USDT（Coinbase 为 USD）交易对，根据多个时间周期是否站上指定 EMA 进行筛选，按 24h 交易量降序展示结果。

前端部署到 GitHub Pages，通过 Cloudflare Worker 代理解决非 Binance 交易所的 CORS 限制。

## 架构

```
浏览器 (GitHub Pages)
  ├── Binance API（直连，支持 CORS）
  └── Cloudflare Worker（CORS 代理）
        ├── OKX API
        ├── Bybit API
        └── Coinbase API
```

## 部署

### 1. 部署 Cloudflare Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create application → Start with Hello World
2. 将 `worker.js` 的内容粘贴到编辑器中，替换默认代码
3. 部署后获得 Worker URL（如 `https://xxx.workers.dev`）

### 2. 配置前端

复制 `config.example.js` 为 `config.js`，填入你的 Worker URL：

```bash
cp config.example.js config.js
```

```js
// config.js
window.WORKER_URL = 'https://your-worker.workers.dev';
```

> `config.js` 已被 `.gitignore` 忽略，不会提交到仓库。

### 3. 部署到 GitHub Pages

1. 仓库 Settings → Pages → Source 选择 `main` 分支
2. 保存后等待部署完成，访问 `https://<username>.github.io/CEX-spot-screener/`

### 4. GitHub Pages 自动部署（可选）

如需在 GitHub Pages 上自动注入 Worker URL，可通过 GitHub Actions + Repository Secrets 实现。

## 支持的交易所

| 交易所 | 交易对 | 数据来源 | 上线日期 |
|--------|--------|----------|----------|
| Binance | USDT | 直连 API | K 线推算 |
| OKX | USDT | Worker 代理 | instruments `listTime` 字段 |
| Bybit | USDT | Worker 代理 | K 线推算 |
| Coinbase | USD | Worker 代理 | K 线推算 |

### 时间周期支持

所有时间周期在所有交易所均可用。对于交易所原生不支持的周期，通过 K 线聚合自动合成：

| 周期 | Binance | OKX | Bybit | Coinbase |
|------|---------|-----|-------|----------|
| 4H   | 原生    | 原生 | 原生   | 原生      |
| 12H  | 原生    | 原生 | 原生   | 6H×2 聚合 |
| 1D   | 原生    | 原生 | 原生   | 原生      |
| 3D   | 原生    | 原生 | 1D×3 聚合 | 1D×3 聚合 |
| 1W   | 原生    | 原生 | 原生   | 1D×7 聚合 |
| 1M   | 原生    | 原生 | 原生   | 1D×30 聚合 |

## 功能说明

### EMA 条件

可选：EMA3、EMA7、EMA21、EMA51

"站上 EMA" 定义：`close > EMA`，多选时需同时满足。

### 筛选模式

- **ALL** — 所有选中的时间周期都满足 EMA 条件
- **ANY** — 任意一个时间周期满足即可

### 扫描范围

Top 50 / 100 / 200 / All，按 24h 交易量优先扫描。

### 涨跌幅

- **24H Chg%** — 过去 24 小时涨跌幅
- **7D Chg%** — 过去 7 天涨跌幅，基于日 K 线计算
- **30D Chg%** — 过去 30 天涨跌幅，基于日 K 线计算

### 上线日期（Listing Date）

- Binance / Bybit / Coinbase：通过最早 K 线推算
- OKX：直接使用 instruments API 的 `listTime` 字段

### 上线日期筛选

可按上线时间过滤结果：Last 7 days / 30 days / 90 days / 180 days / 1 year / All。

### 稳定币过滤

自动过滤 60+ 种稳定币（数据来源 CoinGecko stablecoins 分类），包括：
- USD 锚定法币支持型：USDT、USDC、BUSD、TUSD、FDUSD、PYUSD 等
- USD 锚定算法/合成型：DAI、USDS、USDE、USDD、LUSD、GHO 等
- 收益型稳定币包装：SUSDS、SUSDE、SDAI
- EUR 锚定：EURC、EURT、AEUR 等
- 其他法币锚定：JPYC、XSGD、TRYB 等
- 包装/桥接稳定币：WUSDT、WUSDC、WDAI

### 其他

- 8 路并发请求 + 实时进度条
- 支持 CSV 导出（含交易所、涨跌幅、上线日期数据）
- 列排序：点击表头升序/降序切换
- 深色主题，移动端适配

## 默认设置

- 交易所：Binance
- 时间周期：1D
- EMA 条件：EMA21
- 匹配模式：ALL
- 扫描范围：All

## 项目结构

```
├── index.html           # 主页面（HTML + CSS + JS 单文件）
├── config.js            # Worker URL 配置（gitignored）
├── config.example.js    # 配置模板
├── worker.js            # Cloudflare Worker CORS 代理
├── .gitignore
└── README.md
```

## 技术实现

- 纯 HTML/CSS/JavaScript，无框架依赖
- Binance 直连（支持 CORS），其他交易所通过 Cloudflare Worker 代理
- 交易所适配器模式：统一接口，各交易所独立实现
- K 线聚合：对不支持的时间周期，获取更小周期 K 线后自动聚合
- EMA 计算：标准公式 `k = 2 / (period + 1)`，取最近 80 根 K 线
- 并发控制：8 路并发 fetch，单个请求失败不影响整体
- 配置分离：Worker URL 通过 `config.js` 加载，不硬编码在主文件中
