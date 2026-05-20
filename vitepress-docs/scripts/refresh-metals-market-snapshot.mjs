import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)

export const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../docs/public/data/metals-market-snapshot.json')
export const SOURCE_URLS = {
  shmet: 'http://shmet.com/',
  shmetSpotPrices: 'https://api.shmet.com/api/rest/spot/spotPrices',
  tradingEconomicsIronOreCny: 'https://zh.tradingeconomics.com/commodity/iron-ore-cny',
  tradingEconomicsIronOre: 'https://zh.tradingeconomics.com/commodity/iron-ore'
}

const SHMET_REQUEST_TYPES = {
  domestic: 'domestic-price',
  foreign: 'foreign-price'
}

const SHMET_REQUEST_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'content-type': 'application/json;charset=UTF-8',
  origin: 'https://www.shmet.com',
  referer: 'https://www.shmet.com/',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
}

const SHMET_HOME_ROW_MATCHERS = {
  copper: {
    domestic: /^1#电解铜$/,
    international: /^铜CIF上海$/
  },
  aluminum: {
    domestic: /^A00铝锭\/华东$/,
    international: /^铝CIF提单\/上海$/
  },
  lead: {
    domestic: /^1#铅锭\/华东$/,
    international: /^铅CIF提单\/上海$/
  },
  zinc: {
    domestic: /^0#锌锭\/上海$/,
    international: /^锌CIF提单\/上海$/
  },
  nickel: {
    domestic: /^1#电解镍$/,
    international: /^镍CIF提单\/上海$/
  },
  tin: {
    domestic: /^1#锡$/,
    international: null
  }
}

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
    basisKey: 'tradingeconomics_iron_ore_cny_domestic_index',
    basisLabel: 'Trading Economics 铁矿石人民币报价',
    basisType: 'index',
    venueLabel: 'Trading Economics',
    specLabel: '铁矿石人民币国内口径',
    currency: 'CNY',
    unit: '元/吨',
    sourceLabel: 'Trading Economics 铁矿石人民币行情页',
    sourceUrl: 'https://zh.tradingeconomics.com/commodity/iron-ore-cny',
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

  if (!meta) {
    throw new Error(`Unknown registry key: ${registryKey}`)
  }

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

function parseNumber(value) {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .replace(/%/g, '')
    .trim()

  if (normalized === '') {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null
  }

  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function createQuoteFromRegistry(registryKey, patch = {}) {
  const meta = QUOTE_REGISTRY[registryKey]

  if (!meta) {
    throw new Error(`Unknown registry key: ${registryKey}`)
  }

  return {
    status: 'ok',
    ...meta,
    price: patch.price ?? null,
    previousPrice: patch.previousPrice ?? null,
    changeAmount: patch.changeAmount ?? null,
    changePercent: patch.changePercent ?? null,
    tradeDate: patch.tradeDate ?? null,
    publishedAt: patch.publishedAt ?? null,
    note: patch.note ?? null
  }
}

function buildPublishedAt(tradeDate, publishedLabel) {
  if (!publishedLabel) {
    return null
  }

  const normalized = String(publishedLabel).trim()

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return `${tradeDate} ${normalized}`
  }

  return normalized
}

function createQuoteFromShmetSpotRow(registryKey, row, fallbackTradeDate, note = null) {
  if (!row) {
    return createMissingQuote(registryKey, note)
  }

  const latestPrice = Array.isArray(row.pricesList) ? row.pricesList[0] : null
  const price = parseNumber(latestPrice?.middle)
  const changeAmount = parseNumber(latestPrice?.change)
  const previousPrice = price !== null && changeAmount !== null ? price - changeAmount : null
  const tradeDate = row.currenTime ?? fallbackTradeDate
  const publishedLabel = latestPrice?.date ?? null

  return createQuoteFromRegistry(registryKey, {
    price,
    previousPrice,
    changeAmount,
    changePercent: null,
    tradeDate,
    publishedAt: buildPublishedAt(tradeDate, publishedLabel),
    note
  })
}

function findShmetSpotRow(rows, matcher) {
  if (!matcher || !Array.isArray(rows)) {
    return null
  }

  return rows.find((row) => matcher.test(String(row?.name ?? '').trim())) ?? null
}

