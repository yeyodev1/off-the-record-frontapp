<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { catalogApi, contentApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { useSessionStore } from '@/stores/session'
import { STATUS_META } from '@/config/navigation'
import { formatDateTime, formatNumber, formatRelative } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ReceiptsDrawer from '@/components/content/ReceiptsDrawer.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import type { Category, ContentItem, ContentKind, DateRange } from '@/types'

const props = defineProps<{ kind: ContentKind }>()

const router = useRouter()
const toasts = useToastStore()
const session = useSessionStore()

const items = ref<ContentItem[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const search = ref('')
const status = ref('')
const categoryId = ref('')
const onlyMine = ref(false)
/** Arranca en la última semana: el archivo completo son miles de piezas. */
const range = ref<DateRange>(
  (() => {
    const desde = new Date()
    desde.setDate(desde.getDate() - 7)
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { from: iso(desde), to: iso(new Date()) }
  })(),
)

const confirmOpen = ref(false)
const deleting = ref(false)
const target = ref<ContentItem | null>(null)

const receiptsOpen = ref(false)
const receiptsTarget = ref<ContentItem | null>(null)

const isArticle = computed(() => props.kind === 'article')
const basePath = computed(() => (isArticle.value ? '/admin/reportajes' : '/admin/actualizaciones'))

const statusTabs = computed(() => [
  { value: '', label: 'Todos', icon: 'fa-solid fa-list', count: items.value.length },
  { value: 'draft', label: 'Borradores', icon: 'fa-regular fa-pen-to-square' },
  { value: 'review', label: 'Revisión', icon: 'fa-solid fa-magnifying-glass' },
  { value: 'scheduled', label: 'Programados', icon: 'fa-regular fa-clock' },
  { value: 'published', label: 'Publicados', icon: 'fa-solid fa-circle-check' },
])

const categoryOptions = computed(() => [
  { value: '', label: 'Todas las secciones' },
  ...categories.value.map((category) => ({ value: category._id, label: category.name, color: category.color })),
])

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (categoryId.value && item.categoryId !== categoryId.value) return false
    if (onlyMine.value && item.authorId !== session.user?._id) return false
    if (!term) return true
    return `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase().includes(term)
  })
})

// El rango lo resuelve el servidor: no basta filtrar lo ya traído porque el
// listado viene recortado a 300 filas.
watch(range, () => void load(), { deep: true })

async function load() {
  loading.value = true
  try {
    const [list, cats] = await Promise.all([
      contentApi.list(props.kind, {
        status: status.value || undefined,
        from: range.value.from || undefined,
        to: range.value.to || undefined,
      }),
      catalogApi.categories('content'),
    ])
    items.value = list.data
    categories.value = cats.data
  } catch (error) {
    toasts.error('No pudimos cargar el listado', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function askDelete(item: ContentItem) {
  target.value = item
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!target.value) return
  deleting.value = true
  try {
    await contentApi.remove(props.kind, target.value._id)
    items.value = items.value.filter((item) => item._id !== target.value?._id)
    toasts.success('Contenido eliminado', target.value.title)
    confirmOpen.value = false
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  } finally {
    deleting.value = false
  }
}

function openReceipts(item: ContentItem) {
  receiptsTarget.value = item
  receiptsOpen.value = true
}

watch(status, load)
watch(() => props.kind, load)

onMounted(load)
</script>

<template>
  <div class="clist">
    <PageHeader
      :eyebrow="isArticle ? 'Contenido principal' : 'Seguimiento'"
      :title="isArticle ? 'Reportajes' : 'Actualizaciones'"
      :detail="
        isArticle
          ? 'Investigaciones con bloques, multimedia, infografías y distribución por Signal.'
          : 'Seguimientos breves, programables y enlazados a un reportaje.'
      "
      :icon="isArticle ? 'fa-solid fa-newspaper' : 'fa-solid fa-bolt'"
    >
      <template #actions>
        <AppButton icon="fa-solid fa-plus" @click="router.push(`${basePath}/${isArticle ? 'nuevo' : 'nueva'}`)">
          {{ isArticle ? 'Nuevo reportaje' : 'Nueva actualización' }}
        </AppButton>
      </template>
    </PageHeader>

    <section class="clist__filters">
      <!-- Estado: es la navegación principal, va sola arriba. -->
      <AppTabs v-model="status" :items="statusTabs" />

      <div class="clist__bar">
        <div class="clist__search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input v-model="search" type="search" placeholder="Buscar por título, sumario o etiqueta…" />
          <button v-if="search" type="button" aria-label="Limpiar búsqueda" @click="search = ''">
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <AppSelect v-model="categoryId" class="clist__select" :options="categoryOptions" />

        <button
          :class="['clist__toggle', { 'clist__toggle--on': onlyMine }]"
          type="button"
          data-cuelume-toggle
          @click="onlyMine = !onlyMine"
        >
          <i class="fa-solid fa-user-pen" aria-hidden="true" /> Solo míos
        </button>
      </div>

      <DateRangeFilter v-model="range" label="Fechas" />
    </section>

    <AppSkeleton v-if="loading" :rows="4" height="96px" />

    <TransitionGroup v-else-if="filtered.length" name="list" tag="div" class="clist__items">
      <article v-for="item in filtered" :key="item._id" class="row" :style="{ '--row-accent': item.accentColor }">
        <span class="row__accent" />

        <div class="row__main" @click="router.push(`${basePath}/${item._id}`)">
          <div class="row__meta">
            <AppBadge :tone="(STATUS_META[item.status]?.tone as never) || 'neutral'" :icon="STATUS_META[item.status]?.icon">
              {{ STATUS_META[item.status]?.label || item.status }}
            </AppBadge>
            <AppBadge v-if="item.categoryName" :color="item.accentColor">{{ item.categoryName }}</AppBadge>
            <span v-if="item.status === 'scheduled'">{{ formatDateTime(item.scheduledFor) }}</span>
            <span v-else>{{ formatRelative(item.updatedAt) }}</span>
          </div>

          <h2>{{ item.title }}</h2>
          <p v-if="item.summary">{{ item.summary }}</p>

          <div class="row__stats">
            <span><i class="fa-solid fa-eye" /> {{ formatNumber(item.stats?.views) }}</span>
            <span><i class="fa-solid fa-user-check" /> {{ formatNumber(item.stats?.uniqueViews) }}</span>
            <span v-if="item.share?.enabled"><i class="fa-solid fa-share-nodes" /> {{ formatNumber(item.share.visits) }}</span>
            <span v-if="item.attachments?.length"><i class="fa-solid fa-paperclip" /> {{ item.attachments.length }}</span>
            <span
              v-if="item.spellcheck?.issues?.length"
              class="row__spell"
              :title="`${item.spellcheck.issues.length} avisos ortográficos`"
            >
              <i class="fa-solid fa-spell-check" /> {{ item.spellcheck.issues.length }}
            </span>
          </div>
        </div>

        <div class="row__actions">
          <AppButton size="sm" variant="ghost" icon="fa-solid fa-pen" title="Editar" @click="router.push(`${basePath}/${item._id}`)" />
          <AppButton
            v-if="session.isSuperadmin"
            size="sm"
            variant="ghost"
            icon="fa-solid fa-eye"
            title="Ver quién lo leyó"
            @click="openReceipts(item)"
          />
          <AppButton size="sm" variant="ghost" icon="fa-regular fa-trash-can" title="Eliminar" @click="askDelete(item)" />
        </div>
      </article>
    </TransitionGroup>

    <EmptyState
      v-else
      :icon="isArticle ? 'fa-regular fa-newspaper' : 'fa-solid fa-bolt'"
      :title="search || status ? 'Sin resultados' : 'Todavía no hay contenido'"
      detail="Crea el primero y aparecerá en esta lista."
    >
      <AppButton icon="fa-solid fa-plus" @click="router.push(`${basePath}/${isArticle ? 'nuevo' : 'nueva'}`)">
        Crear ahora
      </AppButton>
    </EmptyState>

    <ConfirmDialog
      v-model="confirmOpen"
      :title="`¿Eliminar «${target?.title || ''}»?`"
      message="El contenido y sus métricas asociadas dejarán de estar disponibles."
      confirm-label="Eliminar"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <ReceiptsDrawer
      v-model="receiptsOpen"
      :kind="kind"
      :content-id="receiptsTarget?._id || ''"
      :title="receiptsTarget?.title || ''"
    />
  </div>
</template>

<style scoped lang="scss">
.clist {
  @include col(var(--s-5));
}

.clist__filters {
  @include col(var(--s-4));
  padding: var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
}

/* Búsqueda, sección y "solo míos" comparten fila. */
.clist__bar {
  @include row(var(--s-3), center);
  flex-wrap: wrap;
}

.clist__search {
  position: relative;
  flex: 1 1 240px;

  > i {
    position: absolute;
    inset-inline-start: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--text-dim);
  }

  input {
    width: 100%;
    height: 38px;
    padding: 0 36px 0 38px;
    border-radius: var(--r-pill);
    background: var(--surface-sunken);
    border: 1px solid var(--line);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--brand-line);
    }

    // Chrome dibuja su propia × en type="search"; usamos la nuestra.
    &::-webkit-search-cancel-button {
      appearance: none;
    }
  }

  > button {
    position: absolute;
    inset-inline-end: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--text-dim);

    &:hover {
      color: var(--text);
    }
  }
}

.clist__select {
  flex: 0 1 220px;
}

.clist__toggle {
  @include row(var(--s-2), center);
  flex: 0 0 auto;
  height: 38px;
  padding: 0 16px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  font-size: 13px;
  color: var(--text-muted);
  transition:
    border-color var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    border-color: var(--line-strong);
    color: var(--text);
  }
}

.clist__toggle--on {
  border-color: var(--brand-line);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.clist__items {
  @include col(var(--s-3));
  position: relative;
}

.row {
  position: relative;
  @include row(var(--s-4), center);
  padding: var(--s-4) var(--s-5);
  padding-inline-start: var(--s-6);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  overflow: hidden;
  transition: border-color var(--t-fast) var(--ease);

  &:hover {
    border-color: color-mix(in srgb, var(--row-accent) 45%, transparent);
  }

  @include mobile {
    flex-direction: column;
    align-items: stretch;
  }
}

.row__accent {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 4px;
  background: var(--row-accent, var(--brand));
}

.row__main {
  @include col(var(--s-2));
  flex: 1;
  min-width: 0;
  cursor: pointer;

  h2 {
    font-size: 18px;
    font-family: var(--font-ui);
    letter-spacing: 0;
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
    @include truncate(2);
  }
}

.row__meta {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
  @include eyebrow;
  font-size: 10px;
}

.row__stats {
  @include row(var(--s-4), center);
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);

  i {
    margin-inline-end: 4px;
  }
}

.row__spell {
  color: var(--gold);
}

.row__actions {
  @include row(var(--s-1), center);
  flex-shrink: 0;
}
</style>
