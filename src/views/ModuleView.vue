<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModuleTable from '@/components/ModuleTable.vue'
import { getModuleConfig } from '@/config/modules'
import { resourceService } from '@/services/resources'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const loading = ref(false)
const rows = ref<Record<string, unknown>[]>([])
const total = ref(0)
const query = ref('')
type ArticleStatusFilter = 'all' | 'draft' | 'scheduled' | 'published'
const statusFilter = ref<ArticleStatusFilter>('all')
const articleFilters: { key: ArticleStatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Borradores' },
  { key: 'scheduled', label: 'Programados' },
  { key: 'published', label: 'Publicados' },
]

const currentModule = computed(() => getModuleConfig(String(route.meta.moduleKey || '')))
const moduleTheme = computed(() => currentModule.value?.presentation.variant || 'operator')
const isArticleModule = computed(() => currentModule.value?.key === 'articles')
const visibleRows = computed(() => {
  if (!isArticleModule.value || statusFilter.value === 'all') return rows.value
  return rows.value.filter((row) => row.status === statusFilter.value)
})

const heroStats = computed(() => {
  const module = currentModule.value
  if (!module) return []

  return [
    { label: 'Acción', value: module.key === 'articles' ? 'Publicar' : 'Gestionar' },
    { label: 'Acceso', value: module.key === 'users' ? 'Administradores' : 'Equipo editorial' },
    { label: 'Total', value: String(total.value) },
  ]
})

async function loadRecords() {
  if (!currentModule.value) return

  loading.value = true

  try {
    const response = await resourceService.list<Record<string, unknown>>(currentModule.value.apiPath, { search: query.value })

    rows.value = response.data
    total.value = response.total
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  if (!currentModule.value) return
  if (currentModule.value.key === 'articles') {
    void router.push('/admin/articles/new')
    return
  }
  uiStore.openEditor(currentModule.value.key, 'create')
}

function setStatusFilter(status: ArticleStatusFilter) {
  statusFilter.value = status
}

function handleEdit(row: Record<string, unknown>) {
  if (!currentModule.value) return

  if (currentModule.value.key === 'articles') {
    const id = String(row._id || row.id || '')
    if (id) void router.push(`/admin/articles/${id}/edit`)
    return
  }

  uiStore.openEditor(currentModule.value.key, 'edit', row)
}

async function handleRemove(row: Record<string, unknown>) {
  if (!currentModule.value) return
  const id = String(row._id || row.id || '')
  if (!id) return

  await resourceService.remove(currentModule.value.deletePath(id))
  await loadRecords()
}

function refreshFromModal() {
  loadRecords()
}

let searchTimer: ReturnType<typeof window.setTimeout> | null = null

watch(
  () => route.path,
  () => {
    loadRecords()
  },
  { immediate: true },
)

watch(query, () => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    loadRecords()
  }, 180)
})