export function parseShmetSpotPrices(domesticRows, foreignRows, tradeDate) {
  const result = {}

  for (const [metalKey, matcher] of Object.entries(SHMET_HOME_ROW_MATCHERS)) {
    const domesticRow = findShmetSpotRow(domesticRows, matcher.domestic)
    const foreignRow = findShmetSpotRow(foreignRows, matcher.international)

    result[metalKey] = {
      domesticQuote: createQuoteFromShmetSpotRow(
        `${metalKey}.domesticQuote`,
        domesticRow,
        tradeDate,
        domesticRow ? null : 'SHMET domestic-price row not found'
      ),
      internationalQuote: createQuoteFromShmetSpotRow(
        `${metalKey}.internationalQuote`,
        foreignRow,
        tradeDate,
        foreignRow
          ? 'SHMET 外贸结算价，不等同于 LME 官方直接报价'
          : 'SHMET foreign-price row not found'
      )
    }
  }

  return result
}

export function parseShmetHomepage(html, tradeDate) {
  const $ = cheerio.load(html)
  const result = {}

  for (const [metalCode, metalKey] of [
    ['cu', 'copper'],
    ['al', 'aluminum'],
    ['pb', 'lead'],
    ['zn', 'zinc'],
    ['ni', 'nickel'],
    ['sn', 'tin']
  ]) {
    const domesticRow = $(`#domestic-price tr[data-code="${metalCode}"]`)
    const foreignRow = $(`#foreign-price tr[data-code="${metalCode}"]`)

    if (!domesticRow.length && !foreignRow.length) {
      continue
    }

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

function extractTradingEconomicsScriptPrice(html) {
  const match = String(html ?? '').match(/TEChartsMeta\s*=\s*(\[[\s\S]*?\]);/)

  if (!match) {
    return null
  }

  try {
    const payload = JSON.parse(match[1])
    return parseNumber(payload?.[0]?.value ?? payload?.[0]?.last)
  } catch {
    return null
  }
}

function extractTradingEconomicsDescriptionMetrics($) {
  const candidates = [
    $('#metaDesc').attr('content'),
    $('meta[name="description"]').attr('content'),
    $('#description').text(),
    $('#stats').text()
  ]

  for (const candidate of candidates) {
    const text = normalizeText(candidate)

    if (!text) {
      continue
    }

    const priceMatch = text.match(/(?:跌至|涨至|升至|报|达到|交易价格为)?\s*(\d+(?:\.\d+)?)\s*(?:人民币\/吨|美元\/吨|元\/吨)/)
    const changeMatch = text.match(/比前一天(下降|上涨)(\d+(?:\.\d+)?)%/)

    if (!priceMatch && !changeMatch) {
      continue
    }

    const describedPrice = parseNumber(priceMatch?.[1])
    const describedChangePercent = changeMatch
      ? (changeMatch[1] === '下降' ? -1 : 1) * Number(changeMatch[2])
      : null

    return {
      describedPrice,
      describedChangePercent
    }
  }

  return {
    describedPrice: null,
    describedChangePercent: null
  }
}

function extractTradingEconomicsQuoteMetrics($, html) {
  let price = parseNumber($('.commodity-value').first().text())
  let previousPrice = parseNumber($('.commodity-prev').first().text())
  let changeAmount = parseNumber($('.commodity-change').first().text())
  let changePercent = parseNumber($('.commodity-percent').first().text())

  if (price === null) {
    const summaryTable = $('table')
      .filter((_, element) => {
        const headers = $(element)
          .find('th')
          .map((__, header) => $(header).text().trim())
          .get()

        return headers.includes('现值') && headers.includes('前次数据')
      })
      .first()

    const headers = summaryTable
      .find('thead th')
      .map((_, header) => $(header).text().trim())
      .get()
    const cells = summaryTable
      .find('tbody tr')
      .first()
      .find('td')
      .map((_, cell) => $(cell).text().trim())
      .get()
    const summary = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))

    price = parseNumber(summary.现值)
    previousPrice = parseNumber(summary.前次数据)
    changeAmount =
      changeAmount ??
      (price !== null && previousPrice !== null ? roundNumber(price - previousPrice, 2) : null)
    changePercent =
      changePercent ??
      (price !== null && previousPrice ? roundNumber(((price - previousPrice) / previousPrice) * 100, 2) : null)
  }

  if (price === null) {
    price = extractTradingEconomicsScriptPrice(html)
  }

  if (price !== null && (previousPrice === null || changeAmount === null || changePercent === null)) {
    const { describedPrice, describedChangePercent } = extractTradingEconomicsDescriptionMetrics($)
    const descriptionMatchesLivePrice =
      describedPrice !== null && Math.abs(describedPrice - price) <= 0.01

    if (descriptionMatchesLivePrice && describedChangePercent !== null) {
      changePercent = changePercent ?? describedChangePercent

      if (previousPrice === null) {
        previousPrice = roundNumber(price / (1 + describedChangePercent / 100), 2)
      }

      if (changeAmount === null && previousPrice !== null) {
        changeAmount = roundNumber(price - previousPrice, 2)
      }
    }
  }

  return {
    price,
    previousPrice,
    changeAmount,
    changePercent
  }
}

