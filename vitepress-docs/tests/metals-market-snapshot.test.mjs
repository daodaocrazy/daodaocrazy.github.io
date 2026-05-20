import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  METAL_DEFINITIONS,
  QUOTE_REGISTRY,
  createMissingQuote,
  createSnapshot,
  parseShmetSpotPrices,
  parseTradingEconomicsIronOreCnyPage,
  parseShmetHomepage,
  parseTradingEconomicsIronOrePage,
  refreshMetalsMarketSnapshot
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
  assert.equal(result.copper.internationalQuote.price, 10875)
})

test('parseShmetSpotPrices normalizes domestic and foreign API rows into fixed quote keys', () => {
  const result = parseShmetSpotPrices(
    [
      {
        name: '1#电解铜',
        currenTime: '2026-05-20',
        pricesList: [{ date: '11:30', high: '103640', low: '102940', middle: '103290', change: '-960' }]
      },
      {
        name: 'A00铝锭/华东',
        currenTime: '2026-05-20',
        pricesList: [{ date: '10:15', high: '24280', low: '24240', middle: '24260', change: '60' }]
      }
    ],
    [
      {
        name: '铜CIF上海',
        currenTime: '2026-05-20',
        pricesList: [{ date: '05-19 10:30', high: '76', low: '66', middle: '71', change: '0' }]
      },
      {
        name: '铝CIF提单/上海',
        currenTime: '2026-05-20',
        pricesList: [{ date: '10:30', high: '280', low: '250', middle: '265', change: '5' }]
      }
    ],
    '2026-05-20'
  )

  assert.equal(result.copper.domesticQuote.price, 103290)
  assert.equal(result.copper.domesticQuote.previousPrice, 104250)
  assert.equal(result.copper.domesticQuote.changeAmount, -960)
  assert.equal(result.copper.internationalQuote.price, 71)
  assert.equal(result.copper.internationalQuote.previousPrice, 71)
  assert.equal(result.aluminum.domesticQuote.price, 24260)
  assert.equal(result.aluminum.internationalQuote.price, 265)
})

test('parseTradingEconomicsIronOreCnyPage extracts the domestic iron ore quote', () => {
  const html = `
    <table>
      <thead>
        <tr>
          <th></th>
          <th>现值</th>
          <th>前次数据</th>
          <th>最高</th>
          <th>最低</th>
          <th>日期</th>
          <th>单位</th>
          <th>频率</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td></td>
          <td>797.00</td>
          <td>798.50</td>
          <td>1337.00</td>
          <td>312.00</td>
          <td>2013 - 2026</td>
          <td>元/吨</td>
          <td>日常</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `

  const quote = parseTradingEconomicsIronOreCnyPage(html, '2026-05-20')

  assert.equal(quote.basisKey, 'tradingeconomics_iron_ore_cny_domestic_index')
  assert.equal(quote.unit, '元/吨')
  assert.equal(quote.price, 797)
  assert.equal(quote.previousPrice, 798.5)
  assert.equal(quote.changeAmount, -1.5)
  assert.equal(quote.changePercent, -0.19)
})

test('parseTradingEconomicsIronOrePage keeps the CME basis reference metadata', () => {
  const html = `
    <table>
      <thead>
        <tr>
          <th></th>
          <th>现值</th>
          <th>前次数据</th>
          <th>最高</th>
          <th>最低</th>
          <th>日期</th>
          <th>单位</th>
          <th>频率</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td></td>
          <td>110.33</td>
          <td>110.54</td>
          <td>219.77</td>
          <td>38.54</td>
          <td>2010 - 2026</td>
          <td>美元/吨</td>
          <td>日常</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `

  const quote = parseTradingEconomicsIronOrePage(html, '2026-05-20')

  assert.equal(quote.basisType, 'index')
  assert.equal(quote.currency, 'USD')
  assert.equal(quote.unit, '美元/干吨')
  assert.equal(quote.price, 110.33)
  assert.equal(quote.previousPrice, 110.54)
  assert.equal(quote.changeAmount, -0.21)
  assert.equal(quote.changePercent, -0.19)
  assert.match(quote.basisReferenceUrl, /cmegroup\.com/)
})

