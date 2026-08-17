import { http } from './http'
import type {
  AccessLogEntry,
  AiCapabilities,
  AnalyticsOverview,
  AppNotification,
  AppUser,
  Attachment,
  Category,
  ContentItem,
  ContentKind,
  DailyBrief,
  EditorialReport,
  Indicator,
  IndicatorPreset,
  ChannelStatus,
  InfographicPosterSet,
  InfographicSpec,
  StockPhotoSet,
  MessagingSettings,
  ReaderFacets,
  SectionStat,
  SpellReport,
  Tag,
  TopContentStat,
  UserArchive,
} from '@/types'

const path = (kind: ContentKind) => (kind === 'article' ? 'articles' : 'updates')

/* --- Sesión ---------------------------------------------------------- */

export const authApi = {
  signIn(email: string, password: string) {
    return http.post<{ accessToken: string; refreshToken: string; user: AppUser }>('sign-in', {
      email,
      password,
    })
  },
  signOut() {
    return http.post<{ message: string }>('sign-out')
  },
  me() {
    return http.get<{ data: AppUser }>('me')
  },
  updateMe(payload: Partial<AppUser>) {
    return http.put<{ data: AppUser; message: string }>('me', payload)
  },
  changePassword(currentPassword: string, newPassword: string) {
    return http.post<{ message: string }>('change-password', { currentPassword, newPassword })
  },
  recover(email: string) {
    return http.post<{ message: string }>('recover-password', { email })
  },
}

/* --- Contenido ------------------------------------------------------- */

export interface ContentQuery {
  search?: string
  status?: string
  categoryId?: string
  mine?: boolean
  from?: string
  to?: string
}

export interface FeedQueryParams {
  page?: number
  limit?: number
  categoryId?: string
  tag?: string
  search?: string
  from?: string
  to?: string
}

export const contentApi = {
  list(kind: ContentKind, query: ContentQuery = {}) {
    return http.get<{ data: ContentItem[]; total: number }>(path(kind), query as Record<string, unknown>)
  },
  feed(kind: ContentKind, query: FeedQueryParams = {}) {
    // Sólo se envía lo que tiene valor: así la URL cacheable queda estable.
    const params: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(query)) {
      if (value !== undefined && value !== '' && value !== null) params[field] = value
    }

    return http.get<{ data: ContentItem[]; total: number; page: number; pages: number; limit: number }>(
      `${path(kind)}/feed`,
      params,
    )
  },
  detail(kind: ContentKind, id: string) {
    return http.get<{ data: ContentItem }>(`${path(kind)}/${id}`)
  },
  create(kind: ContentKind, payload: Partial<ContentItem>) {
    return http.post<{ data: ContentItem; message: string }>(path(kind), payload)
  },
  update(kind: ContentKind, id: string, payload: Partial<ContentItem>) {
    return http.put<{ data: ContentItem; message: string }>(`${path(kind)}/${id}`, payload)
  },
  remove(kind: ContentKind, id: string) {
    return http.delete<{ message: string }>(`${path(kind)}/${id}`)
  },
  share(kind: ContentKind, id: string, payload: { enabled: boolean; expiresInHours?: number }) {
    return http.post<{
      data: { enabled: boolean; token: string; expiresAt: string | null; url: string; signalUrl: string }
      message: string
    }>(`${path(kind)}/${id}/share`, payload)
  },
  registerRead(kind: ContentKind, id: string, seconds: number, completed = false) {
    return http.post<{ message: string }>(`${path(kind)}/${id}/read`, { seconds, completed })
  },
  shared(kind: ContentKind, token: string) {
    return http.get<{ data: ContentItem }>(`shared/${kind === 'article' ? 'r' : 'a'}/${token}`)
  },
}

/* --- Catálogos -------------------------------------------------------- */

export const catalogApi = {
  categories(scope?: 'content' | 'audience') {
    return http.get<{ data: Category[] }>('categories', scope ? { scope } : undefined)
  },
  createCategory(payload: Partial<Category>) {
    return http.post<{ data: Category; message: string }>('categories', payload)
  },
  updateCategory(id: string, payload: Partial<Category>) {
    return http.put<{ data: Category; message: string }>(`categories/${id}`, payload)
  },
  deleteCategory(id: string) {
    return http.delete<{ message: string }>(`categories/${id}`)
  },
  indicators() {
    return http.get<{ data: Indicator[] }>('indicators')
  },
  createIndicator(payload: Partial<Indicator>) {
    return http.post<{ data: Indicator; message: string }>('indicators', payload)
  },
  updateIndicator(id: string, payload: Partial<Indicator>) {
    return http.put<{ data: Indicator; message: string }>(`indicators/${id}`, payload)
  },
  indicatorPresets() {
    return http.get<{ data: IndicatorPreset[] }>('indicators/presets')
  },
  syncIndicator(id: string) {
    return http.post<{ data: Indicator; message: string }>(`indicators/${id}/sync`)
  },
  syncIndicators() {
    return http.post<{ data: Indicator[]; message: string }>('indicators/sync')
  },
  deleteIndicator(id: string) {
    return http.delete<{ message: string }>(`indicators/${id}`)
  },
  tags(search?: string) {
    return http.get<{ data: Tag[] }>('tags', search ? { search } : undefined)
  },
  roles() {
    return http.get<{ data: { _id: string; name: string }[] }>('roles')
  },
}

