<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReaderFeedStore, type FeedQuery, type ReaderKind } from '@/stores/readerFeed'
import ContentCard from '@/components/reader/ContentCard.vue'
import CardSkeleton from '@/components/reader/CardSkeleton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { DateRange } from '@/types'

const route = useRoute()
const router = useRouter()
const feed = useReaderFeedStore()

type Mode = 'kind' | 'category' | 'tag' | 'search'

const mode = computed(() => (route.meta.readerMode as Mode) || 'kind')

/**
 * En sección, etiqueta y búsqueda el tipo se elige con pestañas y viaja en la
 * URL: la ruta sigue siendo una por página y el enlace se puede compartir.
 */
const showTabs = computed(() => mode.value !== 'kind')

const kind = computed<ReaderKind>(() => {
  if (mode.value === 'kind') return route.meta.kind as ReaderKind
  return route.query.tipo === 'actualizaciones' ? 'update' : 'article'
})

const search = computed(() => String(route.query.q || '').trim())

/**
 * Ventana por defecto: la última semana. El archivo son miles de piezas y
 * abrir la vista pidiéndolo entero tarda; el chip queda marcado para que se
 * vea que hay un filtro puesto y se pueda quitar de un clic.
 */
function haceUnaSemana() {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - 7)
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function hoyISO() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

/** El rango viaja en la URL para que el enlace se pueda compartir. */
const range = computed<DateRange>(() => {
  // `todo=1` es la forma explícita de pedir el archivo completo.
  if (route.query.todo) return { from: '', to: '' }

  const desde = String(route.query.desde || '')
  const hasta = String(route.query.hasta || '')
  if (desde || hasta) return { from: desde, to: hasta }

  return { from: haceUnaSemana(), to: hoyISO() }
})

function setRange(value: DateRange) {
  const query = { ...route.query }

  if (value.from) query.desde = value.from
  else delete query.desde

  if (value.to) query.hasta = value.to
  else delete query.hasta

  // Sin fechas es "todo el archivo": hay que decirlo o volvería al por defecto.
  if (!value.from && !value.to) query.todo = '1'
  else delete query.todo

  void router.replace({ query })
}

const query = computed<FeedQuery>(() => ({
  kind: kind.value,
  categoryId: mode.value === 'category' ? String(route.params.categoryId || '') : undefined,
  tag: mode.value === 'tag' ? String(route.params.slug || '') : undefined,
  search: mode.value === 'search' ? search.value : undefined,
  from: range.value.from || undefined,
  to: range.value.to || undefined,
}))

const state = computed(() => feed.pageFor(query.value))

const category = computed(() => feed.categories.find((item) => item._id === route.params.categoryId))
const tag = computed(() => feed.tags.find((item) => item.slug === route.params.slug))

const heading = computed(() => {
  if (mode.value === 'category') return category.value?.name || 'Sección'
  if (mode.value === 'tag') return `#${tag.value?.name || route.params.slug}`
  if (mode.value === 'search') return search.value ? `Resultados de “${search.value}”` : 'Búsqueda'
  return kind.value === 'article' ? 'Reportajes' : 'Actualizaciones'
})

const accent = computed(() => category.value?.color || tag.value?.color || '')

const tabs = computed(() => [
  { value: 'reportajes', label: 'Reportajes' },
  { value: 'actualizaciones', label: 'Actualizaciones' },
])

function pickTab(value: string) {
  void router.replace({ query: { ...route.query, tipo: value } })
}

const canLoadMore = computed(() => state.value.page > 0 && state.value.page < state.value.pages)
const remaining = computed(() => Math.max(0, state.value.total - state.value.items.length))

// Cada cambio de ruta o de pestaña es una consulta distinta con su propia caché.
/**
 * Cada cambio de la consulta —tipo, sección, etiqueta, texto o fechas— es una
 * petición nueva al servidor. La caché del store decide si de verdad hace
 * falta salir a la red o basta con lo que ya tiene.
 */
