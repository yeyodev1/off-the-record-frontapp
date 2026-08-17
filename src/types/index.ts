export interface ApiError {
  status: number
  message: string
  data?: unknown
}

export type ContentKind = 'article' | 'update'
export type ContentStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived'
export type AttachmentKind = 'image' | 'video' | 'audio' | 'document'

export type BlockKind =
  | 'paragraph'
  | 'heading'
  | 'subheading'
  | 'intertitle'
  | 'list'
  | 'quote'
  | 'divider'
  | 'callout'
  | 'media'
  | 'chart'
  | 'infographic'

export type Align = 'left' | 'center' | 'right' | 'justify'

export interface ContentBlock {
  uid: string
  kind: BlockKind
  html: string
  text: string
  items: string[]
  ordered: boolean
  level: number
  color: string
  background: string
  align: Align
  indent: number
  lineHeight: number
  fontFamily: string
  fontSize: string
  assetUrl: string
  assetKind: string
  caption: string
  meta: Record<string, unknown>
}

export interface Attachment {
  uid: string
  kind: AttachmentKind
  url: string
  name: string
  mime: string
  bytes: number
  caption: string
  provider: string
  publicId: string
  source: 'upload' | 'ai' | 'external'
  createdAt?: string
}

export interface AiAsset {
  uid: string
  kind: 'image' | 'infographic' | 'audio' | 'video' | 'summary' | 'headline'
  status: 'queued' | 'ready' | 'failed' | 'unavailable'
  prompt: string
  url: string
  text: string
  provider: string
  model: string
  error: string
  data: Record<string, unknown>
  createdAt?: string
}

export interface SpellIssue {
  message: string
  excerpt: string
  suggestion: string
  rule: string
  severity: 'error' | 'warning' | 'style'
  offset: number
  length: number
}

export interface SpellReport {
  score: number
  engine: string
  issues: SpellIssue[]
  checkedAt: string | null
}

export interface ShareInfo {
  enabled: boolean
  token: string
  expiresAt: string | null
  visits: number
  lastVisitAt: string | null
  channel: string
}

export interface ContentStats {
  views: number
  uniqueViews: number
  shareVisits: number
  avgSeconds: number
  lastReadAt: string | null
}

