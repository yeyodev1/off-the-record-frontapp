<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ModuleTable from '@/components/ModuleTable.vue'
import { getModuleConfig } from '@/config/modules'
import { resourceService } from '@/services/resources'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const uiStore = useUiStore()
const loading = ref(false)
const rows = ref<Record<string, unknown>[]>([])
const total = ref(0)
const query = ref('')

const currentModule = computed(() => getModuleConfig(String(route.path).replace(/^\//, '')))
const moduleTheme = computed(() => currentModule.value?.presentation.variant || 'operator')

const heroStats = computed(() => {
  const module = currentModule.value
  if (!module) return []

  return [
    { label: module.presentation.badges[0] || 'Estado', value: module.title },
    { label: module.presentation.badges[1] || 'Modo', value: module.accent.toUpperCase() },
    { label: module.presentation.badges[2] || 'Total', value: String(total.value) },
  ]
})

async function loadRecords() {
  if (!currentModule.value) return

  loading.value = true

  try {
    const response = await resourceService.list<Record<string, unknown>>(currentModule.value.apiPath, {
      search: query.value,
      limit: 25,
      page: 1,
    })

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
  uiStore.openEditor(currentModule.value.key, 'create')
}

function handleEdit(row: Record<string, unknown>) {
  if (!currentModule.value) return
  uiStore.openEditor(currentModule.value.key, 'edit', row)
}

async function handleRemove(row: Record<string, unknown>) {
  if (!currentModule.value) return
  const id = String(row._id || row.id || '')
  if (!id) return

  await resourceService.remove(`${currentModule.value.apiPath}/${id}`)
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
          Nuevo registro
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
        <p>
          Usa el modal global para crear o editar sin romper la lectura de la página.
          La navegación y el ritmo visual se mantienen consistentes en todo el sistema.
        </p>

        <div class="module-card__facts">
          <article>
            <span>Estado</span>
            <strong>{{ moduleTheme }}</strong>
          </article>
          <article>
            <span>Total</span>
            <strong>{{ total }}</strong>
          </article>
        </div>
      </aside>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.module-page {
  display: grid;
  gap: 1rem;
}

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
  border: 1px solid rgba(1, 13, 39, 0.1);
  background: rgba(1, 13, 39, 0.03);

  i {
    color: $accent-red;
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    outline: none;
    color: $primary-dark;
  }
}

.module-card--aside {
  background:
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 246, 242, 0.96));

  p {
    color: rgba(1, 13, 39, 0.68);
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
    background: rgba(1, 13, 39, 0.03);
    border: 1px solid rgba(1, 13, 39, 0.08);
  }

  span {
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.68rem;
    color: rgba(1, 13, 39, 0.54);
  }

  strong {
    display: block;
    margin-top: 0.25rem;
    font-family: var(--font-display);
    font-size: 1.3rem;
    color: $primary-dark;
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
