<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getModuleConfig } from '@/config/modules'
import { resourceService } from '@/services/resources'
import ModuleTable from '@/components/ModuleTable.vue'

const route = useRoute()
const loading = ref(false)
const saving = ref(false)
const rows = ref<Record<string, unknown>[]>([])
const total = ref(0)
const query = ref('')
const editingId = ref<string | null>(null)

const currentModule = computed(() => getModuleConfig(String(route.path).replace(/^\//, '')))
const formState = reactive<Record<string, string | number | boolean | null>>({})

const moduleTheme = computed(() => currentModule.value?.presentation.variant || 'operator')

const heroStats = computed(() => {
  const module = currentModule.value
  if (!module) return []

  return [
    { label: module.presentation.badges[0] || 'Estado', value: module.title },
    { label: module.presentation.badges[1] || 'Accion', value: module.accent.toUpperCase() },
    { label: module.presentation.badges[2] || 'Total', value: String(total.value) },
  ]
})

function normalizeDate(value: unknown) {
  if (!value) return ''
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function setFieldValue(name: string, value: string | number | boolean | null) {
  formState[name] = value
}

function getTextValue(name: string) {
  const value = formState[name]
  return value === null || value === undefined ? '' : String(value)
}

function getBooleanValue(name: string) {
  return Boolean(formState[name])
}

function resetForm() {
  if (!currentModule.value) return

  Object.keys(formState).forEach((key) => delete formState[key])
  currentModule.value.fields.forEach((field) => {
    formState[field.name] = field.type === 'checkbox' ? false : ''
  })
  editingId.value = null
}

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

function applyRow(row: Record<string, unknown>) {
  if (!currentModule.value) return

  editingId.value = String(row._id || row.id || '')
  currentModule.value.fields.forEach((field) => {
    const value = row[field.name]
    if (field.type === 'tags' && Array.isArray(value)) {
      formState[field.name] = value.join(', ')
      return
    }

    if (field.type === 'checkbox') {
      formState[field.name] = Boolean(value)
      return
    }

    if (field.type === 'date') {
      formState[field.name] = normalizeDate(value)
      return
    }

    formState[field.name] = value === null || value === undefined ? '' : String(value)
  })
}

async function submitForm() {
  if (!currentModule.value) return

  saving.value = true

  try {
    const payload: Record<string, unknown> = {}

    currentModule.value.fields.forEach((field) => {
      const value = formState[field.name]

      if (field.type === 'checkbox') {
        payload[field.name] = !!value
        return
      }

      if (field.type === 'number') {
        payload[field.name] = value === '' || value === null || value === undefined ? null : Number(value)
        return
      }

      if (field.type === 'tags') {
        payload[field.name] = String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
        return
      }

      if (field.type === 'date') {
        payload[field.name] = value ? new Date(String(value)).toISOString() : null
        return
      }

      payload[field.name] = value
    })

    if (editingId.value) {
      await resourceService.update(`${currentModule.value.apiPath}/${editingId.value}`, payload)
    } else {
      await resourceService.create(currentModule.value.apiPath, payload)
    }

    resetForm()
    await loadRecords()
  } finally {
    saving.value = false
  }
}

async function removeRow(row: Record<string, unknown>) {
  if (!currentModule.value) return

  const id = String(row._id || row.id || '')
  if (!id) return

  await resourceService.remove(`${currentModule.value.apiPath}/${id}`)
  await loadRecords()
}

watch(
  () => route.path,
  () => {
    resetForm()
    loadRecords()
  },
  { immediate: true },
)

onMounted(() => {
  if (currentModule.value) {
    resetForm()
  }
})
</script>

<template>
  <div v-if="currentModule" class="module-page" :class="[`module-page--${moduleTheme}`]">
    <section class="module-hero">
      <div class="module-hero__copy">
        <span class="module-hero__kicker">
          <i class="fa-solid fa-signal" aria-hidden="true"></i>
          {{ currentModule.presentation.kicker }}
        </span>
        <h2>{{ currentModule.presentation.headline }}</h2>
        <p>{{ currentModule.presentation.description }}</p>

        <div class="module-tags">
          <span v-for="badge in currentModule.presentation.badges" :key="badge">{{ badge }}</span>
        </div>
      </div>

      <div class="module-hero__panel">
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
      </div>
    </section>

    <section class="module-layout">
      <form class="editor" @submit.prevent="submitForm">
        <div class="editor__header">
          <div>
            <span class="editor__eyebrow">{{ editingId ? 'Editar registro' : 'Crear registro' }}</span>
            <h3>{{ currentModule.title }}</h3>
          </div>
          <button type="button" class="ghost" @click="resetForm">
            <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
            Limpiar
          </button>
        </div>

        <label v-for="field in currentModule.fields" :key="field.name" class="field">
          <span>{{ field.label }}</span>

          <input
            v-if="field.type === 'text' || field.type === 'email' || field.type === 'password' || field.type === 'number' || field.type === 'date'"
            :value="getTextValue(field.name)"
            @input="setFieldValue(field.name, ($event.target as HTMLInputElement).value)"
            :type="field.type === 'number' ? 'number' : field.type"
            :placeholder="field.placeholder || field.label"
          />

          <textarea
            v-else-if="field.type === 'textarea'"
            :value="getTextValue(field.name)"
            @input="setFieldValue(field.name, ($event.target as HTMLTextAreaElement).value)"
            rows="5"
          />

          <input
            v-else-if="field.type === 'tags'"
            :value="getTextValue(field.name)"
            @input="setFieldValue(field.name, ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="1, 2, 3"
          />

          <label v-else-if="field.type === 'checkbox'" class="toggle">
            <input
              :checked="getBooleanValue(field.name)"
              @change="setFieldValue(field.name, ($event.target as HTMLInputElement).checked)"
              type="checkbox"
            />
            <span>{{ field.label }}</span>
          </label>
        </label>

        <button class="primary" type="submit" :disabled="saving">
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
          {{ saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear' }}
        </button>
      </form>

      <section class="grid-stack">
        <div class="grid-stack__head">
          <div>
            <span>Listado</span>
            <h3>Registros recientes</h3>
          </div>
          <div class="search-pill">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input v-model="query" type="search" placeholder="Buscar" @change="loadRecords" />
          </div>
        </div>

        <ModuleTable
          :columns="currentModule.columns"
          :rows="rows"
          :loading="loading"
          @edit="applyRow"
          @remove="removeRow"
        />
      </section>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.module-page {
  display: grid;
  gap: 1rem;
}

.module-page--operator {
  .module-hero {
    background: linear-gradient(135deg, rgba(1, 13, 39, 0.98), rgba(200, 57, 43, 0.92));
  }
}

.module-page--editorial {
  .module-hero {
    background: linear-gradient(135deg, rgba(1, 13, 39, 0.98), rgba(1, 13, 39, 0.88));
  }

  .hero-stack article strong,
  .hero-score strong {
    color: $accent-red;
  }
}

.module-page--archive {
  .module-hero {
    background: linear-gradient(135deg, rgba(1, 13, 39, 0.98), rgba(1, 13, 39, 0.9));
  }

  .module-tags span {
    border-color: rgba(200, 57, 43, 0.3);
    background: rgba(200, 57, 43, 0.08);
  }
}

.module-page--broadcast {
  .module-hero {
    background: linear-gradient(135deg, rgba(1, 13, 39, 0.98), rgba(200, 57, 43, 0.95));
  }
}

.module-page--ledger {
  .module-hero {
    background: linear-gradient(135deg, rgba(1, 13, 39, 0.98), rgba(1, 13, 39, 0.92));
  }

  .hero-score strong {
    color: $primary-light;
  }
}

.module-hero {
  border-radius: 32px;
  padding: 1.25rem;
  color: $text-light;
  display: grid;
  gap: 1rem;
  border: 1px solid rgba(254, 254, 254, 0.1);
  box-shadow: 0 28px 80px rgba(1, 13, 39, 0.22);
}

.module-hero__copy {
  display: grid;
  gap: 0.9rem;

  h2 {
    font-size: clamp(2.2rem, 4vw, 4rem);
    line-height: 0.94;
    letter-spacing: -0.06em;
    max-width: 12ch;
  }

  p {
    max-width: 58ch;
    color: rgba(254, 254, 254, 0.74);
    font-size: 1.02rem;
  }
}

.module-hero__kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: fit-content;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(254, 254, 254, 0.14);
  background: rgba(255, 255, 255, 0.06);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;

  i {
    color: $accent-red;
  }
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  span {
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(254, 254, 254, 0.14);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(254, 254, 254, 0.88);
    font-size: 0.78rem;
  }
}

.module-hero__panel {
  display: grid;
  gap: 0.75rem;
}

.hero-score,
.hero-stack article {
  border-radius: 22px;
  padding: 1rem;
  border: 1px solid rgba(254, 254, 254, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.hero-score {
  display: grid;
  gap: 0.1rem;

  span {
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(254, 254, 254, 0.72);
  }

  strong {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1;
    letter-spacing: -0.06em;
  }
}

.hero-stack {
  display: grid;
  gap: 0.75rem;

  article {
    display: grid;
    gap: 0.15rem;

    span {
      color: rgba(254, 254, 254, 0.68);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.7rem;
    }

    strong {
      font-size: 1.05rem;
      color: $accent-red;
      letter-spacing: -0.03em;
    }
  }
}

.module-layout {
  display: grid;
  gap: 1rem;
}

.editor,
.grid-stack {
  border-radius: 28px;
  background: linear-gradient(180deg, #fefefe, #fafafa);
  border: 1px solid rgba(1, 13, 39, 0.1);
  box-shadow: 0 20px 60px rgba(1, 13, 39, 0.08);
}

.editor {
  display: grid;
  gap: 0.9rem;
  padding: 1.25rem;

  &__header {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.75rem;
    align-items: flex-start;
  }

  &__eyebrow {
    display: inline-flex;
    padding: 0.4rem 0.65rem;
    border-radius: 999px;
    background: rgba(200, 57, 43, 0.08);
    color: $accent-red;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.7rem;
  }

  h3 {
    margin-top: 0.45rem;
    font-size: 1.6rem;
    color: $primary-dark;
  }
}

.field {
  display: grid;
  gap: 0.4rem;

  span {
    font-size: 0.84rem;
    font-weight: 700;
    color: rgba(1, 13, 39, 0.82);
  }

  input,
  textarea {
    width: 100%;
    border-radius: 16px;
    border: 1px solid rgba(1, 13, 39, 0.12);
    background: rgba(1, 13, 39, 0.02);
    padding: 0.9rem 0.95rem;
    outline: none;
    color: $primary-dark;

    &:focus {
      border-color: rgba(200, 57, 43, 0.45);
      box-shadow: 0 0 0 4px rgba(200, 57, 43, 0.08);
    }
  }
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.7rem;

  input {
    width: 18px;
    height: 18px;
  }
}

.primary,
.ghost {
  border-radius: 14px;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(1, 13, 39, 0.12);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.primary {
  background: linear-gradient(135deg, $primary-dark, $accent-red);
  color: $text-light;
  font-weight: 700;
}

.ghost {
  background: rgba(1, 13, 39, 0.03);
  color: $primary-dark;
}

.grid-stack {
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
  overflow: hidden;
}

.grid-stack__head {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.75rem;
  align-items: flex-start;

  span {
    display: inline-block;
    color: $accent-red;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.72rem;
    margin-bottom: 0.3rem;
  }

  h3 {
    font-size: 1.6rem;
    color: $primary-dark;
  }
}

.search-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(1, 13, 39, 0.12);
  background: rgba(1, 13, 39, 0.03);
  width: 100%;

  i {
    color: $accent-red;
  }

  input {
    border: 0;
    background: transparent;
    outline: none;
    min-width: 0;
    width: 100%;
  }
}

@media (min-width: 900px) {
  .module-layout,
  .module-hero {
    grid-template-columns: 1fr 1fr;
  }

  .module-hero {
    grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.75fr);
  }

  .module-layout {
    grid-template-columns: minmax(320px, 430px) minmax(0, 1fr);
  }

  .editor__header,
  .grid-stack__head {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .search-pill {
    width: auto;
  }
}

@media (min-width: 1200px) {
  .grid-stack__head {
    align-items: end;
  }

  .search-pill {
    width: auto;

    input {
      min-width: 180px;
      width: auto;
    }
  }
}
</style>
