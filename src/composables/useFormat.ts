const DATE = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
const DATETIME = new Intl.DateTimeFormat('es-EC', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATE.format(date)
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATETIME.format(date)
}

export function formatRelative(value?: string | Date | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)

  if (minutes < 1) return 'ahora mismo'
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`

  const days = Math.round(hours / 24)
  if (days < 30) return `hace ${days} d`

  return formatDate(date)
}

export function formatNumber(value?: number | null) {
  return (value ?? 0).toLocaleString('es-EC')
}

export function formatIndicator(value: number, format: 'number' | 'currency' | 'percent', unit = '') {
  if (format === 'currency') {
    return value.toLocaleString('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
  }
  if (format === 'percent') return `${value.toLocaleString('es-EC', { maximumFractionDigits: 2 })}%`
  return `${value.toLocaleString('es-EC', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`
}

export function formatBytes(bytes: number) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`
}

export function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}

/** Converts a Date into the value a datetime-local input expects. */
export function toLocalInput(value?: string | Date | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
