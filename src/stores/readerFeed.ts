import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { analyticsApi, contentApi, readerApi } from '@/services/api'
import type { ContentItem, DailyBrief, ReaderFacets } from '@/types'

export type ReaderKind = 'article' | 'update'

export interface FeedQuery {
  kind: ReaderKind
  categoryId?: string
  tag?: string
  search?: string
  from?: string
  to?: string
}

export interface FeedPage {
  items: ContentItem[]
  total: number
  page: number
  pages: number
  /** Primera carga: es la única que muestra skeletons. */
  loading: boolean
  /** Revalidación en segundo plano sobre datos ya visibles. */
  refreshing: boolean
  loadingMore: boolean
  error: string
  fetchedAt: number
}

/** Diez por tanda: el archivo migrado es grande y traerlo entero tarda. */
const PAGE_SIZE = 10
/** Pasado este tiempo el contenido cacheado se revalida al volver a entrar. */
const STALE_MS = 60_000
const FACETS_STALE_MS = 5 * 60_000

function keyOf(query: FeedQuery) {
  return [
    query.kind,
    query.categoryId || '',
    query.tag || '',
    (query.search || '').trim().toLowerCase(),
    query.from || '',
    query.to || '',
  ].join('|')
}

function emptyPage(): FeedPage {
  return {
    items: [],
    total: 0,
    page: 0,
    pages: 1,
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: '',
    fetchedAt: 0,
  }
}

/** Estado que se devuelve mientras una consulta todavía no se ha pedido. */
const VACIA: FeedPage = emptyPage()

/**
 * Cada vista del lector pide su propia página al backend y se queda cacheada
 * por consulta. Al volver a una vista ya visitada se pinta al instante desde
 * la caché y, si está vieja, se revalida por detrás sin vaciar la pantalla.
 */
export const useReaderFeedStore = defineStore('readerFeed', () => {
  const pages = reactive(new Map<string, FeedPage>())
  const detail = reactive(new Map<string, ContentItem>())

  const facets = ref<ReaderFacets | null>(null)
  const facetsAt = ref(0)
  const facetsLoading = ref(false)

  const brief = ref<DailyBrief | null>(null)
  const briefAt = ref(0)

  /**
   * Estado de una consulta. **Sólo lee.** Antes creaba la entrada aquí mismo,
   * pero las vistas lo llaman dentro de un `computed`: escribir en el Map
   * reactivo durante el cálculo invalida esa misma dependencia, Vue corta la
   * recursión y el computed se queda sin actualizar. El resultado era que los
   * datos llegaban y la pantalla seguía vacía.
   */
  function pageFor(query: FeedQuery): FeedPage {
    return pages.get(keyOf(query)) || VACIA
  }

  /** Crea la entrada si hace falta. Sólo desde acciones, nunca desde un computed. */
  function entryFor(query: FeedQuery): FeedPage {
    const key = keyOf(query)
    if (!pages.has(key)) pages.set(key, emptyPage())
    return pages.get(key) as FeedPage
  }

  async function fetchInto(entry: FeedPage, query: FeedQuery, page: number) {
    const { data, total, pages: totalPages } = await contentApi.feed(query.kind, {
      page,
      limit: PAGE_SIZE,
      categoryId: query.categoryId,
      tag: query.tag,
      search: query.search,
      from: query.from,
      to: query.to,
    })

    entry.items = page === 1 ? data : [...entry.items, ...data]
    entry.total = total
    entry.page = page
    entry.pages = totalPages
    entry.fetchedAt = Date.now()
    entry.error = ''
  }

  /**
   * Punto de entrada de las vistas. Con caché fresca no hace nada; con caché
   * vieja revalida sin quitar lo que ya se ve; sin caché carga con skeleton.
   */
  async function ensure(query: FeedQuery, force = false) {
    const entry = entryFor(query)
    const fresh = Date.now() - entry.fetchedAt < STALE_MS

    if (entry.loading || entry.refreshing) return entry
    if (entry.fetchedAt && fresh && !force) return entry

    const firstTime = !entry.fetchedAt
    if (firstTime) entry.loading = true
    else entry.refreshing = true

    try {
      await fetchInto(entry, query, 1)
    } catch (error) {
      entry.error = error instanceof Error ? error.message : 'No pudimos cargar el contenido'
    } finally {
      entry.loading = false
      entry.refreshing = false
    }

    return entry
  }

  async function loadMore(query: FeedQuery) {
    const entry = entryFor(query)
    if (entry.loadingMore || entry.page >= entry.pages) return

    entry.loadingMore = true
    try {
      await fetchInto(entry, query, entry.page + 1)
    } catch (error) {
      entry.error = error instanceof Error ? error.message : 'No pudimos cargar más'
    } finally {
      entry.loadingMore = false
    }
  }

  async function ensureFacets(force = false) {
    if (facetsLoading.value) return
    if (facets.value && Date.now() - facetsAt.value < FACETS_STALE_MS && !force) return

    facetsLoading.value = true
    try {
      const { data } = await readerApi.facets()
      facets.value = data
      facetsAt.value = Date.now()
    } catch {
      /* la barra lateral nunca debe romper la lectura */
    } finally {
      facetsLoading.value = false
    }
  }

  async function ensureBrief(force = false) {
    if (brief.value && Date.now() - briefAt.value < FACETS_STALE_MS && !force) return

    try {
      const { data } = await analyticsApi.brief()
      brief.value = data
      briefAt.value = Date.now()
    } catch {
      /* los indicadores son adorno: su fallo no bloquea nada */
    }
  }

  /** El detalle también se cachea: volver atrás y reentrar es instantáneo. */
  async function ensureDetail(kind: ReaderKind, id: string, force = false) {
    const key = `${kind}:${id}`
    if (detail.has(key) && !force) return detail.get(key) as ContentItem

    const { data } = await contentApi.detail(kind, id)
    detail.set(key, data)
    return data
  }

  function cachedDetail(kind: ReaderKind, id: string) {
    return detail.get(`${kind}:${id}`) || null
  }

  /** Tras publicar o al pedir refresco manual: se tira todo lo cacheado. */
  function invalidate() {
    pages.clear()
    detail.clear()
    facetsAt.value = 0
    briefAt.value = 0
  }

  const counts = computed(() => facets.value?.counts || { all: 0, article: 0, update: 0 })
  const categories = computed(() => facets.value?.categories || [])
  const tags = computed(() => facets.value?.tags || [])

  return {
    pages,
    facets,
    facetsLoading,
    brief,
    counts,
    categories,
    tags,
    pageFor,
    entryFor,
    ensure,
    loadMore,
    ensureFacets,
    ensureBrief,
    ensureDetail,
    cachedDetail,
    invalidate,
    PAGE_SIZE,
  }
})