watch(
  query,
  (value) => {
    if (mode.value === 'search' && !value.search) return
    void feed.ensure(value)
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="rlist">
    <header class="rlist__head" :style="accent ? { '--accent': accent } : undefined">
      <div class="rlist__title">
        <span v-if="accent" class="rlist__mark" />
        <div>
          <h1>{{ heading }}</h1>
          <p v-if="state.fetchedAt">
            {{ state.total }} {{ state.total === 1 ? 'pieza' : 'piezas' }}
            <Transition name="fade">
              <em v-if="state.refreshing"> · actualizando…</em>
            </Transition>
          </p>
        </div>
      </div>

      <div v-if="showTabs" class="rlist__tabs">
        <button
          v-for="item in tabs"
          :key="item.value"
          :class="[
            'rlist__tab',
            { 'rlist__tab--on': (route.query.tipo || 'reportajes') === item.value },
          ]"
          type="button"
          @click="pickTab(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </header>

    <div class="rlist__filters">
      <DateRangeFilter :model-value="range" @update:model-value="setRange" />
    </div>

    <!-- Sin búsqueda escrita no se pide nada al servidor. -->
    <EmptyState
      v-if="mode === 'search' && !search"
      icon="fa-solid fa-magnifying-glass"
      title="Escribe qué buscas"
      detail="Busca por título, entradilla, sección o etiqueta. Las tildes dan igual."
    />

    <div v-else-if="state.loading || !state.fetchedAt" class="rlist__items">
      <CardSkeleton v-for="index in 5" :key="index" />
    </div>

    <EmptyState
      v-else-if="state.error"
      icon="fa-solid fa-triangle-exclamation"
      title="No pudimos cargar"
      :detail="state.error"
    >
      <AppButton variant="ghost" size="sm" icon="fa-solid fa-rotate" @click="feed.ensure(query, true)">
        Reintentar
      </AppButton>
    </EmptyState>

    <template v-else-if="state.items.length">
      <TransitionGroup name="list" tag="div" class="rlist__items">
        <ContentCard v-for="item in state.items" :key="item._id" :item="item" :kind="kind" />
      </TransitionGroup>

      <div v-if="state.loadingMore" class="rlist__items">
        <CardSkeleton v-for="index in 2" :key="`more-${index}`" />
      </div>

      <footer v-if="canLoadMore" class="rlist__more">
        <AppButton variant="ghost" icon="fa-solid fa-arrow-down" :loading="state.loadingMore" @click="feed.loadMore(query)">
          Cargar {{ Math.min(remaining, feed.PAGE_SIZE) }} más
        </AppButton>
        <span>{{ state.items.length }} de {{ state.total }}</span>
      </footer>
    </template>

    <EmptyState
      v-else-if="mode === 'search'"
      icon="fa-solid fa-magnifying-glass"
      title="Nada coincide"
      detail="Prueba con otras palabras o mira la otra pestaña."
    />

    <EmptyState
      v-else
      icon="fa-regular fa-newspaper"
      title="Nada publicado aquí"
      detail="Cuando el equipo publique contenido aparecerá en esta vista."
    />
  </div>
</template>

<style scoped lang="scss">
.rlist {
  @include col(var(--s-5));
}

.rlist__head {
  @include row(var(--s-4), flex-end, space-between);
  flex-wrap: wrap;
}

.rlist__title {
  @include row(var(--s-3), center);

  h1 {
    font-family: var(--font-display);
    font-size: 28px;
    color: var(--text-strong);
  }

  p {
    @include eyebrow;
    font-size: 10px;
  }

  em {
    font-style: normal;
    color: var(--brand-strong);
  }
}

.rlist__mark {
  width: 4px;
  align-self: stretch;
  border-radius: var(--r-pill);
  background: var(--accent, var(--brand));
}

.rlist__filters {
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-md);
  background: var(--surface-raised);
  border: 1px solid var(--line);
}

.rlist__tabs {
  @include row(2px, center);
  padding: 3px;
  border-radius: var(--r-pill);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
}

.rlist__tab {
  padding: 6px 14px;
  border-radius: var(--r-pill);
  font-size: 12px;
  color: var(--text-muted);
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    color: var(--text);
  }
}

.rlist__tab--on {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.rlist__items {
  @include col(var(--s-3));
  position: relative;
}

.rlist__more {
  @include col(var(--s-2), center);
  padding-top: var(--s-2);

  span {
    @include eyebrow;
    font-size: 10px;
  }
}
</style>