export function parseTradingEconomicsIronOreCnyPage(html, tradeDate) {
  const $ = cheerio.load(html)
  const metrics = extractTradingEconomicsQuoteMetrics($, html)

  return createQuoteFromRegistry('iron_ore.domesticQuote', {
    ...metrics,
    tradeDate,
    note: '展示值来自公开铁矿石人民币行情页'
  })
}

export function parseTradingEconomicsIronOrePage(html, tradeDate) {
  const $ = cheerio.load(html)
  const metrics = extractTradingEconomicsQuoteMetrics($, html)

  return createQuoteFromRegistry('iron_ore.internationalQuote', {
    ...metrics,
    tradeDate,
    note: '展示值来自公开行情页，口径锚点使用 CME 产品定义'
  })
}

async function requestWithRetry(url, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch API is not available in the current runtime')
  }

  const attempts = Math.max(1, options.attempts ?? 1)
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: options.method ?? 'GET',
        headers: options.headers,
        body: options.body
      })

      if (!response?.ok) {
        const status = response?.status ?? 'unknown'
        throw new Error(`Failed to fetch ${url}: ${status}`)
      }

      return response
    } catch (error) {
      lastError = error

      if (attempt === attempts) {
        throw lastError
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`)
}

function isTimeoutLikeError(error) {
  return (
    error?.name === 'TimeoutError' ||
    /aborted due to timeout/i.test(String(error?.message ?? '')) ||
    error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    error?.cause?.code === 'ETIMEDOUT' ||
    error?.code === 'ETIMEDOUT'
  )
}

async function curlRequest(url, options = {}) {
  if (typeof options.curlImpl === 'function') {
    return options.curlImpl(url, options)
  }

  const args = [
    '--silent',
    '--show-error',
    '--location',
    '--compressed',
    '--connect-timeout',
    '20',
    '--max-time',
    '60',
    '--request',
    options.method ?? 'GET'
  ]

  for (const [headerName, headerValue] of Object.entries(options.headers ?? {})) {
    args.push('--header', `${headerName}: ${headerValue}`)
  }

  if (options.body) {
    args.push('--data-raw', options.body)
  }

  args.push(url)

  const { stdout } = await execFileAsync('curl', args, {
    maxBuffer: 1024 * 1024
  })

  return stdout
}

async function fetchJsonWithCurl(url, options = {}) {
  return JSON.parse(await curlRequest(url, options))
}

async function fetchJson(url, options = {}) {
  let response

  try {
    response = await requestWithRetry(url, options)
  } catch (error) {
    if (options.curlFallback && isTimeoutLikeError(error)) {
      return fetchJsonWithCurl(url, options)
    }

    throw error
  }

  if (typeof response.json === 'function') {
    return response.json()
  }

  const text = await response.text()
  return JSON.parse(text)
}

async function fetchTextWithCurl(url, options = {}) {
  return curlRequest(url, options)
}

export async function fetchText(url, options = {}) {
  const requestOptions = typeof options === 'function' ? { fetchImpl: options } : options
  const headers = {
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'user-agent': SHMET_REQUEST_HEADERS['user-agent']
  }

  try {
    const response = await requestWithRetry(url, {
      fetchImpl: requestOptions.fetchImpl,
      headers
    })

    return response.text()
  } catch (error) {
    if (requestOptions.curlFallback && isTimeoutLikeError(error)) {
      return fetchTextWithCurl(url, {
        ...requestOptions,
        headers
      })
    }

    throw error
  }
}

async function fetchShmetSpotRows(type, fetchImpl = globalThis.fetch) {
  const payload = await fetchJson(SOURCE_URLS.shmetSpotPrices, {
    fetchImpl,
    method: 'POST',
    headers: SHMET_REQUEST_HEADERS,
    body: JSON.stringify({
      code: 'Home2',
      type
    }),
    attempts: 2,
    curlFallback: true
  })

  if (payload?.code !== '000000' || !Array.isArray(payload?.data)) {
    throw new Error(`Unexpected SHMET response for ${type}`)
  }

  return payload.data
}

export function writeSnapshot(snapshot, outputPath = DEFAULT_OUTPUT_PATH) {
  const targetPath = path.resolve(outputPath)
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  return targetPath
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
      quotesByMetal[metalKey]?.domesticQuote ??
      createMissingQuote(`${metalKey}.domesticQuote`, 'not collected yet'),
    internationalQuote:
      quotesByMetal[metalKey]?.internationalQuote ??
      createMissingQuote(`${metalKey}.internationalQuote`, 'not collected yet')
  }))

  return {
    schemaVersion: '1.0',
    snapshotAt,
    snapshotDate,
    itemCount: items.length,
    items
  }
}

export async function refreshMetalsMarketSnapshot(options = {}) {
  const snapshotAt = options.snapshotAt ?? new Date().toISOString()
  const snapshotDate = options.snapshotDate ?? snapshotAt.slice(0, 10)
  const quotesByMetal = {}

  try {
    const [domesticRows, foreignRows] = await Promise.all([
      fetchShmetSpotRows(SHMET_REQUEST_TYPES.domestic, options.fetchImpl),
      fetchShmetSpotRows(SHMET_REQUEST_TYPES.foreign, options.fetchImpl)
    ])

    Object.assign(quotesByMetal, parseShmetSpotPrices(domesticRows, foreignRows, snapshotDate))
  } catch (error) {
    const note = error instanceof Error ? error.message : String(error)

    for (const metalKey of ['copper', 'aluminum', 'lead', 'zinc', 'nickel', 'tin']) {
      quotesByMetal[metalKey] = {
        domesticQuote: createMissingQuote(`${metalKey}.domesticQuote`, note),
        internationalQuote: createMissingQuote(`${metalKey}.internationalQuote`, note)
      }
    }
  }

  quotesByMetal.iron_ore = quotesByMetal.iron_ore ?? {}

  try {
    quotesByMetal.iron_ore.domesticQuote = parseTradingEconomicsIronOreCnyPage(
      await fetchText(SOURCE_URLS.tradingEconomicsIronOreCny, {
        fetchImpl: options.fetchImpl,
        curlFallback: true,
        curlImpl: options.curlImpl
      }),
      snapshotDate
    )
  } catch (error) {
    const note = error instanceof Error ? error.message : String(error)
    quotesByMetal.iron_ore.domesticQuote = createMissingQuote('iron_ore.domesticQuote', note)
  }

  try {
    quotesByMetal.iron_ore.internationalQuote = parseTradingEconomicsIronOrePage(
      await fetchText(SOURCE_URLS.tradingEconomicsIronOre, {
        fetchImpl: options.fetchImpl,
        curlFallback: true,
        curlImpl: options.curlImpl
      }),
      snapshotDate
    )
  } catch (error) {
    const note = error instanceof Error ? error.message : String(error)
    quotesByMetal.iron_ore.internationalQuote = createMissingQuote('iron_ore.internationalQuote', note)
  }

  const snapshot = createSnapshot(quotesByMetal, {
    snapshotAt,
    snapshotDate
  })
  const outputPath = writeSnapshot(snapshot, options.output ?? DEFAULT_OUTPUT_PATH)

  return {
    outputPath,
    snapshot
  }
}

async function main() {
  const result = await refreshMetalsMarketSnapshot()

  process.stdout.write(
    `${JSON.stringify(
      {
        outputPath: result.outputPath,
        itemCount: result.snapshot.itemCount,
        snapshotAt: result.snapshot.snapshotAt,
        snapshotDate: result.snapshot.snapshotDate
      },
      null,
      2
    )}\n`
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  })
}