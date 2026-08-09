<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { tagsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import type { Tag } from '@/types'

/**
 * Selector de etiquetas contra el catálogo de la base.
 *
 * Se escribe para buscar, no para inventar: lo que ya existe aparece de
 * inmediato y crear una nueva es un paso explícito. Así se evita que
 * «Corrupción» y «corrupcion» convivan como etiquetas distintas.
 */
const props = withDefaults(defineProps<{ modelValue: string[]; placeholder?: string; disabled?: boolean }>(), {
  placeholder: 'Busca o crea una etiqueta…',
  disabled: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>()

const toasts = useToastStore()

const wrapper = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const popover = ref<HTMLElement | null>(null)

const catalog = ref<Tag[]>([])
const query = ref('')
const open = ref(false)
const creating = ref(false)
const activeIndex = ref(0)
const position = ref({ top: 0, left: 0, width: 0 })

/** Misma normalización que el backend, para saber si algo ya existe. */
function normalize(value: string) {
  return value
    .normalize('NFD')
    .split('')
    .filter((char) => char.charCodeAt(0) < 0x300 || char.charCodeAt(0) > 0x36f)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const selectedSlugs = computed(() => props.modelValue.map(normalize))

const suggestions = computed(() => {
  const term = normalize(query.value)
  return catalog.value
    .filter((tag) => !selectedSlugs.value.includes(tag.slug))
    .filter((tag) => !term || tag.slug.includes(term) || normalize(tag.name).includes(term))
    .slice(0, 40)
})

/** Solo ofrecemos crear si el término no coincide con ninguna existente. */
const canCreate = computed(() => {
  const term = normalize(query.value)
  if (!term) return false
  if (selectedSlugs.value.includes(term)) return false
  return !catalog.value.some((tag) => tag.slug === term)
})

const exactMatch = computed(() => {
  const term = normalize(query.value)
  return term ? catalog.value.find((tag) => tag.slug === term) || null : null
})

/** Igual que en el resto: el scroll de la lista no cierra el desplegable. */
function onScroll(event: Event) {
  const target = event.target as HTMLElement | null
  if (target && typeof target.closest === 'function' && target.closest('.tags__pop')) return

  const rect = wrapper.value?.getBoundingClientRect()
  if (rect && (rect.bottom < 0 || rect.top > window.innerHeight)) {
    closeMenu()
    return
  }

  updatePosition()
}

function updatePosition() {
  const element = wrapper.value
  if (!element) return

  const rect = element.getBoundingClientRect()
  position.value = { top: rect.bottom + 6, left: rect.left, width: rect.width }
}

async function load() {
  try {
    const { data } = await tagsApi.list()
    catalog.value = data
  } catch (error) {
    toasts.error('No pudimos cargar las etiquetas', apiErrorMessage(error))
  }
}

async function openMenu() {
  if (props.disabled) return

  open.value = true
  activeIndex.value = 0
  await nextTick()
  updatePosition()

  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', updatePosition)
  document.addEventListener('mousedown', onDocumentDown, true)
}

function closeMenu() {
  if (!open.value) return

  open.value = false
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('mousedown', onDocumentDown, true)
}

function onDocumentDown(event: MouseEvent) {
  const target = event.target as Node
  if (wrapper.value?.contains(target) || popover.value?.contains(target)) return
  closeMenu()
}

function add(name: string) {
  const slug = normalize(name)
  if (!slug || selectedSlugs.value.includes(slug)) return

  emit('update:modelValue', [...props.modelValue, name])
  query.value = ''
  activeIndex.value = 0
  input.value?.focus()
}

function remove(name: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((tag) => tag !== name),
  )
}

/** Crear pasa por el backend, que devuelve la canónica si ya existía. */
async function create() {
  const name = query.value.trim()
  if (!name || creating.value) return

  creating.value = true
  try {
    const { data, reused, message } = await tagsApi.create(name)

    if (!catalog.value.some((tag) => tag.slug === data.slug)) catalog.value = [data, ...catalog.value]
    add(data.name)

    if (reused) toasts.info('Etiqueta reutilizada', message)
    else toasts.success('Etiqueta creada', data.name)
  } catch (error) {
    toasts.error('No se pudo crear la etiqueta', apiErrorMessage(error))
  } finally {
    creating.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Backspace' && !query.value && props.modelValue.length) {
    remove(props.modelValue[props.modelValue.length - 1] as string)
    return
  }

  if (!open.value && ['ArrowDown', 'Enter'].includes(event.key)) {
    void openMenu()
    return
  }

  const total = suggestions.value.length + (canCreate.value ? 1 : 0)

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (total) activeIndex.value = (activeIndex.value + 1) % total
      break
    case 'ArrowUp':
      event.preventDefault()
      if (total) activeIndex.value = (activeIndex.value - 1 + total) % total
      break
    case 'Escape':
      event.preventDefault()
      closeMenu()
      break
    case 'Enter': {
      event.preventDefault()
      const suggestion = suggestions.value[activeIndex.value]
      if (suggestion) add(suggestion.name)
      else if (canCreate.value) void create()
      else if (exactMatch.value) add(exactMatch.value.name)
      break
    }
    default:
      break
  }
}

function colorOf(name: string) {
  const slug = normalize(name)
  return catalog.value.find((tag) => tag.slug === slug)?.color || 'var(--iris)'
}

watch(query, () => {
  activeIndex.value = 0
  if (!open.value) void openMenu()
  else updatePosition()
})

onMounted(load)
onBeforeUnmount(closeMenu)

defineExpose({ reload: load })
</script>

<template>
  <div ref="wrapper" :class="['tags', { 'tags--open': open, 'tags--disabled': disabled }]" @click="input?.focus()">
    <TransitionGroup name="pop" tag="div" class="tags__chips">
      <button
        v-for="tag in modelValue"
        :key="tag"
        class="tags__chip"
        type="button"
        :style="{ '--chip': colorOf(tag) }"
        :disabled="disabled"
        @click.stop="remove(tag)"
      >
        {{ tag }}
        <i class="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </TransitionGroup>

    <input
      ref="input"
      v-model="query"
      class="tags__input"
      type="text"
      :placeholder="modelValue.length ? 'Añadir otra…' : placeholder"
      :disabled="disabled"
      @focus="openMenu"
      @keydown="onKeydown"
    />

    <Teleport to="body">
      <Transition name="pop">
        <div
          v-if="open"
          ref="popover"
          class="tags__pop"
          :style="{ top: `${position.top}px`, left: `${position.left}px`, minWidth: `${position.width}px` }"
        >
          <div class="tags__list">
            <button
              v-for="(tag, index) in suggestions"
              :key="tag._id"
              :class="['tags__option', { 'tags__option--active': index === activeIndex }]"
              type="button"
              @mouseenter="activeIndex = index"
              @click="add(tag.name)"
            >
              <span class="tags__dot" :style="{ background: tag.color }" />
              <span class="tags__name">{{ tag.name }}</span>
              <span v-if="tag.usageCount" class="tags__count">{{ tag.usageCount }}</span>
            </button>

            <button
              v-if="canCreate"
              :class="['tags__option', 'tags__option--create', { 'tags__option--active': activeIndex === suggestions.length }]"
              type="button"
              :disabled="creating"
              @mouseenter="activeIndex = suggestions.length"
              @click="create"
            >
              <i :class="creating ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-plus'" aria-hidden="true" />
              <span>Crear «{{ query.trim() }}»</span>
            </button>

            <p v-if="!suggestions.length && !canCreate" class="tags__empty">
              {{ query ? 'Esa etiqueta ya está aplicada' : 'Aún no hay etiquetas. Escribe para crear la primera.' }}
            </p>
          </div>

          <p class="tags__hint">
            <i class="fa-solid fa-circle-info" aria-hidden="true" />
            Reutiliza las existentes: se normalizan tildes y mayúsculas para no duplicarlas.
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.tags {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
  width: 100%;
  min-height: 44px;
  padding: 7px 10px;
  border-radius: var(--r-sm);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  cursor: text;
  transition:
    border-color var(--t-fast) var(--ease),
    box-shadow var(--t-fast) var(--ease);
}

.tags--open {
  border-color: var(--brand-line);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

.tags--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tags__chips {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
}

.tags__chip {
  @include row(6px, center);
  padding: 4px 10px;
  border-radius: var(--r-pill);
  background: color-mix(in srgb, var(--chip) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--chip) 45%, transparent);
  font-size: 12px;
  color: var(--chip);
  transition: background var(--t-fast) var(--ease);

  i {
    font-size: 9px;
    opacity: 0.7;
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--chip) 30%, transparent);
  }
}