onMounted(() => {
  window.addEventListener('module:refresh', refreshFromModal as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('module:refresh', refreshFromModal as EventListener)
  if (searchTimer) window.clearTimeout(searchTimer)
})
</script>

<template>
  <div v-if="currentModule" class="module-page" :class="[`module-page--${moduleTheme}`]">
    <template v-if="isArticleModule">
      <section class="article-workspace">
        <div class="article-workspace__header">
          <div>
            <span class="section-label">Publicaciones</span>
            <h2>Artículos</h2>
            <p>Administra borradores, publicaciones programadas y noticias publicadas.</p>
          </div>
          <button type="button" class="primary-button" @click="openCreateModal"><i class="fa-solid fa-plus"></i>Nueva publicación</button>
        </div>

        <div class="article-workspace__toolbar">
          <div class="status-filter" aria-label="Filtrar artículos por estado">
            <button v-for="option in articleFilters" :key="option.key" type="button" :class="{ active: statusFilter === option.key }" @click="setStatusFilter(option.key)"><span>{{ option.label }}</span></button>
          </div>
          <label class="search-pill"><i class="fa-solid fa-magnifying-glass"></i><input v-model="query" type="search" placeholder="Buscar por título o contenido" aria-label="Buscar artículos" /></label>
        </div>

        <div class="article-workspace__summary">
          <span><i class="fa-solid fa-layer-group"></i>{{ visibleRows.length }} artículos visibles</span>
          <span><i class="fa-solid fa-clock"></i>Las publicaciones programadas se activan automáticamente.</span>
        </div>

        <section class="article-workspace__table module-card">
          <ModuleTable :columns="currentModule.columns" :rows="visibleRows" :loading="loading" @edit="handleEdit" @remove="handleRemove" />
        </section>
      </section>
    </template>

    <template v-else>
    <section class="module-hero surface-card">
      <div class="module-hero__copy">
        <span class="module-hero__kicker eyebrow">
          <i class="fa-solid fa-signal" aria-hidden="true"></i>
          {{ currentModule.presentation.kicker }}
        </span>
        <h2 class="section-title">{{ currentModule.presentation.headline }}</h2>
        <p class="section-copy">{{ currentModule.presentation.description }}</p>

        <div class="module-tags">
          <span v-for="badge in currentModule.presentation.badges" :key="badge" class="chip">{{ badge }}</span>
        </div>
      </div>

      <div class="module-hero__panel glass-card">
        <div class="hero-score">
          <span>Registros</span>
          <strong>{{ total }}</strong>
        </div>
        <div class="hero-stack">
          <article v-for="item in heroStats" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <button type="button" class="primary-button" @click="openCreateModal">
          <i class="fa-solid fa-plus" aria-hidden="true"></i>
          {{ currentModule.key === 'articles' ? 'Nueva publicación' : 'Nuevo registro' }}
        </button>
      </div>
    </section>

    <section class="module-layout">
      <section class="module-card surface-card">
        <div class="module-card__head">
          <div>
            <span class="section-label">Listado</span>
            <h3 class="section-title">Registros recientes</h3>
          </div>

          <label class="search-pill">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input v-model="query" type="search" placeholder="Buscar" aria-label="Buscar en el módulo" />
          </label>
        </div>

        <ModuleTable
          :columns="currentModule.columns"
          :rows="rows"
          :loading="loading"
          @edit="handleEdit"
          @remove="handleRemove"
        />
      </section>

      <aside class="module-card module-card--aside surface-card">
        <span class="section-label">Acciones</span>
        <h3 class="section-title">Flujo editorial</h3>
        <p v-if="currentModule.key === 'articles'">
          Como administrador puedes guardar borradores, programar una fecha futura, publicar de inmediato o eliminar una noticia.
        </p>
        <p v-else>
          Usa el formulario para crear o editar registros desde esta vista.
        </p>

        <div class="module-card__facts">
          <article>
            <span>Estado</span>
            <strong>{{ currentModule.title }}</strong>
          </article>
          <article>
            <span>Total</span>
            <strong>{{ total }}</strong>
          </article>
        </div>
      </aside>
    </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.module-page {
  display: grid;
  gap: 1rem;
}

.article-workspace {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.article-workspace__header,
.article-workspace__toolbar,
.article-workspace__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.article-workspace__header {
  padding: clamp(1.25rem, 3vw, 2rem);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 26px;
  background:
    radial-gradient(circle at right top, rgba(200, 57, 43, 0.2), transparent 34%),
    radial-gradient(circle at 65% 100%, rgba(32, 148, 210, 0.14), transparent 40%),
    linear-gradient(145deg, #121f3c, #0b1429);

  > div { min-width: 0; }
  h2 { margin-top: 0.25rem; color: $text-light; font-family: var(--font-display); font-size: clamp(2.2rem, 5vw, 4rem); letter-spacing: -0.06em; }
  p { margin-top: 0.5rem; color: rgba(246, 241, 232, 0.72); }
}

.article-workspace__toolbar {
  padding: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: rgba(16, 28, 54, 0.8);
}

.status-filter {
  display: flex;
  gap: 0.35rem;
  flex: 1 1 420px;
  overflow-x: auto;

  button {
    flex: 0 0 auto;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 0.6rem 0.85rem;
    background: transparent;
    color: rgba(246, 241, 232, 0.68);
    cursor: pointer;
    font: inherit;
    font-size: 0.86rem;
    transition: color 180ms ease, background 180ms ease, border-color 180ms ease;

    &:hover { color: $text-light; }
    &.active { color: $text-light; border-color: rgba(255, 176, 168, 0.55); background: rgba(200, 57, 43, 0.22); }
  }
}

.article-workspace__toolbar .search-pill { flex: 1 1 280px; width: auto; }

.article-workspace__summary {
  padding: 0 0.25rem;
  color: rgba(246, 241, 232, 0.68);
  font-size: 0.9rem;

  span { display: inline-flex; align-items: center; gap: 0.45rem; }
  i { color: $accent-red; }
}

.article-workspace__table { width: 100%; }

.module-page--editorial .module-hero,
.module-page--broadcast .module-hero {
  background:
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.22), transparent 28%),
    linear-gradient(135deg, rgba(6, 12, 28, 0.98), rgba(12, 23, 54, 0.94));
}

.module-page--archive .module-hero,
.module-page--ledger .module-hero {
  background:
    radial-gradient(circle at top right, rgba(201, 168, 76, 0.2), transparent 28%),
    linear-gradient(135deg, rgba(6, 12, 28, 0.98), rgba(13, 19, 44, 0.96));
}

.module-page--operator .module-hero {
  background:
    radial-gradient(circle at top right, rgba(32, 148, 210, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(6, 12, 28, 0.98), rgba(12, 23, 54, 0.94));
}

.module-hero {
  padding: 1.2rem;
  display: grid;
  gap: 1rem;
  color: $text-light;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.module-hero__copy {
  display: grid;
  gap: 0.9rem;

  .section-title {
    font-size: clamp(2rem, 7vw, 4rem);
    max-width: 12ch;
  }

  .section-copy {
    max-width: 62ch;
    color: rgba(246, 241, 232, 0.74);
  }
}

.module-hero__kicker {
  i {
    color: $accent-red;
  }
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.module-hero__panel {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  color: $text-light;
}

.hero-score,
.hero-stack article {
  border-radius: 22px;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
}

.hero-score {
  display: grid;
  gap: 0.1rem;

  span {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(246, 241, 232, 0.7);
  }

  strong {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5vw, 3.5rem);
    line-height: 1;
    letter-spacing: -0.06em;
  }
}

.hero-stack {
  display: grid;
  gap: 0.75rem;

  article {
    display: flex;
    justify-content: space-between;
    align-items: center;

    span {
      color: rgba(246, 241, 232, 0.68);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.7rem;
    }

    strong {
      font-family: var(--font-display);
      font-size: 1rem;
      color: $accent-red;
      letter-spacing: -0.03em;
    }
  }
}

.module-layout {
  display: grid;
  gap: 1rem;
}

.module-card {
  padding: 1rem;
  display: grid;
  gap: 1rem;
  color: $text-light;
  background: linear-gradient(145deg, #121f3c, #0b1429);
  border: 1px solid rgba(255, 255, 255, 0.1);

  .section-title {
    color: $text-light;
  }
}

.module-card__head {
  display: grid;
  gap: 0.85rem;
}

.search-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.07);

  i {
    color: $accent-red;
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    outline: none;
    color: $text-light;
  }
}

.module-card--aside {
  background:
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.2), transparent 30%),
    linear-gradient(145deg, #162a4a, #0b1429);

  p {
    color: rgba(246, 241, 232, 0.72);
    line-height: 1.65;
  }
}

.module-card__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  article {
    padding: 0.95rem;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  span {
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.68rem;
    color: rgba(246, 241, 232, 0.62);
  }

  strong {
    display: block;
    margin-top: 0.25rem;
    font-family: var(--font-display);
    font-size: 1.3rem;
    color: $text-light;
    letter-spacing: -0.04em;
  }
}

@media (min-width: 820px) {
  .module-hero {
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
    align-items: end;
    padding: 1.5rem;
  }

  .module-card__head {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .search-pill {
    width: 320px;
  }

  .module-layout {
    grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.72fr);
    align-items: start;
  }

  .module-card--aside {
    position: sticky;
    top: 0;
  }
}
</style>
