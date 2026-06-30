<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { getModuleConfig } from '@/config/modules'
import { resourceService } from '@/services/resources'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const formState = reactive<Record<string, string | number | boolean | null>>({})

const currentModule = computed(() => (uiStore.moduleKey ? getModuleConfig(uiStore.moduleKey) : undefined))

function normalizeDate(value: unknown) {
  if (!value) return ''
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function getTextValue(name: string) {
  const value = formState[name]
  return value === null || value === undefined ? '' : String(value)
}

function getBooleanValue(name: string) {
  return Boolean(formState[name])
}

function setFieldValue(name: string, value: string | number | boolean | null) {
  formState[name] = value
}

function syncForm() {
  Object.keys(formState).forEach((key) => delete formState[key])

  if (!currentModule.value) return

  currentModule.value.fields.forEach((field) => {
    const recordValue = uiStore.record?.[field.name]

    if (field.type === 'checkbox') {
      formState[field.name] = Boolean(recordValue)
      return
    }

    if (field.type === 'number') {
      formState[field.name] = recordValue === null || recordValue === undefined || recordValue === '' ? '' : Number(recordValue)
      return
    }

    if (field.type === 'date') {
      formState[field.name] = normalizeDate(recordValue)
      return
    }

    if (field.type === 'tags' && Array.isArray(recordValue)) {
      formState[field.name] = recordValue.join(', ')
      return
    }

    formState[field.name] = recordValue === null || recordValue === undefined ? '' : String(recordValue)
  })
}

watch(
  () => [uiStore.open, uiStore.moduleKey, uiStore.mode, uiStore.record],
  () => {
    if (uiStore.open) syncForm()
  },
  { immediate: true },
)

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && uiStore.open) {
    uiStore.closeEditor()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

async function submitForm() {
  if (!currentModule.value) return

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

  if (uiStore.mode === 'edit' && uiStore.record) {
    const id = String(uiStore.record._id || uiStore.record.id || '')
    if (id) {
      await resourceService.update(`${currentModule.value.apiPath}/${id}`, payload)
    }
  } else {
    await resourceService.create(currentModule.value.apiPath, payload)
  }

  uiStore.closeEditor()
  window.dispatchEvent(new CustomEvent('module:refresh', { detail: { moduleKey: currentModule.value.key } }))
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="uiStore.open && currentModule" class="editor-modal" @click.self="uiStore.closeEditor()">
        <div class="editor-modal__panel modal-surface" role="dialog" aria-modal="true" :aria-labelledby="`editor-title-${currentModule.key}`">
          <header class="editor-modal__header">
            <div>
              <span>{{ uiStore.mode === 'edit' ? 'Editar registro' : 'Nuevo registro' }}</span>
              <h2 :id="`editor-title-${currentModule.key}`">{{ currentModule.title }}</h2>
              <p>{{ currentModule.presentation.description }}</p>
            </div>

            <button type="button" class="ghost-button close-btn" aria-label="Cerrar modal" @click="uiStore.closeEditor()">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <form class="editor-modal__form" @submit.prevent="submitForm">
            <div v-for="field in currentModule.fields" :key="field.name" class="field">
              <label :for="field.name">{{ field.label }}</label>

              <input
                v-if="field.type === 'text' || field.type === 'email' || field.type === 'password' || field.type === 'number' || field.type === 'date'"
                :id="field.name"
                :value="getTextValue(field.name)"
                @input="setFieldValue(field.name, ($event.target as HTMLInputElement).value)"
                :type="field.type === 'number' ? 'number' : field.type"
                :placeholder="field.placeholder || field.label"
              />

              <textarea
                v-else-if="field.type === 'textarea'"
                :id="field.name"
                :value="getTextValue(field.name)"
                @input="setFieldValue(field.name, ($event.target as HTMLTextAreaElement).value)"
                rows="4"
                :placeholder="field.placeholder || field.label"
              />

              <input
                v-else-if="field.type === 'tags'"
                :id="field.name"
                :value="getTextValue(field.name)"
                @input="setFieldValue(field.name, ($event.target as HTMLInputElement).value)"
                type="text"
                placeholder="1, 2, 3"
              />

              <div v-else-if="field.type === 'checkbox'" class="toggle-field">
                <input
                  :id="field.name"
                  :checked="getBooleanValue(field.name)"
                  @change="setFieldValue(field.name, ($event.target as HTMLInputElement).checked)"
                  type="checkbox"
                />
                <label :for="field.name">{{ field.label }}</label>
              </div>
            </div>

            <footer class="editor-modal__actions">
              <button type="button" class="ghost-button" @click="uiStore.closeEditor()">Cancelar</button>
              <button type="submit" class="primary-button">
                <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                {{ uiStore.mode === 'edit' ? 'Guardar cambios' : 'Crear registro' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.editor-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(1, 13, 39, 0.74);
  backdrop-filter: blur(14px);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.editor-modal__panel {
  width: min(100%, 760px);
  max-height: min(92vh, 920px);
  overflow: auto;
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
}

.editor-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  span {
    display: inline-flex;
    margin-bottom: 0.3rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: $accent-red;
    font-size: 0.72rem;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 1.9rem;
    letter-spacing: -0.05em;
    color: $primary-dark;
  }

  p {
    margin-top: 0.35rem;
    color: rgba(1, 13, 39, 0.68);
    max-width: 56ch;
  }
}

.close-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 14px;
  color: $primary-dark;
  background: rgba(1, 13, 39, 0.04);
}

.editor-modal__form {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.45rem;

  > label {
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(1, 13, 39, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  input,
  textarea {
    width: 100%;
    border-radius: 18px;
    border: 1px solid rgba(1, 13, 39, 0.12);
    background: rgba(1, 13, 39, 0.02);
    padding: 0.95rem 1rem;
    color: $primary-dark;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &:focus {
      border-color: rgba(200, 57, 43, 0.45);
      box-shadow: 0 0 0 4px rgba(200, 57, 43, 0.08);
      background: #fff;
    }
  }
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(1, 13, 39, 0.02);
  border: 1px solid rgba(1, 13, 39, 0.12);

  input {
    width: 18px;
    height: 18px;
  }

  label {
    margin: 0;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: $primary-dark;
  }
}

.editor-modal__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .editor-modal__header {
    flex-direction: column;
  }

  .editor-modal__actions {
    justify-content: stretch;

    .ghost-button,
    .primary-button {
      flex: 1 1 100%;
    }
  }
}
</style>
