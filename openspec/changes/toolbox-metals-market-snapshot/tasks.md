# Metals Market Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个按日刷新、基于静态 JSON 快照的金属市场工具页，覆盖 7 个首发品种的国内/国际双 quote，并接入 GitHub Pages 自动发布链路。

**Architecture:** Node 侧刷新脚本负责抓取 SHMET REST API 与 Trading Economics 人民币/美元铁矿石页面，使用稳定注册表把公开数据归一化到 OpenSpec 约束的 snapshot contract，再写入 `vitepress-docs/docs/public/data/metals-market-snapshot.json`。VitePress 页面通过路由注入的工作台组件读取该静态 JSON，并用只读卡片展示国内/国际 quote；单独的定时 workflow 复用现有 Pages 多环境保留逻辑，在调度触发时先刷新快照再构建并部署。

> Note: 本文件中的已完成代码片段保留的是执行当时的历史步骤，不再作为当前 source-of-truth；当前口径与来源约束以 `design.md` 和 `specs/.../spec.md` 为准。

**Tech Stack:** Node 20 ESM、Cheerio、VitePress、Vue 3、Node test runner、GitHub Pages Actions

---

## File Map

- Modify: `vitepress-docs/package.json`，增加 HTML 解析依赖与本地刷新脚本入口
- Modify: `vitepress-docs/package-lock.json`，同步锁定依赖版本
- Create: `vitepress-docs/scripts/refresh-metals-market-snapshot.mjs`，抓取、解析、归一化并写入静态 snapshot
- Create: `vitepress-docs/tests/metals-market-snapshot.test.mjs`，覆盖注册表、HTML 解析、快照生成和失败降级
- Create: `vitepress-docs/docs/public/data/metals-market-snapshot.json`，由刷新脚本生成的静态快照文件
- Create: `vitepress-docs/docs/.vitepress/theme/utils/metals-market-view-model.mjs`，把 snapshot 转成页面易用的展示字段
- Create: `vitepress-docs/tests/metals-market-view-model.test.mjs`，覆盖价格、涨跌、状态文案和空数据展示逻辑
- Create: `vitepress-docs/docs/.vitepress/theme/components/MetalsMarketWorkbench.vue`，按品种渲染国内/国际双栏 quote 卡片
- Modify: `vitepress-docs/docs/.vitepress/theme/Layout.vue`，按路由注入工作台组件
- Modify: `vitepress-docs/docs/tools/index.md`，新增工具入口
- Create: `vitepress-docs/docs/tools/metals-market-snapshot.md`，工具页壳子与说明文案
- Create: `.github/workflows/refresh-metals-market-snapshot.yml`，定时刷新 snapshot 并复用 Pages 部署保留逻辑

### Task 1: 锁定刷新脚本 contract 与注册表

**Files:**
- Modify: `vitepress-docs/package.json`
- Modify: `vitepress-docs/package-lock.json`
- Create: `vitepress-docs/tests/metals-market-snapshot.test.mjs`
- Create: `vitepress-docs/scripts/refresh-metals-market-snapshot.mjs`

- [x] **Step 1: 先写失败测试，固定注册表与 snapshot contract**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
	METAL_DEFINITIONS,
	QUOTE_REGISTRY,
	createMissingQuote,
	createSnapshot
} from '../scripts/refresh-metals-market-snapshot.mjs'

test('QUOTE_REGISTRY covers the 14 first-wave quotes', () => {
	assert.equal(METAL_DEFINITIONS.length, 7)
	assert.equal(Object.keys(QUOTE_REGISTRY).length, 14)
	assert.equal(QUOTE_REGISTRY['copper.domesticQuote'].basisKey, 'shmet_cu_domestic_settlement')
	assert.equal(
		QUOTE_REGISTRY['iron_ore.internationalQuote'].basisKey,
		'tradingeconomics_iron_ore_62fe_cfr_china_index'
	)
})

test('createMissingQuote nulls numeric fields while keeping metadata', () => {
	const quote = createMissingQuote('copper.internationalQuote', 'source unavailable')

	assert.equal(quote.status, 'missing')
	assert.equal(quote.price, null)
	assert.equal(quote.previousPrice, null)
	assert.equal(quote.changeAmount, null)
	assert.equal(quote.changePercent, null)
	assert.match(quote.note, /source unavailable/)
})

