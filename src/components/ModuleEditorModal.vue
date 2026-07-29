<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { getModuleConfig } from '@/config/modules'
import { resourceService } from '@/services/resources'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()
const formState = reactive<Record<string, string | number | boolean | null>>({})
const saving = ref(false)
const saved = ref(false)

const currentModule = computed(() => (uiStore.moduleKey ? getModuleConfig(uiStore.moduleKey) : undefined))
const isUserEditor = computed(() => currentModule.value?.key === 'users')
const roleOptions = [
  { id: 1, label: 'Administrador', description: 'Gestiona usuarios y publicaciones.', icon: 'fa-user-shield' },
  { id: 2, label: 'Lector', description: 'Accede únicamente a noticias publicadas.', icon: 'fa-book-open' },
  { id: 3, label: 'Editor', description: 'Crea y administra sus publicaciones.', icon: 'fa-pen-nib' },
]

function normalizeDate(value: unknown) {
  if (!value) return ''
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function normalizeDateTime(value: unknown) {
  if (!value) return ''
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return ''
  const offset = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16)
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

    if (field.type === 'datetime-local') {
      formState[field.name] = normalizeDateTime(recordValue)
      return
    }

    if (field.type === 'tags' && Array.isArray(recordValue)) {
      formState[field.name] = recordValue.join(', ')
      return
    }

    formState[field.name] = recordValue === null || recordValue === undefined ? '' : String(recordValue)
  })

  if (currentModule.value.key === 'users' && uiStore.mode === 'create') {
    formState.roleId = 2
    formState.active = true
    formState.premium = false
  }
}