/* --- Etiquetas -------------------------------------------------------- */

export const tagsApi = {
  list(search?: string) {
    return http.get<{ data: Tag[]; total: number }>('tags', search ? { search } : undefined)
  },
  create(name: string) {
    return http.post<{ data: Tag; message: string; reused: boolean }>('tags', { name })
  },
  update(id: string, payload: Partial<Tag>) {
    return http.put<{ data: Tag; message: string }>(`tags/${id}`, payload)
  },
  merge(id: string, into: string) {
    return http.post<{ data: Tag; message: string }>(`tags/${id}/merge`, { into })
  },
  recount() {
    return http.post<{ data: Tag[]; message: string }>('tags/recount')
  },
  remove(id: string) {
    return http.delete<{ message: string }>(`tags/${id}`)
  },
}

/* --- Usuarios --------------------------------------------------------- */

export const usersApi = {
  list(query: { search?: string; roleId?: number; categoryId?: string } = {}) {
    return http.get<{ data: AppUser[]; total: number }>('users', query as Record<string, unknown>)
  },
  detail(id: string) {
    return http.get<{
      data: {
        user: AppUser
        archives: UserArchive[]
        reads: { targetTitle: string; readAt: string; categoryName: string }[]
        logins: AccessLogEntry[]
      }
    }>(`users/${id}`)
  },
  create(payload: Partial<AppUser> & { password: string }) {
    return http.post<{ data: AppUser; message: string }>('users', payload)
  },
  update(id: string, payload: Partial<AppUser> & { password?: string }) {
    return http.put<{ data: AppUser; message: string }>(`users/${id}`, payload)
  },
  remove(id: string) {
    return http.delete<{ message: string }>(`users/${id}`)
  },
  addArchive(id: string, payload: Partial<UserArchive>) {
    return http.post<{ data: UserArchive; message: string }>(`users/${id}/archives`, payload)
  },
  removeArchive(id: string, archiveId: string) {
    return http.delete<{ message: string }>(`users/${id}/archives/${archiveId}`)
  },
}

/* --- Notificaciones --------------------------------------------------- */

export const notificationsApi = {
  list(status?: string) {
    return http.get<{ data: AppNotification[] }>('notifications', status ? { status } : undefined)
  },
  mine() {
    return http.get<{ data: AppNotification[] }>('notifications/mine')
  },
  create(payload: Partial<AppNotification> & { sendNow?: boolean }) {
    return http.post<{ data: AppNotification; message: string }>('notifications', payload)
  },
  update(id: string, payload: Partial<AppNotification>) {
    return http.put<{ data: AppNotification; message: string }>(`notifications/${id}`, payload)
  },
  send(id: string) {
    return http.post<{ data: AppNotification; message: string }>(`notifications/${id}/send`)
  },
  remove(id: string) {
    return http.delete<{ message: string }>(`notifications/${id}`)
  },
  markRead(id: string) {
    return http.post<{ message: string }>(`notifications/${id}/read`)
  },
}

/* --- Integraciones de mensajería -------------------------------------- */

export const settingsApi = {
  read() {
    return http.get<{ data: MessagingSettings }>('settings')
  },
  save(payload: Record<string, unknown>) {
    return http.put<{ data: MessagingSettings; message: string }>('settings', payload)
  },
  channels() {
    return http.get<{ data: { telegram: ChannelStatus; signal: ChannelStatus } }>('settings/channels')
  },
  test(channel: 'telegram' | 'signal', to?: string) {
    return http.post<{ message: string }>(`settings/channels/${channel}/test`, to ? { to } : {})
  },
}

/* --- Lector ----------------------------------------------------------- */

export const readerApi = {
  /** Contadores de la barra lateral, resueltos con agregaciones. */
  facets() {
    return http.get<{ data: ReaderFacets }>('reader/facets')
  },
}

/* --- Analítica -------------------------------------------------------- */