export interface ContentItem {
  _id: string
  title: string
  kicker?: string
  slug?: string
  key?: string
  summary: string
  description?: string
  html: string
  blocks: ContentBlock[]
  attachments: Attachment[]
  aiAssets: AiAsset[]
  observations?: string
  photo?: string
  accentColor: string
  coverUrl?: string
  tags: string[]
  tagSlugs?: string[]
  typeId?: number
  categoryId: string
  categoryName: string
  status: ContentStatus
  priority?: 'low' | 'normal' | 'high' | 'breaking'
  scheduledFor: string | null
  publishedAt: string | null
  readingMinutes?: number
  wordCount?: number
  articleId?: string
  articleTitle?: string
  notifyOnPublish?: boolean
  share: ShareInfo
  stats: ContentStats
  spellcheck: SpellReport
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface Tag {
  _id: string
  name: string
  slug: string
  color: string
  description: string
  usageCount: number
  active: boolean
  createdByName: string
  createdAt: string
}

export interface Category {
  _id: string
  name: string
  slug: string
  scope: 'content' | 'audience'
  color: string
  icon: string
  description: string
  order: number
  active: boolean
}

export type IndicatorProvider = 'manual' | 'bce' | 'yahoo' | 'worldbank' | 'frankfurter' | 'json'

export interface IndicatorFeed {
  provider: IndicatorProvider
  symbol: string
  url: string
  path: string
  multiplier: number
  refreshHours: number
}

export interface IndicatorPreset {
  provider: IndicatorProvider
  symbol: string
  label: string
  format: 'number' | 'currency' | 'percent'
}

export interface Indicator {
  _id: string
  name: string
  code: string
  value: number
  previousValue: number | null
  unit: string
  format: 'number' | 'currency' | 'percent'
  source: string
  color: string
  order: number
  active: boolean
  history: { value: number; at: string }[]
  measuredAt: string
  feed?: IndicatorFeed
  lastSyncAt: string | null
  lastSyncStatus: 'ok' | 'error' | 'pending'
  lastSyncError: string
}

export interface AppUser {
  _id: string
  name: string
  lastname: string
  ci: string
  email: string
  active: boolean
  changepass: boolean
  photo: string
  phone: string
  signalHandle: string
  telegramChatId: string
  organization: string
  position: string
  notes: string
  premium: boolean
  roleId: number
  categoryIds: string[]
  categoryNames: string[]
  lastLoginAt: string | null
  loginCount: number
  readCount: number
  createdAt: string
}

export interface UserArchive {
  _id: string
  userId: string
  name: string
  url: string
  kind: AttachmentKind
  mime: string
  bytes: number
  note: string
  uploadedByName: string
  createdAt: string
}

export interface AppNotification {
  _id: string
  title: string
  message: string
  channel: NotificationChannel
  channels: NotificationChannel[]
  trigger: 'manual' | 'publish' | 'report'
  audience: 'all' | 'role' | 'category' | 'users'
  roleId: number | null
  categoryId: string
  userIds: string[]
  targetType: 'article' | 'update' | 'none'
  targetId: string
  link: string
  status: 'draft' | 'scheduled' | 'sent' | 'failed'
  scheduledFor: string | null
  sentAt: string | null
  deliveredCount: number
  delivery?: { attempted: number; succeeded: number; failed: number; errors: string[] }
  error?: string
  readBy: string[]
  createdByName: string
  createdAt: string
}

export type NotificationChannel = 'app' | 'telegram' | 'signal' | 'email'

/** Estado en vivo de un puente de mensajería. */
export interface ChannelStatus {
  configured: boolean
  reachable: boolean
  detail: string
}

export interface MessagingSettings {
  telegram: { enabled: boolean; tokenSet: boolean; tokenHint: string; broadcastChatId: string }
  signal: { enabled: boolean; apiUrl: string; number: string; groupId: string }
  auto: {
    onArticlePublish: boolean
    onUpdatePublish: boolean
    onDailyReport: boolean
    channels: NotificationChannel[]
  }
  updatedAt?: string
  updatedByName?: string
}

export interface SectionStat {
  categoryId: string
  categoryName: string
  reads: number
  uniqueReaders: number
  avgSeconds: number
}

export interface TopContentStat {
  targetType: ContentKind
  targetId: string
  title: string
  categoryName: string
  reads: number
  uniqueReaders: number
  avgSeconds: number
}

export interface AnalyticsOverview {
  stats: {
    articles: number
    published: number
    scheduled: number
    drafts: number
    updates: number
    scheduledUpdates: number
    users: number
    activeUsers: number
    readsToday: number
    reads30: number
    loginsToday: number
  }
  sections: SectionStat[]
  top: TopContentStat[]
  timeline: { date: string; reads: number; uniqueReaders: number }[]
  logins: { date: string; action: string; total: number }[]
}

export interface BriefHeadline {
  id: string
  title: string
  kicker?: string
  summary: string
  color: string
  category: string
  publishedAt: string
  reads: number
}

export interface DailyBrief {
  date: string
  headlines: BriefHeadline[]
  updates: BriefHeadline[]
  indicators: (Indicator & { deltaPercent: number | null })[]
  sections: SectionStat[]
}

export interface InfographicSpec {
  title: string
  subtitle: string
  kind: 'bar' | 'line' | 'donut' | 'timeline' | 'comparison' | 'stat'
  unit: string
  source: string
  series: { label: string; value: number; color: string; note: string }[]
  insights: string[]
}

export interface AiCapabilities {
  provider: string
  reports: boolean
  text: boolean
  image: boolean
  audio: boolean
  video: boolean
  infographic: boolean
  infographicImage?: boolean
  photos?: boolean
  storage: boolean
}

export interface InfographicPoster {
  url: string
  publicId: string
  bytes: number
  style: string
  styleLabel: string
}

export interface InfographicPosterSet {
  brief: { headline: string; altText: string; source: string; subject?: string }
  posters: InfographicPoster[]
  photoCredit?: string
  photoSource?: string
}

export interface StockPhoto {
  url: string
  pageUrl: string
  title: string
  author: string
  license: string
  credit: string
}

export interface StockPhotoSet {
  query: string
  altText: string
  photos: StockPhoto[]
}

export interface AccessLogEntry {
  _id: string
  userName: string
  email: string
  roleId: number
  action: 'login' | 'logout' | 'failed' | 'refresh'
  ip: string
  userAgent: string
  reason: string
  at: string
}

export interface ReportMetric {
  label: string
  value: number
  unit: string
  delta: number | null
  color: string
}

export interface ReportEntry {
  id: string
  kind: string
  title: string
  category: string
  reads: number
  uniqueReaders: number
  color: string
}

export interface EditorialReport {
  _id: string
  kind: 'daily' | 'monthly'
  periodKey: string
  periodStart: string
  periodEnd: string
  title: string
  headline: string
  narrative: string
  highlights: string[]
  recommendations: string[]
  metrics: ReportMetric[]
  sections: ReportEntry[]
  topContent: ReportEntry[]
  published: ReportEntry[]
  indicators: {
    name: string
    code: string
    value: number
    unit: string
    format: 'number' | 'currency' | 'percent'
    color: string
    source: string
    deltaPercent: number | null
  }[]
  chart: InfographicSpec | null
  engine: string
  generatedBy: 'auto' | 'manual'
  generatedAt: string
  error: string
}

/** Contadores de la barra lateral del lector. */
export interface ReaderFacets {
  counts: { all: number; article: number; update: number }
  categories: { _id: string; name: string; color: string; icon: string; count: number }[]
  tags: { slug: string; name: string; color: string; count: number }[]
}

/** Rango de fechas de los filtros; cadenas `YYYY-MM-DD` o vacías. */
export interface DateRange {
  from: string
  to: string
}

/** Imagen dentro del visor ampliado de un artículo. */
export interface LightboxImage {
  src: string
  caption?: string
}