test('createSnapshot keeps fixed metal order and fills both quote sides', () => {
	const snapshot = createSnapshot(
		{
			copper: {
				domesticQuote: {
					...createMissingQuote('copper.domesticQuote', null),
					status: 'ok',
					price: 78240,
					previousPrice: 78090,
					changeAmount: 150,
					changePercent: 0.19,
					tradeDate: '2026-05-20'
				}
			}
		},
		{
			snapshotAt: '2026-05-20T08:30:12.000Z',
			snapshotDate: '2026-05-20'
		}
	)

	assert.equal(snapshot.schemaVersion, '1.0')
	assert.equal(snapshot.itemCount, 7)
	assert.deepEqual(snapshot.items.map((item) => item.metalKey), [
		'copper',
		'aluminum',
		'lead',
		'zinc',
		'nickel',
		'tin',
		'iron_ore'
	])
	assert.equal(snapshot.items[0].internationalQuote.status, 'missing')
})
```

- [x] **Step 2: 运行测试，确认它因为脚本缺失而失败**

Run: `cd vitepress-docs && node --test tests/metals-market-snapshot.test.mjs`
Expected: FAIL，提示 `refresh-metals-market-snapshot.mjs` 不存在或缺少导出

- [x] **Step 3: 加依赖并实现最小 contract 骨架**

```json
{
	"scripts": {
		"docs:refresh:metals": "node ./scripts/refresh-metals-market-snapshot.mjs"
	},
	"dependencies": {
		"cheerio": "^1.1.2"
	}
}
```

```js
export const METAL_DEFINITIONS = [
	['copper', '铜', 'non_ferrous'],
	['aluminum', '铝', 'non_ferrous'],
	['lead', '铅', 'non_ferrous'],
	['zinc', '锌', 'non_ferrous'],
	['nickel', '镍', 'non_ferrous'],
	['tin', '锡', 'non_ferrous'],
	['iron_ore', '铁矿石', 'ferrous_raw_material']
]

