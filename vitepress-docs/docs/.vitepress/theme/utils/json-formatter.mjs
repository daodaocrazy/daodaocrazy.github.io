const SIMPLE_KEY_PATTERN = /^[A-Za-z_$][\w$]*$/
const JSON_TOKEN_PATTERN = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b|[{}\[\],:]/g

export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isExpandable(value) {
  return Array.isArray(value) || isPlainObject(value)
}

export function buildJsonPath(parentPath, key) {
  if (typeof key === 'number') {
    return `${parentPath}[${key}]`
  }

  if (SIMPLE_KEY_PATTERN.test(key)) {
    return `${parentPath}.${key}`
  }

  return `${parentPath}[${JSON.stringify(String(key))}]`
}

export function isJsonPathAncestor(parentPath, selectedPath) {
  if (!parentPath || !selectedPath || parentPath === selectedPath) {
    return false
  }

  if (parentPath === '$') {
    return selectedPath.startsWith('$.') || selectedPath.startsWith('$[')
  }

  return selectedPath.startsWith(`${parentPath}.`) || selectedPath.startsWith(`${parentPath}[`)
}

export function formatJsonValue(value) {
  return JSON.stringify(value, null, 2)
}

export function minifyJsonValue(value) {
  return JSON.stringify(value)
}

export function formatJsonLiteral(value) {
  const literal = JSON.stringify(value)
  return literal === undefined ? String(value) : literal
}

export function getJsonLiteralTone(value) {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return 'string'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  return 'plain'
}

export function describeCollapsedJsonValue(value) {
  if (Array.isArray(value)) {
    return `Array(${value.length})[...]`
  }

  if (isPlainObject(value)) {
    return 'Object{...}'
  }

  return formatJsonLiteral(value)
}

export function tokenizeJsonText(source) {
  const text = typeof source === 'string' ? source : String(source ?? '')
  const tokens = []
  let lastIndex = 0

  text.replace(JSON_TOKEN_PATTERN, (match, offset) => {
    if (offset > lastIndex) {
      tokens.push({ type: 'whitespace', text: text.slice(lastIndex, offset) })
    }

    let type = 'punctuation'

    if (match.startsWith('"')) {
      const rest = text.slice(offset + match.length)
      type = /^\s*:/.test(rest) ? 'key' : 'string'
    } else if (match === 'true' || match === 'false') {
      type = 'boolean'
    } else if (match === 'null') {
      type = 'null'
    } else if (/^-?\d/.test(match)) {
      type = 'number'
    }

    tokens.push({ type, text: match })
    lastIndex = offset + match.length
    return match
  })

  if (lastIndex < text.length) {
    tokens.push({ type: 'whitespace', text: text.slice(lastIndex) })
  }

  return tokens
}

function findRepairableDoubleEscapedQuote(text, errorPosition) {
  const startIndex = Math.min(text.length - 3, Math.max(0, errorPosition - 2))

  for (let index = startIndex; index >= 0; index -= 1) {
    if (text[index] !== '\\' || text[index + 1] !== '\\' || text[index + 2] !== '"') {
      continue
    }

    if (text[index - 1] === '\\') {
      continue
    }

    return index
  }

  return -1
}

export function repairDoubleEscapedQuotes(text, maxRepairs = 32) {
  const source = typeof text === 'string' ? text : String(text ?? '')
  let candidate = source
  let repairCount = 0

  for (let attempt = 0; attempt < maxRepairs; attempt += 1) {
    try {
      JSON.parse(candidate)

      return {
        ok: true,
        repairedText: candidate,
        repairCount
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? '')
      const position = extractErrorPosition(message)

      if (position === null) {
        break
      }

      const repairIndex = findRepairableDoubleEscapedQuote(candidate, position)

      if (repairIndex === -1) {
        break
      }

      candidate = `${candidate.slice(0, repairIndex)}\\"${candidate.slice(repairIndex + 3)}`
      repairCount += 1
    }
  }

  return {
    ok: false,
    repairedText: source,
    repairCount: 0
  }
}