export const analyticsApi = {
  overview(days = 30) {
    return http.get<{ data: AnalyticsOverview }>('analytics/overview', { days })
  },
  sections(days = 30) {
    return http.get<{ data: SectionStat[] }>('analytics/sections', { days })
  },
  top(days = 30) {
    return http.get<{ data: TopContentStat[] }>('analytics/top', { days })
  },
  readers(days = 30) {
    return http.get<{ data: { userId: string; name: string; email: string; reads: number; minutes: number }[] }>(
      'analytics/readers',
      { days },
    )
  },
  brief() {
    return http.get<{ data: DailyBrief }>('analytics/brief')
  },
  accessLog(limit = 80) {
    return http.get<{ data: AccessLogEntry[] }>('analytics/access-log', { limit })
  },
}

/* --- IA ---------------------------------------------------------------- */

export const aiApi = {
  capabilities() {
    return http.get<{ data: AiCapabilities }>('ai/capabilities')
  },
  summary(body: string) {
    return http.post<{ data: { text: string } }>('ai/summary', { body })
  },
  intertitles(body: string) {
    return http.post<{ data: { text: string; afterParagraph: number; color: string }[] }>('ai/intertitles', { body })
  },
  headlines(body: string) {
    return http.post<{ data: { title: string; angle: string; weight: number }[] }>('ai/headlines', { body })
  },
  infographic(body: string, hint = '') {
    return http.post<{ data: InfographicSpec }>('ai/infographic', { body, hint })
  },
  infographicPosters(body: string, hint = '') {
    return http.post<{ data: InfographicPosterSet }>('ai/infographic-posters', { body, hint })
  },
  infographicChoose(payload: {
    keep: { url: string; publicId: string; bytes: number; name: string }
    discard: string[]
  }) {
    return http.post<{ data: { kept: string; discarded: number } }>('ai/infographic-posters/choose', payload)
  },
  photos(body: string, hint = '') {
    return http.post<{ data: StockPhotoSet }>('ai/photos', { body, hint })
  },
  photoChoose(payload: { url: string; name: string; credit: string }) {
    return http.post<{ data: { url: string; publicId: string; bytes: number; credit: string } }>(
      'ai/photos/choose',
      payload,
    )
  },
  image(payload: { prompt?: string; body?: string; style?: string }) {
    return http.post<{ data: { url: string; prompt: string; altText: string; provider: string } }>('ai/image', payload)
  },
  audio(body: string, name = '') {
    return http.post<{ data: { url: string; provider: string } }>('ai/audio', { body, name })
  },
  video(prompt: string, name = '') {
    return http.post<{ data: { url: string; jobId: string; status: string } }>('ai/video', { prompt, name })
  },
  videoStatus(operation: string, name = '') {
    return http.post<{ data: { url: string; jobId: string; status: string } }>('ai/video/status', { operation, name })
  },
  spellcheck(body: string) {
    return http.post<{ data: SpellReport }>('ai/spellcheck', { body })
  },
}

/* --- Archivos ---------------------------------------------------------- */

export const uploadsApi = {
  list(kind?: string) {
    return http.get<{ data: (Attachment & { _id: string })[] }>('uploads', kind ? { kind } : undefined)
  },
  upload(file: string, name: string) {
    return http.post<{ data: { url: string; kind: string; upload: Attachment & { _id: string } } }>(
      'uploads/cloudinary',
      { file, name },
    )
  },
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

/* --- Acuses de lectura (superadmin) ------------------------------------ */

export interface ReceiptRow {
  userId: string
  name: string
  email: string
  roleId: number
  organization: string
  position: string
  categoryNames: string[]
  read: boolean
  readAt: string | null
  times: number
  seconds: number
}

export interface ReceiptSummary {
  title: string
  total: number
  read: number
  unread: number
  rate: number
  rows: ReceiptRow[]
  status?: string
}

export const receiptsApi = {
  content(kind: ContentKind, id: string) {
    return http.get<{ data: ReceiptSummary }>(`receipts/${kind === 'article' ? 'articles' : 'updates'}/${id}`)
  },
  notification(id: string) {
    return http.get<{ data: ReceiptSummary }>(`receipts/notifications/${id}`)
  },
  inactive(days = 14) {
    return http.get<{
      data: {
        userId: string
        name: string
        email: string
        organization: string
        categoryNames: string[]
        lastLoginAt: string | null
      }[]
    }>('receipts/inactive', { days })
  },
}

/* --- Reportes diario y mensual ---------------------------------------- */

export const reportsApi = {
  list(kind?: 'daily' | 'monthly') {
    return http.get<{ data: EditorialReport[] }>('reports', kind ? { kind } : undefined)
  },
  latest(kind: 'daily' | 'monthly') {
    return http.get<{ data: EditorialReport | null }>('reports/latest', { kind })
  },
  detail(id: string) {
    return http.get<{ data: EditorialReport }>(`reports/${id}`)
  },
  generate(kind: 'daily' | 'monthly', date?: string) {
    return http.post<{ data: EditorialReport; message: string }>('reports', { kind, date })
  },
  remove(id: string) {
    return http.delete<{ message: string }>(`reports/${id}`)
  },
}