export const QUOTE_REGISTRY = {
	'copper.domesticQuote': {
		basisKey: 'shmet_cu_domestic_settlement',
		basisLabel: 'SHMET 铜内贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '铜现货内贸结算口径',
		currency: 'CNY',
		unit: '元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'domestic-price/cu',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'copper.internationalQuote': {
		basisKey: 'shmet_cu_foreign_settlement',
		basisLabel: 'SHMET 铜外贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '铜现货外贸结算口径',
		currency: 'USD',
		unit: '美元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'foreign-price/cu',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'aluminum.domesticQuote': {
		basisKey: 'shmet_al_domestic_settlement',
		basisLabel: 'SHMET 铝内贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '铝现货内贸结算口径',
		currency: 'CNY',
		unit: '元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'domestic-price/al',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'aluminum.internationalQuote': {
		basisKey: 'shmet_al_foreign_settlement',
		basisLabel: 'SHMET 铝外贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '铝现货外贸结算口径',
		currency: 'USD',
		unit: '美元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'foreign-price/al',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'lead.domesticQuote': {
		basisKey: 'shmet_pb_domestic_settlement',
		basisLabel: 'SHMET 铅内贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '铅现货内贸结算口径',
		currency: 'CNY',
		unit: '元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'domestic-price/pb',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'lead.internationalQuote': {
		basisKey: 'shmet_pb_foreign_settlement',
		basisLabel: 'SHMET 铅外贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '铅现货外贸结算口径',
		currency: 'USD',
		unit: '美元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'foreign-price/pb',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'zinc.domesticQuote': {
		basisKey: 'shmet_zn_domestic_settlement',
		basisLabel: 'SHMET 锌内贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '锌现货内贸结算口径',
		currency: 'CNY',
		unit: '元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'domestic-price/zn',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'zinc.internationalQuote': {
		basisKey: 'shmet_zn_foreign_settlement',
		basisLabel: 'SHMET 锌外贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '锌现货外贸结算口径',
		currency: 'USD',
		unit: '美元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'foreign-price/zn',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'nickel.domesticQuote': {
		basisKey: 'shmet_ni_domestic_settlement',
		basisLabel: 'SHMET 镍内贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '镍现货内贸结算口径',
		currency: 'CNY',
		unit: '元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'domestic-price/ni',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'nickel.internationalQuote': {
		basisKey: 'shmet_ni_foreign_settlement',
		basisLabel: 'SHMET 镍外贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '镍现货外贸结算口径',
		currency: 'USD',
		unit: '美元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'foreign-price/ni',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'tin.domesticQuote': {
		basisKey: 'shmet_sn_domestic_settlement',
		basisLabel: 'SHMET 锡内贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '锡现货内贸结算口径',
		currency: 'CNY',
		unit: '元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'domestic-price/sn',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'tin.internationalQuote': {
		basisKey: 'shmet_sn_foreign_settlement',
		basisLabel: 'SHMET 锡外贸结算价',
		basisType: 'spot',
		venueLabel: '上海金属网',
		specLabel: '锡现货外贸结算口径',
		currency: 'USD',
		unit: '美元/吨',
		sourceLabel: 'SHMET 首页',
		sourceUrl: 'http://shmet.com/',
		sourceSection: 'foreign-price/sn',
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'iron_ore.domesticQuote': {
		basisKey: 'mysteel_iron_ore_domestic_market',
		basisLabel: 'Mysteel 国内铁矿石市场价',
		basisType: 'spot',
		venueLabel: 'Mysteel',
		specLabel: '铁矿石国内市场口径',
		currency: 'CNY',
		unit: '元/吨',
		sourceLabel: 'Mysteel 铁矿石栏目',
		sourceUrl: 'https://www.mysteel.com/ironore/',
		sourceSection: null,
		basisReferenceLabel: null,
		basisReferenceUrl: null
	},
	'iron_ore.internationalQuote': {
		basisKey: 'tradingeconomics_iron_ore_62fe_cfr_china_index',
		basisLabel: 'Trading Economics 铁矿石 62% Fe CFR China 指数',
		basisType: 'index',
		venueLabel: 'Trading Economics',
		specLabel: '铁矿石 62% Fe CFR China 指数口径',
		currency: 'USD',
		unit: '美元/干吨',
		sourceLabel: 'Trading Economics 铁矿石行情页',
		sourceUrl: 'https://zh.tradingeconomics.com/commodity/iron-ore',
		sourceSection: null,
		basisReferenceLabel: 'CME 62% Fe CFR China 产品页',
		basisReferenceUrl: 'https://www.cmegroup.com/markets/metals/ferrous/iron-ore-62-cfr-china.html'
	}
}

export function createMissingQuote(registryKey, note = null) {
	const meta = QUOTE_REGISTRY[registryKey]

	return {
		status: 'missing',
		...meta,
		price: null,
		previousPrice: null,
		changeAmount: null,
		changePercent: null,
		tradeDate: null,
		publishedAt: null,
		note
	}
}

export function createSnapshot(quotesByMetal, options = {}) {
	const snapshotAt = options.snapshotAt ?? new Date().toISOString()
	const snapshotDate = options.snapshotDate ?? snapshotAt.slice(0, 10)

	const items = METAL_DEFINITIONS.map(([metalKey, metalLabel, category], index) => ({
		metalKey,
		metalLabel,
		category,
		displayOrder: index + 1,
		domesticQuote:
			quotesByMetal[metalKey]?.domesticQuote ?? createMissingQuote(`${metalKey}.domesticQuote`, 'not collected yet'),
		internationalQuote:
			quotesByMetal[metalKey]?.internationalQuote ?? createMissingQuote(`${metalKey}.internationalQuote`, 'not collected yet')
	}))

	return {
		schemaVersion: '1.0',
		snapshotAt,
		snapshotDate,
		itemCount: items.length,
		items
	}
}
```

- [x] **Step 4: 安装依赖并重跑测试，确认 contract 层转绿**

Run: `cd vitepress-docs && npm install && node --test tests/metals-market-snapshot.test.mjs`
Expected: PASS，当前测试全部通过

### Task 2: 为三类公开源补 HTML 解析与标准化

**Files:**
- Modify: `vitepress-docs/tests/metals-market-snapshot.test.mjs`
- Modify: `vitepress-docs/scripts/refresh-metals-market-snapshot.mjs`

- [x] **Step 1: 为 SHMET、Mysteel、Trading Economics 解析器写失败测试**

```js
import {
	parseShmetHomepage,
	parseMysteelIronOrePage,
	parseTradingEconomicsIronOrePage
} from '../scripts/refresh-metals-market-snapshot.mjs'

test('parseShmetHomepage extracts domestic and international quotes from section keys', () => {
	const html = `
		<section id="domestic-price">
			<table>
				<tr data-code="cu"><td>铜</td><td>78240</td><td>78090</td><td>150</td><td>0.19%</td></tr>
			</table>
		</section>
		<section id="foreign-price">
			<table>
				<tr data-code="cu"><td>铜</td><td>10875</td><td>10840</td><td>35</td><td>0.32%</td></tr>
			</table>
		</section>
	`

	const result = parseShmetHomepage(html, '2026-05-20')

	assert.equal(result.copper.domesticQuote.basisKey, 'shmet_cu_domestic_settlement')
	assert.equal(result.copper.domesticQuote.sourceSection, 'domestic-price/cu')
	assert.equal(result.copper.internationalQuote.currency, 'USD')
})

test('parseMysteelIronOrePage extracts the domestic iron ore quote', () => {
	const html = `<article><span class="price">962</span><span class="previous">955</span><span class="change">7</span><span class="change-rate">0.73%</span></article>`
	const quote = parseMysteelIronOrePage(html, '2026-05-20')

	assert.equal(quote.basisKey, 'mysteel_iron_ore_domestic_market')
	assert.equal(quote.unit, '元/吨')
	assert.equal(quote.price, 962)
})

test('parseTradingEconomicsIronOrePage keeps the CME basis reference metadata', () => {
	const html = `<div class="commodity-value">104.35</div><div class="commodity-change">0.45</div><div class="commodity-percent">0.43%</div>`
	const quote = parseTradingEconomicsIronOrePage(html, '2026-05-20')

	assert.equal(quote.basisType, 'index')
	assert.equal(quote.currency, 'USD')
	assert.match(quote.basisReferenceUrl, /cmegroup\.com/)
})
```

- [x] **Step 2: 运行测试，确认失败点落在缺少解析实现**

Run: `cd vitepress-docs && node --test tests/metals-market-snapshot.test.mjs`
Expected: FAIL，提示解析函数未导出或返回结构不符合断言

- [x] **Step 3: 实现 HTML 解析器与数字归一化 helpers**

```js
import * as cheerio from 'cheerio'

function parseNumber(value) {
	const normalized = String(value ?? '').replace(/,/g, '').replace(/%/g, '').trim()
	return normalized === '' ? null : Number(normalized)
}

function createQuoteFromRegistry(registryKey, patch) {
	return {
		status: 'ok',
		...QUOTE_REGISTRY[registryKey],
		previousPrice: patch.previousPrice ?? null,
		changeAmount: patch.changeAmount ?? null,
		changePercent: patch.changePercent ?? null,
		tradeDate: patch.tradeDate ?? null,
		publishedAt: patch.publishedAt ?? null,
		price: patch.price ?? null,
		note: patch.note ?? null
	}
}

export function parseShmetHomepage(html, tradeDate) {
	const $ = cheerio.load(html)
	const result = {}

	for (const [metalCode, metalKey] of [['cu', 'copper'], ['al', 'aluminum'], ['pb', 'lead'], ['zn', 'zinc'], ['ni', 'nickel'], ['sn', 'tin']]) {
		const domesticRow = $(`#domestic-price tr[data-code="${metalCode}"]`)
		const foreignRow = $(`#foreign-price tr[data-code="${metalCode}"]`)

		result[metalKey] = {
			domesticQuote: createQuoteFromRegistry(`${metalKey}.domesticQuote`, {
				price: parseNumber(domesticRow.find('td').eq(1).text()),
				previousPrice: parseNumber(domesticRow.find('td').eq(2).text()),
				changeAmount: parseNumber(domesticRow.find('td').eq(3).text()),
				changePercent: parseNumber(domesticRow.find('td').eq(4).text()),
				tradeDate
			}),
			internationalQuote: createQuoteFromRegistry(`${metalKey}.internationalQuote`, {
				price: parseNumber(foreignRow.find('td').eq(1).text()),
				previousPrice: parseNumber(foreignRow.find('td').eq(2).text()),
				changeAmount: parseNumber(foreignRow.find('td').eq(3).text()),
				changePercent: parseNumber(foreignRow.find('td').eq(4).text()),
				tradeDate,
				note: 'SHMET 外贸结算价，不等同于 LME 官方直接报价'
			})
		}
	}

	return result
}
```

- [x] **Step 4: 重跑测试，确认三类解析都通过**

Run: `cd vitepress-docs && node --test tests/metals-market-snapshot.test.mjs`
Expected: PASS，解析测试与 Task 1 测试一并通过

### Task 3: 实现刷新总控、失败降级与静态 snapshot 输出

**Files:**
- Modify: `vitepress-docs/tests/metals-market-snapshot.test.mjs`
- Modify: `vitepress-docs/scripts/refresh-metals-market-snapshot.mjs`
- Create: `vitepress-docs/docs/public/data/metals-market-snapshot.json`

- [x] **Step 1: 为总控流程和失败降级写失败测试**

```js
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { refreshMetalsMarketSnapshot } from '../scripts/refresh-metals-market-snapshot.mjs'

test('refreshMetalsMarketSnapshot writes a full snapshot and degrades failed sources to missing', async () => {
	const output = path.join(os.tmpdir(), 'metals-market-snapshot.test.json')

	const responses = new Map([
		['http://shmet.com/', '<section id="domestic-price"><table><tr data-code="cu"><td>铜</td><td>78240</td><td>78090</td><td>150</td><td>0.19%</td></tr></table></section><section id="foreign-price"><table><tr data-code="cu"><td>铜</td><td>10875</td><td>10840</td><td>35</td><td>0.32%</td></tr></table></section>'],
		['https://www.mysteel.com/ironore/', new Error('503 upstream')],
		['https://zh.tradingeconomics.com/commodity/iron-ore', '<div class="commodity-value">104.35</div><div class="commodity-change">0.45</div><div class="commodity-percent">0.43%</div>']
	])

	const fetchImpl = async (url) => {
		const value = responses.get(url)
		if (value instanceof Error) {
			throw value
		}

		return {
			ok: true,
			text: async () => value
		}
	}

	const result = await refreshMetalsMarketSnapshot({
		fetchImpl,
		output,
		snapshotAt: '2026-05-20T08:30:12.000Z'
	})

	assert.equal(result.snapshot.itemCount, 7)
	assert.equal(result.snapshot.items.find((item) => item.metalKey === 'iron_ore').domesticQuote.status, 'missing')
	assert.equal(fs.existsSync(output), true)
})
```

- [x] **Step 2: 运行测试，确认失败点落在总控函数尚未完成**

Run: `cd vitepress-docs && node --test tests/metals-market-snapshot.test.mjs`
Expected: FAIL，提示 `refreshMetalsMarketSnapshot` 缺失或未写出文件

- [x] **Step 3: 实现抓取总控、CLI 和按源降级策略**

```js
export const SOURCE_URLS = {
	shmet: 'http://shmet.com/',
	mysteelIronOre: 'https://www.mysteel.com/ironore/',
	tradingEconomicsIronOre: 'https://zh.tradingeconomics.com/commodity/iron-ore'
}

export async function fetchText(url, fetchImpl = globalThis.fetch) {
	const response = await fetchImpl(url, {
		headers: {
			'user-agent': 'daodaocrazy.github.io metals snapshot bot',
			accept: 'text/html,application/xhtml+xml'
		}
	})

	if (!response?.ok) {
		throw new Error(`Failed to fetch ${url}: ${response?.status ?? 'unknown'}`)
	}

	return response.text()
}

export async function refreshMetalsMarketSnapshot(options = {}) {
	const snapshotAt = options.snapshotAt ?? new Date().toISOString()
	const snapshotDate = snapshotAt.slice(0, 10)
	const quotesByMetal = {}

	try {
		Object.assign(quotesByMetal, parseShmetHomepage(await fetchText(SOURCE_URLS.shmet, options.fetchImpl), snapshotDate))
	} catch (error) {
		for (const metalKey of ['copper', 'aluminum', 'lead', 'zinc', 'nickel', 'tin']) {
			quotesByMetal[metalKey] = {
				domesticQuote: createMissingQuote(`${metalKey}.domesticQuote`, String(error)),
				internationalQuote: createMissingQuote(`${metalKey}.internationalQuote`, String(error))
			}
		}
	}

	try {
		quotesByMetal.iron_ore = quotesByMetal.iron_ore ?? {}
		quotesByMetal.iron_ore.domesticQuote = parseMysteelIronOrePage(
			await fetchText(SOURCE_URLS.mysteelIronOre, options.fetchImpl),
			snapshotDate
		)
	} catch (error) {
		quotesByMetal.iron_ore = quotesByMetal.iron_ore ?? {}
		quotesByMetal.iron_ore.domesticQuote = createMissingQuote('iron_ore.domesticQuote', String(error))
	}

	try {
		quotesByMetal.iron_ore = quotesByMetal.iron_ore ?? {}
		quotesByMetal.iron_ore.internationalQuote = parseTradingEconomicsIronOrePage(
			await fetchText(SOURCE_URLS.tradingEconomicsIronOre, options.fetchImpl),
			snapshotDate
		)
	} catch (error) {
		quotesByMetal.iron_ore = quotesByMetal.iron_ore ?? {}
		quotesByMetal.iron_ore.internationalQuote = createMissingQuote('iron_ore.internationalQuote', String(error))
	}

	const snapshot = createSnapshot(quotesByMetal, { snapshotAt, snapshotDate })
	const outputPath = writeSnapshot(snapshot, options.output)

	return { outputPath, snapshot }
}
```

- [x] **Step 4: 重跑单测并用真实脚本生成站内 snapshot 文件**

Run: `cd vitepress-docs && node --test tests/metals-market-snapshot.test.mjs`
Expected: PASS

Run: `cd vitepress-docs && node ./scripts/refresh-metals-market-snapshot.mjs`
Expected: 输出 JSON 摘要，并生成 `docs/public/data/metals-market-snapshot.json`；即便某个源失败，也必须写出 7 个品种的 snapshot，失败 quote 用 `missing` 或 `delayed` 表达

### Task 4: 为页面层抽展示 view-model，并接入 Tool Box 路由

**Files:**
- Create: `vitepress-docs/docs/.vitepress/theme/utils/metals-market-view-model.mjs`
- Create: `vitepress-docs/tests/metals-market-view-model.test.mjs`
- Create: `vitepress-docs/docs/.vitepress/theme/components/MetalsMarketWorkbench.vue`
- Modify: `vitepress-docs/docs/.vitepress/theme/Layout.vue`
- Modify: `vitepress-docs/docs/tools/index.md`
- Create: `vitepress-docs/docs/tools/metals-market-snapshot.md`

- [x] **Step 1: 先写 view-model 的失败测试**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
	formatQuotePrice,
	formatQuoteDelta,
	getQuoteStatusLabel,
	getQuoteTone
} from '../docs/.vitepress/theme/utils/metals-market-view-model.mjs'

test('formatQuotePrice renders number, currency and unit', () => {
	assert.equal(formatQuotePrice({ status: 'ok', price: 78240, currency: 'CNY', unit: '元/吨' }), '78,240 CNY / 元/吨')
	assert.equal(formatQuotePrice({ status: 'missing', price: null, currency: 'USD', unit: '美元/吨' }), '--')
})

test('formatQuoteDelta renders amount and percent together', () => {
	assert.equal(formatQuoteDelta({ status: 'ok', changeAmount: 150, changePercent: 0.19, currency: 'CNY', unit: '元/吨' }), '+150 元/吨 / +0.19%')
	assert.equal(formatQuoteDelta({ status: 'missing', changeAmount: null, changePercent: null, currency: 'CNY', unit: '元/吨' }), '--')
})

test('status helpers distinguish ok delayed and missing', () => {
	assert.equal(getQuoteStatusLabel({ status: 'ok' }), '正常')
	assert.equal(getQuoteStatusLabel({ status: 'delayed' }), '延迟')
	assert.equal(getQuoteStatusLabel({ status: 'missing' }), '缺失')
	assert.equal(getQuoteTone({ status: 'missing', changeAmount: null }), 'muted')
})
```

- [x] **Step 2: 运行测试，确认 view-model 文件尚不存在**

Run: `cd vitepress-docs && node --test tests/metals-market-view-model.test.mjs`
Expected: FAIL，提示 `metals-market-view-model.mjs` 不存在

- [x] **Step 3: 实现 view-model、工作台组件和路由接入**

```js
export function formatQuotePrice(quote) {
	if (!quote || quote.status === 'missing' || quote.price === null) {
		return '--'
	}

	return `${Number(quote.price).toLocaleString('en-US')} ${quote.currency} / ${quote.unit}`
}

export function formatQuoteDelta(quote) {
	if (!quote || quote.changeAmount === null || quote.changePercent === null) {
		return '--'
	}

	const amountPrefix = quote.changeAmount > 0 ? '+' : ''
	const percentPrefix = quote.changePercent > 0 ? '+' : ''
	return `${amountPrefix}${quote.changeAmount} ${quote.unit} / ${percentPrefix}${quote.changePercent}%`
}
```

```vue
<script setup>
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

import { formatQuoteDelta, formatQuotePrice, getQuoteStatusLabel, getQuoteTone } from '../utils/metals-market-view-model.mjs'

const snapshot = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const snapshotUrl = withBase('/data/metals-market-snapshot.json')

onMounted(async () => {
	try {
		const response = await fetch(snapshotUrl)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`)
		}
		snapshot.value = await response.json()
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error)
	} finally {
		loading.value = false
	}
})