test('parseTradingEconomicsIronOrePage falls back to TEChartsMeta script data when the summary table drifts away', () => {
  const html = `
    <meta
      id="metaDesc"
      name="description"
      content="铁矿石在2026年5月19日跌至110.33美元/吨，比前一天下降0.19%。在过去一个月中，铁矿石价格上涨了3.03%。"
    />
    <script>
      TEChartsMeta = [{"value":110.33,"last":110.33,"symbol":"SCO:COM"}];
    </script>
  `

  const quote = parseTradingEconomicsIronOrePage(html, '2026-05-20')

  assert.equal(quote.price, 110.33)
  assert.equal(quote.previousPrice, 110.54)
  assert.equal(quote.changeAmount, -0.21)
  assert.equal(quote.changePercent, -0.19)
})

test('parseTradingEconomicsIronOreCnyPage ignores stale description text when it disagrees with TEChartsMeta', () => {
  const html = `
    <meta
      id="metaDesc"
      name="description"
      content="铁矿石人民币在2026年5月19日跌至798.50人民币/吨，比前一天下降0.56%。在过去一个月中，铁矿石人民币的价格上涨了1.53%。"
    />
    <script>
      TEChartsMeta = [{"value":797.00,"last":797.00,"symbol":"IOE:COM"}];
    </script>
  `

  const quote = parseTradingEconomicsIronOreCnyPage(html, '2026-05-20')

  assert.equal(quote.price, 797)
  assert.equal(quote.previousPrice, null)
  assert.equal(quote.changeAmount, null)
  assert.equal(quote.changePercent, null)
})

test('refreshMetalsMarketSnapshot writes a full snapshot and degrades failed sources to missing', async () => {
  const output = path.join(os.tmpdir(), `metals-market-snapshot-${Date.now()}.json`)

  const attemptCounts = new Map()

  const fetchImpl = async (url, options = {}) => {
    const nextAttempt = (attemptCounts.get(url) ?? 0) + 1
    attemptCounts.set(url, nextAttempt)

    if (url === 'https://api.shmet.com/api/rest/spot/spotPrices') {
      const payload = JSON.parse(options.body ?? '{}')

      if (payload.type === 'domestic-price' && nextAttempt === 1) {
        throw new Error('socket hang up')
      }

      if (payload.type === 'domestic-price') {
        return {
          ok: true,
          json: async () => ({
            code: '000000',
            data: [
              {
                name: '1#电解铜',
                currenTime: '2026-05-20',
                pricesList: [{ date: '11:30', high: '103640', low: '102940', middle: '103290', change: '-960' }]
              }
            ]
          })
        }
      }

      if (payload.type === 'foreign-price') {
        return {
          ok: true,
          json: async () => ({
            code: '000000',
            data: [
              {
                name: '铜CIF上海',
                currenTime: '2026-05-20',
                pricesList: [{ date: '05-19 10:30', high: '76', low: '66', middle: '71', change: '0' }]
              }
            ]
          })
        }
      }
    }

    if (url === 'https://zh.tradingeconomics.com/commodity/iron-ore-cny') {
      return {
        ok: true,
        text: async () => `
          <table>
            <thead>
              <tr>
                <th></th>
                <th>现值</th>
                <th>前次数据</th>
                <th>最高</th>
                <th>最低</th>
                <th>日期</th>
                <th>单位</th>
                <th>频率</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td>797.00</td>
                <td>798.50</td>
                <td>1337.00</td>
                <td>312.00</td>
                <td>2013 - 2026</td>
                <td>元/吨</td>
                <td>日常</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        `
      }
    }

    if (url === 'https://zh.tradingeconomics.com/commodity/iron-ore') {
      return {
        ok: true,
        text: async () => `
          <table>
            <thead>
              <tr>
                <th></th>
                <th>现值</th>
                <th>前次数据</th>
                <th>最高</th>
                <th>最低</th>
                <th>日期</th>
                <th>单位</th>
                <th>频率</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td>110.33</td>
                <td>110.54</td>
                <td>219.77</td>
                <td>38.54</td>
                <td>2010 - 2026</td>
                <td>美元/吨</td>
                <td>日常</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        `
      }
    }

    throw new Error(`Unexpected fetch URL: ${url}`)
  }

  const result = await refreshMetalsMarketSnapshot({
    fetchImpl,
    output,
    snapshotAt: '2026-05-20T08:30:12.000Z'
  })

  assert.equal(result.snapshot.itemCount, 7)
  assert.equal(result.snapshot.items.find((item) => item.metalKey === 'copper').domesticQuote.status, 'ok')
  assert.equal(result.snapshot.items.find((item) => item.metalKey === 'copper').internationalQuote.status, 'ok')
  assert.equal(attemptCounts.get('https://api.shmet.com/api/rest/spot/spotPrices'), 3)
  assert.equal(result.snapshot.items.find((item) => item.metalKey === 'iron_ore').domesticQuote.status, 'ok')
  assert.equal(result.snapshot.items.find((item) => item.metalKey === 'iron_ore').domesticQuote.price, 797)
  assert.equal(fs.existsSync(output), true)

  fs.unlinkSync(output)
})