function createParseSuccess(value, metadata = {}) {
  return {
    ok: true,
    value,
    formatted: formatJsonValue(value),
    minified: minifyJsonValue(value),
    ...metadata
  }
}

function tryParseJsonSource(source) {
  try {
    return createParseSuccess(JSON.parse(source))
  } catch (error) {
    return {
      ok: false,
      error: createParseErrorDetails(source, error)
    }
  }
}

export function collectExpandablePaths(value, maxDepth = Number.POSITIVE_INFINITY) {
  const paths = []

  function visit(node, path, depth) {
    if (!isExpandable(node)) {
      return
    }

    paths.push(path)

    if (depth >= maxDepth) {
      return
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        visit(item, buildJsonPath(path, index), depth + 1)
      })

      return
    }

    Object.entries(node).forEach(([key, item]) => {
      visit(item, buildJsonPath(path, key), depth + 1)
    })
  }

  visit(value, '$', 0)
  return paths
}

export function createInitialExpandedPaths(value) {
  return collectExpandablePaths(value, 1)
}

export function extractErrorPosition(message = '') {
  const match = message.match(/position\s+(\d+)/i)
  return match ? Number(match[1]) : null
}

export function getLineAndColumn(text, position) {
  const safePosition = Math.max(0, Math.min(text.length, position))
  let line = 1
  let column = 1

  for (let index = 0; index < safePosition; index += 1) {
    const current = text[index]

    if (current === '\r') {
      if (text[index + 1] === '\n' && index + 1 < safePosition) {
        index += 1
      }

      line += 1
      column = 1
      continue
    }

    if (current === '\n') {
      line += 1
      column = 1
      continue
    }

    column += 1
  }

  return { line, column }
}

export function createErrorSnippet(text, line, column, contextRadius = 1) {
  const lines = text.split(/\r?\n/)

  if (lines.length === 0) {
    return ''
  }

  const startLine = Math.max(1, line - contextRadius)
  const endLine = Math.min(lines.length, line + contextRadius)
  const gutterWidth = String(endLine).length
  const snippet = []

  for (let currentLine = startLine; currentLine <= endLine; currentLine += 1) {
    snippet.push(`${String(currentLine).padStart(gutterWidth, ' ')} | ${lines[currentLine - 1]}`)

    if (currentLine === line) {
      snippet.push(`${' '.repeat(gutterWidth)} | ${' '.repeat(Math.max(0, column - 1))}^`)
    }
  }

  return snippet.join('\n')
}

export function createParseErrorDetails(text, error) {
  const message = error instanceof Error ? error.message : String(error ?? 'JSON 解析失败')
  const position = extractErrorPosition(message)

  if (position === null) {
    return {
      message,
      position: null,
      line: 1,
      column: 1,
      snippet: ''
    }
  }

  const { line, column } = getLineAndColumn(text, position)

  return {
    message,
    position,
    line,
    column,
    snippet: createErrorSnippet(text, line, column)
  }
}

export function parseJsonInput(text, options = {}) {
  const source = typeof text === 'string' ? text : String(text ?? '')
  const shouldTryRepair = options.repairDoubleEscapedQuotes !== false

  if (source.trim() === '') {
    return {
      ok: false,
      error: {
        message: '请输入 JSON 内容',
        position: 0,
        line: 1,
        column: 1,
        snippet: ''
      }
    }
  }

  const parsed = tryParseJsonSource(source)

  if (parsed.ok || !shouldTryRepair) {
    return parsed
  }

  const repairAttempt = repairDoubleEscapedQuotes(source)

  if (!repairAttempt.ok || repairAttempt.repairCount === 0) {
    return parsed
  }

  const repairedParsed = tryParseJsonSource(repairAttempt.repairedText)

  if (!repairedParsed.ok) {
    return parsed
  }

  return createParseSuccess(repairedParsed.value, {
    repairedSource: repairAttempt.repairedText,
    repairCount: repairAttempt.repairCount
  })
}