.tags__input {
  flex: 1;
  min-width: 120px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: var(--text);

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--text-dim);
  }
}

/* --- Menú --- */
.tags__pop {
  position: fixed;
  z-index: 950;
  max-width: min(440px, calc(100vw - 24px));
  padding: var(--s-2);
  border-radius: var(--r-md);
  background: var(--ink-750);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
}

.tags__list {
  @include col(1px);
  max-height: 240px;
  overflow-y: auto;
  overscroll-behavior: contain;
  @include scrollbar;
}

.tags__option {
  @include row(var(--s-2), center);
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--r-xs);
  font-size: 13px;
  color: var(--text-muted);
  text-align: start;
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);
}

.tags__option--active {
  background: var(--surface-hover);
  color: var(--text);
}

.tags__option--create {
  color: var(--brand-strong);

  i {
    font-size: 10px;
  }
}

.tags__dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
}

.tags__name {
  flex: 1;
  min-width: 0;
  @include truncate;
}

.tags__count {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.06);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
}

.tags__empty {
  padding: var(--s-4);
  text-align: center;
  font-size: 12px;
  color: var(--text-dim);
}

.tags__hint {
  @include row(var(--s-2), flex-start);
  margin-top: var(--s-2);
  padding-top: var(--s-2);
  border-top: 1px solid var(--line);
  font-size: 11px;
  color: var(--text-dim);

  i {
    margin-top: 2px;
  }
}
</style>