const metals = computed(() => snapshot.value?.items ?? [])
</script>
```

```md
---
title: 金属市场快照
description: 每日聚合国内与国际金属价格快照，第一版覆盖六大有色与铁矿石
layout: page
outline: false
aside: false
pageClass: metals-market-snapshot-page
---

# 金属市场快照

这个页面展示由公开页面抓取并归一化后的每日快照。第一版聚焦六大有色与铁矿石，并明确区分国内与国际口径。
```

- [x] **Step 4: 跑 view-model 单测和站点构建，验证页面接入无回归**

Run: `cd vitepress-docs && node --test tests/metals-market-view-model.test.mjs`
Expected: PASS

Run: `cd vitepress-docs && npm run docs:build:ci`
Expected: PASS，`/tools/metals-market-snapshot` 构建成功，base path 下的 `/data/metals-market-snapshot.json` 不会因路由前缀出错

### Task 5: 新增每日刷新 workflow，并做最终验收

**Files:**
- Create: `.github/workflows/refresh-metals-market-snapshot.yml`
- Modify: `openspec/changes/toolbox-metals-market-snapshot/tasks.md`

- [x] **Step 1: 按 pilot 结构创建定时刷新 workflow**

```yml
name: Refresh Metals Market Snapshot

on:
	schedule:
		- cron: '17 1 * * *'
	workflow_dispatch:

permissions:
	contents: read
	pages: write
	id-token: write

concurrency:
	group: pages-site
	cancel-in-progress: false

jobs:
	build:
		runs-on: ubuntu-latest
		outputs:
			channel: ${{ steps.target.outputs.channel }}
			base_path: ${{ steps.target.outputs.base_path }}
			deploy_subdir: ${{ steps.target.outputs.deploy_subdir }}
			environment_name: ${{ steps.target.outputs.environment_name }}
			preview_slug: ${{ steps.target.outputs.preview_slug }}
		steps:
			- name: Checkout
				uses: actions/checkout@v6
				with:
					fetch-depth: 0

			- name: Setup Node
				uses: actions/setup-node@v6
				with:
					node-version: 20
					cache: npm
					cache-dependency-path: vitepress-docs/package-lock.json

			- name: Setup Pages
				uses: actions/configure-pages@v6

			- name: Resolve deployment target
				id: target
				run: node ./vitepress-docs/scripts/resolve-pages-target.mjs "${GITHUB_REF_NAME}" --format=github-output >> "$GITHUB_OUTPUT"

			- name: Install dependencies
				working-directory: ./vitepress-docs
				run: npm ci

			- name: Refresh metals market snapshot
				working-directory: ./vitepress-docs
				run: node ./scripts/refresh-metals-market-snapshot.mjs

			- name: Restore live Pages snapshot
				id: snapshot
				env:
					PUBLIC_ORIGIN: https://daodaocrazy.github.io
				run: |
					set -euo pipefail

					STAGING_DIR="$RUNNER_TEMP/pages-site"
					SNAPSHOT_DIR="$RUNNER_TEMP/live-pages"

					mkdir -p "$STAGING_DIR" "$SNAPSHOT_DIR"

					download_seed() {
						local seed="$1"
						wget --mirror --no-verbose --directory-prefix "$SNAPSHOT_DIR" "$seed" || true
					}

					if curl --fail --silent --show-error --location "$PUBLIC_ORIGIN/" >/dev/null; then
						download_seed "$PUBLIC_ORIGIN/"
						download_seed "$PUBLIC_ORIGIN/lab/"
						download_seed "$PUBLIC_ORIGIN/preview/"

						if [[ -d "$SNAPSHOT_DIR/daodaocrazy.github.io" ]]; then
							rsync -a "$SNAPSHOT_DIR/daodaocrazy.github.io/" "$STAGING_DIR/"
						fi
					fi

					touch "$STAGING_DIR/.nojekyll"
					echo "staging_dir=$STAGING_DIR" >> "$GITHUB_OUTPUT"

			- name: Build with VitePress
				working-directory: ./vitepress-docs
				run: node ./scripts/run-build.mjs --base "${{ steps.target.outputs.base_path }}" --ref "${{ github.ref_name }}"
				env:
					NODE_OPTIONS: --max-old-space-size=4096

			- name: Sync build output into Pages bundle
				env:
					DEPLOY_SUBDIR: ${{ steps.target.outputs.deploy_subdir }}
					STAGING_DIR: ${{ steps.snapshot.outputs.staging_dir }}
				run: |
					set -euo pipefail

					if [[ -n "$DEPLOY_SUBDIR" ]]; then
						TARGET_DIR="$STAGING_DIR/$DEPLOY_SUBDIR"
						rm -rf "$TARGET_DIR"
						mkdir -p "$TARGET_DIR"
					else
						TARGET_DIR="$STAGING_DIR"
						find "$STAGING_DIR" -mindepth 1 -maxdepth 1 ! -name lab ! -name preview ! -name .nojekyll -exec rm -rf {} +
					fi

					rsync -a --delete ./vitepress-docs/docs/.vitepress/dist/ "$TARGET_DIR/"
					touch "$STAGING_DIR/.nojekyll"

			- name: Persist preview metadata
				if: steps.target.outputs.channel == 'preview'
				env:
					DEPLOY_SUBDIR: ${{ steps.target.outputs.deploy_subdir }}
					PREVIEW_SLUG: ${{ steps.target.outputs.preview_slug }}
					STAGING_DIR: ${{ steps.snapshot.outputs.staging_dir }}
				run: |
					set -euo pipefail

					TARGET_DIR="$STAGING_DIR/$DEPLOY_SUBDIR"
					DEPLOYED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

					cat > "$TARGET_DIR/_preview.json" <<EOF
					{
						"branch": "${GITHUB_REF_NAME}",
						"slug": "${PREVIEW_SLUG}",
						"deployedAt": "${DEPLOYED_AT}",
						"url": "https://daodaocrazy.github.io/${DEPLOY_SUBDIR}/"
					}
					EOF

			- name: Rebuild preview index
				env:
					STAGING_DIR: ${{ steps.snapshot.outputs.staging_dir }}
				run: node ./vitepress-docs/scripts/render-preview-index.mjs "$STAGING_DIR" "https://daodaocrazy.github.io"

			- name: Upload artifact
				uses: actions/upload-pages-artifact@v5
				with:
					path: ${{ steps.snapshot.outputs.staging_dir }}

	deploy:
		environment:
			name: ${{ needs.build.outputs.environment_name }}
			url: ${{ steps.deployment.outputs.page_url }}
		needs: build
		runs-on: ubuntu-latest
		name: Deploy
		steps:
			- name: Deploy to GitHub Pages
				id: deployment
				uses: actions/deploy-pages@v4
