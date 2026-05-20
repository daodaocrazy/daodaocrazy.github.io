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

export function getQuoteStatusLabel(quote) {
  switch (quote?.status) {
    case 'ok':
      return '正常'
    case 'delayed':
      return '延迟'
    default:
      return '缺失'
  }
}

export function getQuoteTone(quote) {
  if (!quote || quote.status === 'missing' || quote.changeAmount === null) {
    return 'muted'
  }

  if (quote.changeAmount > 0) {
    return 'positive'
  }

  if (quote.changeAmount < 0) {
    return 'negative'
  }

  return quote.status === 'delayed' ? 'warning' : 'neutral'
}