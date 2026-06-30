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
  <div v-if="currentModule" class="module-page">
    <section class="module-page__summary">
      <div>
        <span class="eyebrow">{{ currentModule.title }}</span>
        <h2>{{ currentModule.description }}</h2>
      </div>
      <div class="module-page__meta">
        <strong>{{ total }}</strong>
        <span>registros</span>
      </div>
    </section>

    <section class="module-page__layout">
      <form class="editor" @submit.prevent="submitForm">
        <div class="editor__header">
          <h3>{{ editingId ? 'Editar registro' : 'Crear registro' }}</h3>
          <button type="button" class="ghost" @click="resetForm">Limpiar</button>
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
            rows="4"
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
          {{ saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear' }}
        </button>
      </form>

      <ModuleTable
        :columns="currentModule.columns"
        :rows="rows"
        :loading="loading"
        @edit="applyRow"
        @remove="removeRow"
      />
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.module-page {
  display: grid;
  gap: 1rem;
}

.module-page__summary {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.35rem;
  border-radius: 28px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);

  h2 {
    margin-top: 0.4rem;
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    letter-spacing: -0.04em;
    max-width: 60ch;
  }
}

.eyebrow {
  display: inline-flex;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(1, 13, 39, 0.08);
  background: rgba(1, 13, 39, 0.03);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
}

.module-page__meta {
  min-width: 120px;
  padding: 1rem;
  border-radius: 22px;
  background: linear-gradient(140deg, rgba(1, 13, 39, 0.96), rgba(8, 8, 8, 0.96));
  color: $text-light;
  text-align: center;

  strong {
    display: block;
    font-size: 2rem;
    letter-spacing: -0.05em;
  }

  span {
    font-size: 0.84rem;
    color: rgba(254, 254, 254, 0.72);
  }
}

.module-page__layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 1rem;
}

.editor {
  display: grid;
  gap: 0.9rem;
  padding: 1.25rem;
  border-radius: 28px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
}

.field {
  display: grid;
  gap: 0.4rem;

  span {
    font-size: 0.86rem;
    font-weight: 600;
    color: rgba(1, 13, 39, 0.72);
  }

  input,
  textarea {
    width: 100%;
    border-radius: 16px;
    border: 1px solid rgba(1, 13, 39, 0.12);
    background: rgba(1, 13, 39, 0.02);
    padding: 0.85rem 0.95rem;
    outline: none;
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
  border: 1px solid rgba(1, 13, 39, 0.1);
  cursor: pointer;
}

.primary {
  background: linear-gradient(135deg, $accent-red, $accent-red-dark);
  color: $text-light;
  font-weight: 700;
}

.ghost {
  background: rgba(1, 13, 39, 0.03);
}

@media (max-width: 1100px) {
  .module-page__layout {
    grid-template-columns: 1fr;
  }
}
</style>