watch(
  () => [uiStore.open, uiStore.moduleKey, uiStore.mode, uiStore.record],
  () => {
    if (uiStore.open) {
      saved.value = false
      syncForm()
    }
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

  saved.value = false
  saving.value = true

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

    if (field.type === 'date' || field.type === 'datetime-local') {
      payload[field.name] = value ? new Date(String(value)).toISOString() : null
      return
    }

    payload[field.name] = value
  })

  const isLegacyNewsRecord = currentModule.value && ['articles', 'exclusives'].includes(currentModule.value.key) && uiStore.record?.source === 'legacy'

  try {
    if (uiStore.mode === 'edit' && uiStore.record && !isLegacyNewsRecord) {
      const id = String(uiStore.record._id || uiStore.record.id || '')
      if (id) {
        await resourceService.update(currentModule.value.updatePath(id), payload)
      }
    } else {
      await resourceService.create(currentModule.value.createPath, payload)
    }

    saved.value = true
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    uiStore.closeEditor()
    window.dispatchEvent(new CustomEvent('module:refresh', { detail: { moduleKey: currentModule.value.key } }))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="uiStore.open && currentModule" class="editor-modal" @click.self="uiStore.closeEditor()">
          <div class="editor-modal__panel" :class="{ 'editor-modal__panel--saved': saved }" role="dialog" aria-modal="true" :aria-labelledby="`editor-title-${currentModule.key}`">
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

          <form v-if="isUserEditor" class="user-onboarding" @submit.prevent="submitForm">
            <section class="onboarding-section">
              <div class="onboarding-section__title"><i class="fa-solid fa-id-card"></i><div><strong>Datos personales</strong><span>Información básica de la cuenta.</span></div></div>
              <div class="onboarding-grid">
                <label class="field"><span>Nombre</span><input :value="getTextValue('name')" @input="setFieldValue('name', ($event.target as HTMLInputElement).value)" required placeholder="Nombre" /></label>
                <label class="field"><span>Apellido</span><input :value="getTextValue('lastname')" @input="setFieldValue('lastname', ($event.target as HTMLInputElement).value)" placeholder="Apellido" /></label>
                <label class="field"><span>Documento</span><input :value="getTextValue('ci')" @input="setFieldValue('ci', ($event.target as HTMLInputElement).value)" placeholder="Opcional" /></label>
                <label class="field"><span>Teléfono</span><input :value="getTextValue('phone')" @input="setFieldValue('phone', ($event.target as HTMLInputElement).value)" placeholder="Opcional" /></label>
              </div>
            </section>

            <section class="onboarding-section">
              <div class="onboarding-section__title"><i class="fa-solid fa-key"></i><div><strong>Acceso</strong><span>Credenciales para iniciar sesión.</span></div></div>
              <div class="onboarding-grid onboarding-grid--single">
                <label class="field"><span>Correo electrónico</span><input :value="getTextValue('email')" @input="setFieldValue('email', ($event.target as HTMLInputElement).value)" type="email" required placeholder="nombre@correo.com" /></label>
                <label class="field"><span>{{ uiStore.mode === 'edit' ? 'Nueva contraseña' : 'Contraseña' }}</span><input :value="getTextValue('password')" @input="setFieldValue('password', ($event.target as HTMLInputElement).value)" type="password" :required="uiStore.mode === 'create'" :placeholder="uiStore.mode === 'edit' ? 'Dejar vacío para conservarla' : 'Mínimo 8 caracteres'" /></label>
              </div>
            </section>

            <section class="onboarding-section">
              <div class="onboarding-section__title"><i class="fa-solid fa-user-gear"></i><div><strong>Rol y permisos</strong><span>Define lo que esta persona podrá hacer.</span></div></div>
              <div class="role-picker">
                <button v-for="role in roleOptions" :key="role.id" type="button" class="role-card" :class="{ 'role-card--active': Number(formState.roleId) === role.id }" @click="setFieldValue('roleId', role.id)"><i class="fa-solid" :class="role.icon"></i><span>{{ role.label }}</span><small>{{ role.description }}</small><i class="fa-solid fa-circle-check role-card__check"></i></button>
              </div>
            </section>

            <section class="account-toggles">
              <button type="button" class="account-toggle" :class="{ 'account-toggle--active': getBooleanValue('active') }" @click="setFieldValue('active', !getBooleanValue('active'))"><i class="fa-solid fa-user-check"></i><span><strong>Cuenta activa</strong><small>Puede iniciar sesión ahora.</small></span><i class="fa-solid" :class="getBooleanValue('active') ? 'fa-toggle-on' : 'fa-toggle-off'"></i></button>
              <button type="button" class="account-toggle" :class="{ 'account-toggle--active': getBooleanValue('premium') }" @click="setFieldValue('premium', !getBooleanValue('premium'))"><i class="fa-solid fa-crown"></i><span><strong>Acceso premium</strong><small>Habilita contenido exclusivo.</small></span><i class="fa-solid" :class="getBooleanValue('premium') ? 'fa-toggle-on' : 'fa-toggle-off'"></i></button>
            </section>

            <footer class="editor-modal__actions">
              <button type="button" class="ghost-button" :disabled="saving" @click="uiStore.closeEditor()">Cancelar</button>
              <button type="submit" class="primary-button" :disabled="saving"><i class="fa-solid" :class="saving ? (saved ? 'fa-circle-check' : 'fa-spinner fa-spin') : 'fa-user-plus'"></i>{{ saved ? 'Guardado' : saving ? 'Guardando...' : uiStore.mode === 'edit' ? 'Guardar cambios' : 'Crear usuario' }}</button>
            </footer>
          </form>

          <form v-else class="editor-modal__form" @submit.prevent="submitForm">
            <div v-for="field in currentModule.fields" :key="field.name" class="field">
              <label :for="field.name">{{ field.label }}</label>

              <input
                v-if="field.type === 'text' || field.type === 'email' || field.type === 'password' || field.type === 'number' || field.type === 'date' || field.type === 'datetime-local'"
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
              <button type="button" class="ghost-button" :disabled="saving" @click="uiStore.closeEditor()">Cancelar</button>
              <button type="submit" class="primary-button" :disabled="saving">
                <i class="fa-solid" :class="saving ? (saved ? 'fa-circle-check' : 'fa-spinner fa-spin') : 'fa-floppy-disk'" aria-hidden="true"></i>
                {{ saved ? 'Guardado' : saving ? 'Guardando...' : uiStore.mode === 'edit' ? 'Guardar cambios' : 'Crear registro' }}
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
  color: $text-light;
  background:
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.2), transparent 28%),
    radial-gradient(circle at bottom left, rgba(32, 148, 210, 0.14), transparent 32%),
    linear-gradient(145deg, #162746, #0a1329);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.45);
  transition: border-color 240ms ease, box-shadow 240ms ease, transform 240ms ease;
}

