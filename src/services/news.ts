import { legacyResourceService, resourceService } from './resources'

type NewsKind = 'articles' | 'exclusives'

export interface NewsRecord extends Record<string, unknown> {
  id: string
  source: 'current' | 'legacy'
  kind: NewsKind
  title: string
  summary: string
  description: string
  createdAt: string
}

function asText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function getRecordId(record: Record<string, unknown>, source: 'current' | 'legacy', kind: NewsKind) {
  return String(record.id || record._id || `${source}:${kind}:${asText(record.title, 'untitled')}:${asText(record.createdAt || record.date, '')}`)
}

function normalizeNewsItem(record: Record<string, unknown>, source: 'current' | 'legacy', kind: NewsKind): NewsRecord {
  const createdAt = asText(record.createdAt || record.date || record.register || new Date().toISOString())
  return {
    ...record,
    id: getRecordId(record, source, kind),
    source,
    kind,
    title: asText(record.title, kind === 'articles' ? 'Artículo' : 'Exclusivo'),
    summary: asText(record.summary),
    description: asText(record.description),
    createdAt,
  }
}

function matchesQuery(record: NewsRecord, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  return [record.title, record.summary, record.description, asText(record.key), asText(record.observations)]
    .join(' ')
    .toLowerCase()
    .includes(normalized)
}

function dedupeAndSort(records: NewsRecord[]) {
  const map = new Map<string, NewsRecord>()

  for (const record of records) {
    const fingerprint = `${record.kind}:${record.title.trim().toLowerCase()}:${asText(record.createdAt).slice(0, 10)}`
    const existing = map.get(fingerprint)

    if (!existing) {
      map.set(fingerprint, record)
      continue
    }

    if (existing.source === 'legacy' && record.source === 'current') {
      map.set(fingerprint, record)
    }
  }

  return [...map.values()].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    return bTime - aTime
  })
}

async function loadKind(kind: NewsKind) {
  const currentPath = kind === 'articles' ? '/articles/all' : '/exclusives/all'
  const legacyPath = currentPath

  const [currentResult, legacyResult] = await Promise.allSettled([
    resourceService.list<Record<string, unknown>>(currentPath),
    legacyResourceService.list<Record<string, unknown>>(legacyPath),
  ])

  const currentRows = currentResult.status === 'fulfilled' ? currentResult.value.data : []
  const legacyRows = legacyResult.status === 'fulfilled' ? legacyResult.value.data : []

  return dedupeAndSort([
    ...currentRows.map((record) => normalizeNewsItem(record, 'current', kind)),
    ...legacyRows.map((record) => normalizeNewsItem(record, 'legacy', kind)),
  ])
}

export const newsService = {
  async list(kind: NewsKind, query = '') {
    const records = await loadKind(kind)
    return records.filter((record) => matchesQuery(record, query))
  },

  async count(kind: NewsKind) {
    const records = await loadKind(kind)
    return { count: records.length }
  },
}