test('refreshMetalsMarketSnapshot falls back to curl when Trading Economics HTML fetch times out', async () => {
  const output = path.join(os.tmpdir(), `metals-market-snapshot-timeout-${Date.now()}.json`)
  const curlCalls = []

  const fetchImpl = async (url, options = {}) => {
    if (url === 'https://api.shmet.com/api/rest/spot/spotPrices') {
      const payload = JSON.parse(options.body ?? '{}')

      if (payload.type === 'domestic-price') {
        return {
          ok: true,
          json: async () => ({
            code: '000000',
            data: []
          })
        }
      }

      if (payload.type === 'foreign-price') {
        return {
          ok: true,
          json: async () => ({
            code: '000000',
            data: []
          })
        }
      }
    }

    if (url === 'https://zh.tradingeconomics.com/commodity/iron-ore-cny') {
      const error = new Error('The operation was aborted due to timeout')
      error.name = 'TimeoutError'
      throw error
    }

    if (url === 'https://zh.tradingeconomics.com/commodity/iron-ore') {
      const error = new Error('The operation was aborted due to timeout')
      error.name = 'TimeoutError'
      throw error
    }

    throw new Error(`Unexpected fetch URL: ${url}`)
  }

  const curlImpl = async (url) => {
    curlCalls.push(url)

    if (url === 'https://zh.tradingeconomics.com/commodity/iron-ore-cny') {
      return `
        <table>
          <thead>
            <tr>
              <th></th>
              <th>现值</th>
              <th>前次数据</th>
              <th>最高</th>
              <th>最低</th>
              <th>日期</th>
              <th>单位</th>
              <th>频率</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td></td>
              <td>797.00</td>
              <td>798.50</td>
              <td>1337.00</td>
              <td>312.00</td>
              <td>2013 - 2026</td>
              <td>元/吨</td>
              <td>日常</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `
    }

    if (url === 'https://zh.tradingeconomics.com/commodity/iron-ore') {
      return `
        <table>
          <thead>
            <tr>
              <th></th>
              <th>现值</th>
              <th>前次数据</th>
              <th>最高</th>
              <th>最低</th>
              <th>日期</th>
              <th>单位</th>
              <th>频率</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td></td>
              <td>110.33</td>
              <td>110.54</td>
              <td>219.77</td>
              <td>38.54</td>
              <td>2010 - 2026</td>
              <td>美元/吨</td>
              <td>日常</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `
    }

    throw new Error(`Unexpected curl URL: ${url}`)
  }

  const result = await refreshMetalsMarketSnapshot({
    fetchImpl,
    curlImpl,
    output,
    snapshotAt: '2026-05-20T09:15:00.000Z'
  })

  assert.deepEqual(curlCalls, [
    'https://zh.tradingeconomics.com/commodity/iron-ore-cny',
    'https://zh.tradingeconomics.com/commodity/iron-ore'
  ])
  assert.equal(result.snapshot.items.find((item) => item.metalKey === 'iron_ore').domesticQuote.status, 'ok')
  assert.equal(result.snapshot.items.find((item) => item.metalKey === 'iron_ore').internationalQuote.status, 'ok')

  fs.unlinkSync(output)
})