.editor-modal__panel--saved {
  border-color: rgba(62, 203, 143, 0.75);
  box-shadow: 0 32px 100px rgba(16, 185, 129, 0.2);
  transform: scale(1.01);
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
    color: #ffb0a8;
    font-size: 0.72rem;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 1.9rem;
    letter-spacing: -0.05em;
    color: $text-light;
  }

  p {
    margin-top: 0.35rem;
    color: rgba(246, 241, 232, 0.72);
    max-width: 56ch;
  }
}

.close-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 14px;
  color: $text-light;
  background: rgba(255, 255, 255, 0.08);
}

.editor-modal__form {
  display: grid;
  gap: 1rem;
}

.user-onboarding {
  display: grid;
  gap: 1.2rem;
}

.onboarding-section {
  display: grid;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.045);
}

.onboarding-section__title {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  > i {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: #ffb0a8;
    background: rgba(200, 57, 43, 0.16);
  }

  div { display: grid; gap: 0.12rem; }
  strong { color: $text-light; }
  span { color: rgba(246, 241, 232, 0.62); font-size: 0.85rem; }
}

.onboarding-grid {
  display: grid;
  gap: 0.8rem;
}

.role-picker {
  display: grid;
  gap: 0.7rem;
}

.role-card {
  position: relative;
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 0.15rem 0.65rem;
  padding: 0.95rem;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  color: $text-light;
  background: rgba(255, 255, 255, 0.055);
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;

  > i:first-child {
    grid-row: span 2;
    align-self: center;
    color: #7cc8f2;
    font-size: 1.05rem;
  }

  span { font-weight: 800; }
  small { color: rgba(246, 241, 232, 0.64); line-height: 1.35; }

  &:hover { transform: translateY(-2px); border-color: rgba(124, 200, 242, 0.6); }
}

.role-card--active {
  border-color: rgba(255, 176, 168, 0.8);
  background: linear-gradient(135deg, rgba(200, 57, 43, 0.25), rgba(32, 148, 210, 0.16));
  box-shadow: 0 12px 30px rgba(200, 57, 43, 0.14);
}

.role-card__check {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  opacity: 0;
  color: #6ee7b7;
  transition: opacity 180ms ease;
}

.role-card--active .role-card__check { opacity: 1; }

.account-toggles {
  display: grid;
  gap: 0.7rem;
}

.account-toggle {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.8rem 0.9rem;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  color: rgba(246, 241, 232, 0.72);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease;

  > i:first-child { color: #7cc8f2; }
  span { display: grid; gap: 0.1rem; }
  strong { color: $text-light; }
  small { font-size: 0.78rem; }
  > i:last-child { font-size: 1.45rem; color: rgba(246, 241, 232, 0.4); }
}

.account-toggle--active {
  border-color: rgba(110, 231, 183, 0.4);
  background: rgba(16, 185, 129, 0.11);

  > i:last-child { color: #6ee7b7; }
}

.field {
  display: grid;
  gap: 0.45rem;

  > label {
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(246, 241, 232, 0.78);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  input,
  textarea {
    width: 100%;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.07);
    padding: 0.95rem 1rem;
    color: $text-light;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &:focus {
      border-color: rgba(255, 176, 168, 0.76);
      box-shadow: 0 0 0 4px rgba(200, 57, 43, 0.18);
      background: rgba(255, 255, 255, 0.12);
    }
  }
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.14);

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
    color: $text-light;
  }
}

.editor-modal__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.editor-modal__actions .ghost-button {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.16);
  color: $text-light;
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

@media (min-width: 680px) {
  .onboarding-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .onboarding-grid--single { grid-template-columns: 1fr; }
  .role-picker { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .role-card { grid-template-columns: 1fr; gap: 0.35rem; min-height: 150px; }
  .role-card > i:first-child { grid-row: auto; }
}
</style>
