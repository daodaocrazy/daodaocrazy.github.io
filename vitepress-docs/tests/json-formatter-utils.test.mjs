import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJsonPath,
  collectExpandablePaths,
  createInitialExpandedPaths,
  describeCollapsedJsonValue,
  formatJsonLiteral,
  getJsonLiteralTone,
  getLineAndColumn,
  isJsonPathAncestor,
  parseJsonInput,
  repairDoubleEscapedQuotes,
  tokenizeJsonText
} from '../docs/.vitepress/theme/utils/json-formatter.mjs'

test('buildJsonPath handles object keys and array indexes', () => {
  assert.equal(buildJsonPath('$', 'user'), '$.user')
  assert.equal(buildJsonPath('$.items', 0), '$.items[0]')
  assert.equal(buildJsonPath('$', 'display-name'), '$["display-name"]')
})

test('createInitialExpandedPaths expands root and first layer only', () => {
  const value = {
    user: {
      profile: {
        name: 'Copilot'
      }
    },
    items: [{ id: 1 }],
    enabled: true
  }

  assert.deepEqual(createInitialExpandedPaths(value), ['$', '$.user', '$.items'])
})

test('collectExpandablePaths can gather all expandable nodes', () => {
  const value = {
    user: {
      profile: {
        name: 'Copilot'
      }
    },
    items: [{ detail: { id: 1 } }]
  }

  const paths = collectExpandablePaths(value)

  assert.deepEqual(paths, ['$', '$.user', '$.user.profile', '$.items', '$.items[0]', '$.items[0].detail'])
})

test('isJsonPathAncestor can tell whether a node is on the selected chain', () => {
  assert.equal(isJsonPathAncestor('$', '$.user.profile'), true)
  assert.equal(isJsonPathAncestor('$.user', '$.user.profile'), true)
  assert.equal(isJsonPathAncestor('$.items[0]', '$.items[0].detail'), true)
  assert.equal(isJsonPathAncestor('$.items[1]', '$.items[0].detail'), false)
  assert.equal(isJsonPathAncestor('$.user.profile', '$.user.profile'), false)
})

test('getLineAndColumn maps parse positions back to human-readable coordinates', () => {
  const source = '{\n  "name": "copilot",\n  "broken": true,,\n  "ok": 1\n}'
  const marker = source.indexOf(',,') + 1

  assert.deepEqual(getLineAndColumn(source, marker), { line: 3, column: 18 })
})

test('parseJsonInput returns formatted and minified output for valid JSON', () => {
  const result = parseJsonInput('{"name":"Copilot","items":[1,2]}')

  assert.equal(result.ok, true)
  assert.equal(result.formatted, '{\n  "name": "Copilot",\n  "items": [\n    1,\n    2\n  ]\n}')
  assert.equal(result.minified, '{"name":"Copilot","items":[1,2]}')
})

test('parseJsonInput returns line, column and snippet for invalid JSON', () => {
  const result = parseJsonInput('{\n  "name": "Copilot",\n  "broken": true,,\n  "ok": 1\n}')

  assert.equal(result.ok, false)
  assert.equal(result.error.line, 3)
  assert.equal(result.error.column, 18)
  assert.match(result.error.message, /position/i)
  assert.match(result.error.snippet, /"broken": true,,/)
  assert.match(result.error.snippet, /\^/)
})

test('parseJsonInput returns a friendly message for empty input', () => {
  const result = parseJsonInput('   \n')

  assert.equal(result.ok, false)
  assert.equal(result.error.message, '请输入 JSON 内容')
  assert.equal(result.error.line, 1)
  assert.equal(result.error.column, 1)
})

test('collapsed summaries stay compact while primitive literals remain JSON-safe', () => {
  assert.equal(describeCollapsedJsonValue({ user: { name: 'Copilot' } }), 'Object{...}')
  assert.equal(describeCollapsedJsonValue([1, 2, 3]), 'Array(3)[...]')
  assert.equal(formatJsonLiteral('Copilot'), '"Copilot"')
  assert.equal(formatJsonLiteral(null), 'null')
})

test('tokenizeJsonText splits formatted JSON into syntax-aware tokens', () => {
  const tokens = tokenizeJsonText(`{
  "name": "Copilot",
  "count": 2,
  "enabled": true,
  "empty": null
}`)

  assert.deepEqual(
    tokens.filter((token) => token.type !== 'whitespace').map((token) => [token.type, token.text]),
    [
      ['punctuation', '{'],
      ['key', '"name"'],
      ['punctuation', ':'],
      ['string', '"Copilot"'],
      ['punctuation', ','],
      ['key', '"count"'],
      ['punctuation', ':'],
      ['number', '2'],
      ['punctuation', ','],
      ['key', '"enabled"'],
      ['punctuation', ':'],
      ['boolean', 'true'],
      ['punctuation', ','],
      ['key', '"empty"'],
      ['punctuation', ':'],
      ['null', 'null'],
      ['punctuation', '}']
    ]
  )
})

test('getJsonLiteralTone returns stable classes for primitive types', () => {
  assert.equal(getJsonLiteralTone('Copilot'), 'string')
  assert.equal(getJsonLiteralTone(1), 'number')
  assert.equal(getJsonLiteralTone(false), 'boolean')
  assert.equal(getJsonLiteralTone(null), 'null')
  assert.equal(getJsonLiteralTone({}), 'plain')
})

test('repairDoubleEscapedQuotes can repair alert JSON style double-escaped quotes', () => {
  const broken = String.raw`{"description":"ERROR -\\"AWS account 423632940847\\" -\\"Rate exceeded\\""}`
  const repair = repairDoubleEscapedQuotes(broken)

  assert.equal(repair.ok, true)
  assert.equal(repair.repairCount, 4)
  assert.equal(
    JSON.parse(repair.repairedText).description,
    'ERROR -"AWS account 423632940847" -"Rate exceeded"'
  )
})

test('parseJsonInput auto-repairs repairable alert JSON by default while keeping explicit strict mode available', () => {
  const broken = String.raw`{"result":[{"description":"ERROR -\\"AWS account 423632940847\\" -\\"Rate exceeded\\" -\\"Max retries exceeded with url: /v1/pseudonymisations\\""}]}`

  const defaultResult = parseJsonInput(broken)
  const strictResult = parseJsonInput(broken, { repairDoubleEscapedQuotes: false })
  const repairedResult = parseJsonInput(broken, { repairDoubleEscapedQuotes: true })

  assert.equal(defaultResult.ok, true)
  assert.equal(defaultResult.repairCount, 6)
  assert.equal(strictResult.ok, false)
  assert.equal(repairedResult.ok, true)
  assert.equal(repairedResult.repairCount, 6)
  assert.equal(defaultResult.repairedSource.includes(String.raw`-\"AWS account 423632940847\"`), true)
  assert.equal(
    defaultResult.value.result[0].description,
    'ERROR -"AWS account 423632940847" -"Rate exceeded" -"Max retries exceeded with url: /v1/pseudonymisations"'
  )
})