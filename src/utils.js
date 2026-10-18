/* Shared, dependency-free helpers used across the UI. */

export const STATUS_TONE = {
  paid: 'ok', delivered: 'ok', completed: 'ok', converted: 'ok',
  ready: 'info', contacted: 'info', new: 'info', received: 'info', qualified: 'info',
  processing: 'warn', pending: 'warn', in_progress: 'warn',
  cancelled: 'bad', lost: 'bad', failed: 'bad', refunded: 'bad',
}

export function statusLabel(value) {
  return String(value ?? '')
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')
}

export function statusTone(status) {
  return STATUS_TONE[String(status ?? '').toLowerCase()] || 'neutral'
}

export function money(value, { decimals = 0 } = {}) {
  const n = Number(value || 0)
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function compareValues(a, b, dir) {
  const sa = String(a ?? '').trim()
  const sb = String(b ?? '').trim()
  let result
  if (a === null || a === undefined || a === '') result = 1
  else if (b === null || b === undefined || b === '') result = -1
  else if (typeof a === 'number' && typeof b === 'number') result = a - b
  else if (/^\d{4}-\d{2}-\d{2}/.test(sa) && /^\d{4}-\d{2}-\d{2}/.test(sb)) result = Date.parse(sa) - Date.parse(sb)
  else if (!Number.isNaN(Number(a)) && !Number.isNaN(Number(b)) && sa !== '' && sb !== '') result = Number(a) - Number(b)
  else result = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? result : -result
}
