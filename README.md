# Binance Spot EMA Screener

纯前端工具，批量扫描 Binance 现货 USDT 交易对，根据多个时间周期是否站上指定 EMA 进行筛选，按 24h 交易量降序展示结果。

**无需后端，浏览器直接调用 Binance API。** 可部署到 GitHub Pages。

## 在线使用

打开 `index.html` 即可使用，或部署到 GitHub Pages 后通过网页访问。

## 功能说明

### 时间周期

| 显示名 | Binance interval |
|--------|-----------------|
| 4H     | `4h`            |
| 12H    | `12h`           |
| 1D     | `1d`            |
| 3D     | `3d`            |
| 1W     | `1w`            |
| 1M     | `1M`            |

### EMA 条件

可选：EMA3、EMA7、EMA21、EMA51

"站上 EMA" 定义：`close > EMA`，多选时需同时满足。

### 筛选模式

- **ALL** — 所有选中的时间周期都满足 EMA 条件
- **ANY** — 任意一个时间周期满足即可

### 扫描范围

Top 50 / 100 / 200 / All，按 24h 交易量优先扫描。

### 涨跌幅

- **24H Chg%** — 过去 24 小时涨跌幅，来自 Binance ticker 数据
- **7D Chg%** — 过去 7 天涨跌幅，基于日 K 线计算

涨跌幅颜色：绿色为正、红色为负。

### 列排序

点击任意表头可按该列升序/降序排序，当前排序列显示 ▲/▼ 箭头。点击 # 列恢复默认排序（按交易量降序）。

### 其他

- 自动过滤稳定币（USDC、TUSD、USDP、USD1、DAI、FDUSD 等）
- 8 路并发请求 + 实时进度条
- 支持 CSV 导出（含涨跌幅数据）
- Binance 风格深色主题，移动端适配

## 默认设置

- 时间周期：1D
- EMA 条件：EMA21
- 匹配模式：ALL
- 扫描范围：All

## 技术实现

- 纯 HTML/CSS/JavaScript，无框架依赖
- 浏览器直连 `api.binance.com`（Binance API 支持 CORS）
- EMA 计算：标准公式 `k = 2 / (period + 1)`，取最近 80 根 K 线
- 并发控制：8 路并发 fetch，单个请求失败不影响整体

## 部署到 GitHub Pages

1. 仓库 Settings → Pages → Source 选择 `gh-pages` 分支
2. 保存后等待部署完成，访问 `https://<username>.github.io/binance-spot-screener/`