```

- [x] **Step 2: 勾掉本次已完成的计划项，并做最终验证**

Run: `cd vitepress-docs && node --test tests/metals-market-snapshot.test.mjs tests/metals-market-view-model.test.mjs`
Expected: PASS

Run: `cd vitepress-docs && npm run docs:build:ci`
Expected: PASS

Run: `cd .. && openspec validate --changes toolbox-metals-market-snapshot`
Expected: PASS

- [x] **Step 3: 回查规格与实现同步状态**

Checklist:
- `refresh-metals-market-snapshot.mjs` 输出字段与 design 示例 snapshot 一致
- `MetalsMarketWorkbench.vue` 同时展示国内/国际 quote，不生成合并价
- workflow 在刷新后复用现有 Pages 多环境保留逻辑，而不是覆盖 `lab` 和 `preview`
- 若架构图无需更新，在本 change 的实现说明中明确记一条“已检查无需变更”

Result note:
- 已检索仓库内现有 metals market 相关流程图与架构图引用，本次实现没有发现需要同步维护的现成图表，因此无需新增或修改图示。
- 2026-05-20 补充：Mysteel 匿名公开页目前只稳定暴露文章列表和表骨架，未稳定提供可直接抓取的价格值；国内铁矿石第一阶段已切换为 Trading Economics 铁矿石人民币行情页，并为 TE HTML 抓取增加 curl fallback 以适配本机 Node 超时环境。