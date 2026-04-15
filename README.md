# CEX Spot Screener

多交易所现货 EMA 筛选工具，支持 **Binance / OKX / Bybit / Coinbase**，批量扫描 USDT（Coinbase 为 USD）交易对，根据多个时间周期是否站上指定 EMA 进行筛选，按 24h 交易量降序展示结果。

前端部署到 GitHub Pages，通过 Cloudflare Worker 代理解决非 Binance 交易所的 CORS 限制。

## 架构

```
浏览器 (GitHub Pages)
  ├── Binance Spot API（直连，支持 CORS）
  └── Cloudflare Worker（CORS 代理）
        ├── OKX API
        ├── Bybit API
        ├── Coinbase API
        ├── Binance USDⓈ-M Futures API (fapi)
        └── Binance Alpha API (bapi)
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
| Binance (Spot) | USDT | 直连 API | K 线推算 |
| Binance (Alpha+Futures) | USDT 永续 | Worker 代理 (fapi + bapi) | fapi `onboardDate` 字段 |
| OKX | USDT | Worker 代理 | instruments `listTime` 字段 |
| Bybit | USDT | Worker 代理 | K 线推算 |
| Coinbase | USD | Worker 代理 | K 线推算 |

### Binance 市场筛选

选择 Binance 交易所时，可进一步选择市场类型：

- **Spot** — 默认，扫描 Binance 现货 USDT 交易对
- **Alpha + Futures (no spot)** — 只扫描同时上线 Binance Alpha **和** USDⓈ-M 永续合约、但**尚未上线现货**的币种。适合寻找"已有合约但未登陆主站现货"的早期标的。该模式下 symbol 显示为 `XXXUSDT.P` 形式，K 线与 24h 成交额均来自合约 fapi。
- Alpha+Futures 模式下，`fapi` 请求会先尝试浏览器直连 Binance（`fapi/fapi1/fapi2/fapi3`），失败后自动回退到 Worker 代理。
- 若 Binance Alpha token list 接口因地域限制返回 `HTTP 403/451`（或暂时不可用），会自动降级为 **Futures (no spot)** 扫描，并在状态栏显示提示信息。
- 若 Binance Futures API（`fapi`）返回 `HTTP 403/451`，会跳过本次 Alpha+Futures 扫描并在状态栏显示原因，而不是直接报错中断。

### 时间周期支持

所有时间周期在所有交易所均可用。对于交易所原生不支持的周期，通过 K 线聚合自动合成：

| 周期 | Binance | OKX | Bybit | Coinbase |
|------|---------|-----|-------|----------|
| 4H   | 原生    | 原生 | 原生   | 原生      |
| 12H  | 原生    | 原生 | 原生   | 6H×2 聚合 |
| 1D   | 原生    | 原生 | 原生   | 原生      |
| 3D   | 1D×3 聚合 | 1D×3 聚合 | 1D×3 聚合 | 1D×3 聚合 |
| 1W   | 原生    | 原生 | 原生   | 1D 聚合（UTC 自然周） |
| 1M   | 原生    | 原生 | 原生   | 1D 聚合（UTC 自然月） |
| 3M   | 1M×3 聚合 | 1M×3 聚合 | 1M×3 聚合 | 1D 聚合（UTC 自然季度） |

说明：`1D×3` 的 `3D` 聚合按 UTC 日历 3 天边界对齐，并保留当前未完结周期的最新收盘价。
说明：`1M×3` 的 `3M` 聚合按 UTC 自然季度（1/4/7/10 月）对齐，并保留当前未完结季度的最新收盘价。
说明：Coinbase 的 `1W/1M/3M` 由日线按真实 candle 时间戳分桶，分别对齐 UTC 自然周/自然月/自然季度边界。

## 功能说明

### EMA 条件

可选：EMA3、EMA7、EMA21、EMA51

"站上 EMA" 定义：`close > EMA`，多选时需同时满足。

### 筛选模式

- **ALL** — 所有选中的时间周期都满足 EMA 条件
- **ANY** — 任意一个时间周期满足即可

### 涨跌幅

- **24H** — 过去 24 小时涨跌幅
- **7D** — 过去 7 天涨跌幅，基于日 K 线计算
- **30D** — 过去 30 天涨跌幅，基于日 K 线计算

### 上线日期（Listing Date）

- Binance / Bybit / Coinbase：通过最早 K 线推算
- OKX：直接使用 instruments API 的 `listTime` 字段
- Coinbase 性能优化：当 Listing Date 过滤为 `All` 时，不额外请求每个币种的上线日期（减少请求量、降低限流风险）；当启用 Listing Date 过滤（如 Last 30 days）时再计算上线日期。

### 上线日期筛选

可按上线时间过滤结果：Last 7 days / 30 days / 90 days / 180 days / 1 year / All。

### 稳定币过滤

自动过滤 60+ 种稳定币（数据来源 CoinGecko stablecoins 分类），包括：
- USD 锚定法币支持型：USDT、USDC、BUSD、TUSD、FDUSD、PYUSD、BFUSD 等
- USD 锚定算法/合成型：DAI、USDS、USDE、USDD、LUSD、GHO 等
- 收益型稳定币包装：SUSDS、SUSDE、SDAI
- EUR 锚定：EURC、EURT、AEUR 等
- 其他法币锚定：JPYC、XSGD、TRYB 等
- 包装/桥接稳定币：WUSDT、WUSDC、WDAI

### EMA 偏离百分比

时间周期列中显示每个 EMA 的偏离百分比和条件符合标识（✓/✗），格式如 `EMA21: +3.25% ✓`。多个 EMA 条件时，点击列头弹出菜单选择按哪个 EMA 的偏离百分比排序。

### 点击复制

点击结果表中的 Symbol 名称可一键复制到剪贴板，复制成功后显示 "Copied!" 提示。

### 交易量筛选

点击 24h Vol 列头弹出菜单，支持：
- 按交易量升序/降序排序
- 设置交易量区间，单位可选 K / M / B，列头实时显示当前筛选范围

### 其他

- 并发请求 + 实时进度条（Binance / OKX / Bybit 为 8 路，Coinbase 为 3 路）
- 扫描完成状态包含 `request-error skipped`，用于显示因请求错误（如 429/5xx）被跳过的币种数量
- 支持 CSV 导出（含交易所、涨跌幅、上线日期、EMA 偏离百分比数据）
- 列排序：点击表头升序/降序切换
- 深色主题，移动端适配

## 默认设置

- 交易所：Binance
- 时间周期：1D
- EMA 条件：EMA21
- 匹配模式：ALL

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
- K 线聚合：对不支持的时间周期，获取更小周期 K 线后自动聚合（Coinbase `1W/1M/3M` 按真实时间戳对齐 UTC 自然周/月/季度）
- EMA 计算：标准公式 `k = 2 / (period + 1)`，取最近 80 根 K 线
- Coinbase 可靠性增强：K 线请求支持重试与分页回溯（缓解 429/5xx 和单次返回上限导致的数据不足）
- 并发控制：默认 8 路并发 fetch；Coinbase 使用 3 路并发降低限流概率
- 配置分离：Worker URL 通过 `config.js` 加载，不硬编码在主文件中
