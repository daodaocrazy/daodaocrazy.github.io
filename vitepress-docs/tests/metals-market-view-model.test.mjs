import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatQuoteDelta,
  formatQuotePrice,
  getQuoteStatusLabel,
  getQuoteTone
} from '../docs/.vitepress/theme/utils/metals-market-view-model.mjs'

test('formatQuotePrice renders number currency and unit', () => {
  assert.equal(
    formatQuotePrice({ status: 'ok', price: 78240, currency: 'CNY', unit: '元/吨' }),
    '78,240 CNY / 元/吨'
  )
  assert.equal(
    formatQuotePrice({ status: 'missing', price: null, currency: 'USD', unit: '美元/吨' }),
    '--'
  )
})

test('formatQuoteDelta renders amount and percent together', () => {
  assert.equal(
    formatQuoteDelta({ status: 'ok', changeAmount: 150, changePercent: 0.19, unit: '元/吨' }),
    '+150 元/吨 / +0.19%'
  )
  assert.equal(
    formatQuoteDelta({ status: 'ok', changeAmount: -35, changePercent: -0.32, unit: '美元/吨' }),
    '-35 美元/吨 / -0.32%'
  )
  assert.equal(
    formatQuoteDelta({ status: 'missing', changeAmount: null, changePercent: null, unit: '元/吨' }),
    '--'
  )
})

test('status helpers distinguish ok delayed and missing', () => {
  assert.equal(getQuoteStatusLabel({ status: 'ok' }), '正常')
  assert.equal(getQuoteStatusLabel({ status: 'delayed' }), '延迟')
  assert.equal(getQuoteStatusLabel({ status: 'missing' }), '缺失')
  assert.equal(getQuoteTone({ status: 'missing', changeAmount: null }), 'muted')
  assert.equal(getQuoteTone({ status: 'ok', changeAmount: 10 }), 'positive')
  assert.equal(getQuoteTone({ status: 'ok', changeAmount: -10 }), 'negative')
})