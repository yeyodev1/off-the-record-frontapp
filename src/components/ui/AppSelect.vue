<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

export type SelectValue = string | number | boolean

export interface SelectOption {
  value: SelectValue
  label: string
  icon?: string
  color?: string
  hint?: string
  disabled?: boolean
}

/**
 * Selector propio: el `<select>` nativo abre con el estilo del sistema
 * operativo, que rompe la interfaz (sobre todo en Windows). Este replica el
 * comportamiento nativo — teclado, escritura rápida, clic fuera — con
 * nuestros tokens.
 */
const props = withDefaults(
  defineProps<{
    modelValue: SelectValue | null | undefined
    options: SelectOption[]
    placeholder?: string
    size?: 'sm' | 'md'
    disabled?: boolean
    searchable?: boolean | 'auto'
    icon?: string
    title?: string
  }>(),
  { placeholder: 'Selecciona…', size: 'md', disabled: false, searchable: 'auto', icon: '', title: '' },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: SelectValue): void }>()

const trigger = ref<HTMLButtonElement | null>(null)
const popover = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const open = ref(false)
const activeIndex = ref(-1)
const query = ref('')
const position = ref({ top: 0, left: 0, width: 0, placement: 'below' as 'below' | 'above' })

let typeahead = ''
let typeaheadTimer: number | undefined

const selected = computed(() => props.options.find((option) => option.value === props.modelValue) || null)

const useSearch = computed(() =>
  props.searchable === 'auto' ? props.options.length > 8 : Boolean(props.searchable),
)

const visible = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter((option) => option.label.toLowerCase().includes(term))
})

/** El scroll dentro de la lista no debe recolocar ni cerrar el menú. */
function onScroll(event: Event) {
  const target = event.target as HTMLElement | null
  if (target && typeof target.closest === 'function' && target.closest('.sel__pop')) return

  const rect = trigger.value?.getBoundingClientRect()
  if (rect && (rect.bottom < 0 || rect.top > window.innerHeight)) {
    closeMenu()
    return
  }

  updatePosition()
}

function updatePosition() {
  const element = trigger.value
  if (!element) return

  const rect = element.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  const desired = Math.min(320, visible.value.length * 40 + (useSearch.value ? 52 : 0) + 16)
  const placement = spaceBelow < desired && spaceAbove > spaceBelow ? 'above' : 'below'

  position.value = {
    top: placement === 'below' ? rect.bottom + 6 : rect.top - 6,
    left: rect.left,
    width: rect.width,
    placement,
  }
}

async function openMenu() {
  if (props.disabled) return

  open.value = true
  query.value = ''
  activeIndex.value = props.options.findIndex((option) => option.value === props.modelValue)

  await nextTick()
  updatePosition()

  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', updatePosition)
  document.addEventListener('mousedown', onDocumentDown, true)

  if (useSearch.value) searchInput.value?.focus()
}

function closeMenu(refocus = false) {
  if (!open.value) return

  open.value = false
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('mousedown', onDocumentDown, true)

  if (refocus) trigger.value?.focus()
}

function onDocumentDown(event: MouseEvent) {
  const target = event.target as Node
  if (trigger.value?.contains(target) || popover.value?.contains(target)) return
  closeMenu()
}

function choose(option: SelectOption) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  closeMenu(true)
}

function move(step: number) {
  const list = visible.value
  if (!list.length) return

  let next = activeIndex.value
  for (let attempt = 0; attempt < list.length; attempt += 1) {
    next = (next + step + list.length) % list.length
    if (!list[next]?.disabled) break
  }

  activeIndex.value = next
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  nextTick(() => {
    popover.value?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  })
}

/** Escritura rápida: igual que el select nativo, salta a la opción que empieza así. */
function jumpTo(character: string) {
  window.clearTimeout(typeaheadTimer)
  typeahead += character.toLowerCase()
  typeaheadTimer = window.setTimeout(() => {
    typeahead = ''
  }, 600)

  const index = visible.value.findIndex((option) => option.label.toLowerCase().startsWith(typeahead))
  if (index >= 0) {
    activeIndex.value = index
    scrollActiveIntoView()
  }
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  if (!open.value) {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      void openMenu()
    }
    return
  }

  switch (event.key) {
    case 'Escape':
      event.preventDefault()
      closeMenu(true)
      break
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Home':
      event.preventDefault()
      activeIndex.value = 0
      scrollActiveIntoView()
      break
    case 'End':
      event.preventDefault()
      activeIndex.value = visible.value.length - 1
      scrollActiveIntoView()
      break
    case 'Enter':
    case 'Tab': {
      const option = visible.value[activeIndex.value]
      if (option) {
        event.preventDefault()
        choose(option)
      } else if (event.key === 'Tab') {
        closeMenu()
      }
      break
    }
    default:
      if (!useSearch.value && event.key.length === 1) jumpTo(event.key)
  }
}

watch(query, () => {
  activeIndex.value = visible.value.length ? 0 : -1
  updatePosition()
})

onBeforeUnmount(() => closeMenu())
</script>

<template>
  <div class="sel">
    <button
      ref="trigger"
      :class="['sel__trigger', `sel__trigger--${size}`, { 'sel__trigger--open': open, 'sel__trigger--empty': !selected }]"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :disabled="disabled"
      :title="title"
      @click="open ? closeMenu() : openMenu()"
      @keydown="onKeydown"
    >
      <span v-if="selected?.color" class="sel__swatch" :style="{ background: selected.color }" />
      <i v-else-if="selected?.icon || icon" :class="selected?.icon || icon" class="sel__icon" aria-hidden="true" />

      <span class="sel__label">{{ selected?.label || placeholder }}</span>

      <i class="sel__caret fa-solid fa-chevron-down" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="pop">
        <div
          v-if="open"
          ref="popover"
          class="sel__pop"
          :style="{
            top: `${position.top}px`,
            left: `${position.left}px`,
            minWidth: `${position.width}px`,
            transform: position.placement === 'above' ? 'translateY(-100%)' : undefined,
          }"
          role="listbox"
          @keydown="onKeydown"
        >
          <div v-if="useSearch" class="sel__search">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input ref="searchInput" v-model="query" type="text" placeholder="Buscar…" @keydown="onKeydown" />
          </div>

          <div class="sel__list">
            <button
              v-for="(option, index) in visible"
              :key="String(option.value)"
              :class="[
                'sel__option',
                {
                  'sel__option--active': index === activeIndex,
                  'sel__option--on': option.value === modelValue,
                  'sel__option--off': option.disabled,
                },
              ]"
              type="button"
              role="option"
              :aria-selected="option.value === modelValue"
              :data-active="index === activeIndex"
              :disabled="option.disabled"
              @mouseenter="activeIndex = index"
              @click="choose(option)"
            >
              <span v-if="option.color" class="sel__swatch" :style="{ background: option.color }" />
              <i v-else-if="option.icon" :class="option.icon" class="sel__icon" aria-hidden="true" />

              <span class="sel__option-text">
                <span>{{ option.label }}</span>
                <em v-if="option.hint">{{ option.hint }}</em>
              </span>

              <i v-if="option.value === modelValue" class="fa-solid fa-check sel__check" aria-hidden="true" />
            </button>

            <p v-if="!visible.length" class="sel__empty">Sin coincidencias</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.sel {
  position: relative;
  width: 100%;
}

.sel__trigger {
  @include row(var(--s-2), center);
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  color: var(--text);
  text-align: start;
  transition:
    border-color var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease),
    box-shadow var(--t-fast) var(--ease);

  &:hover:not(:disabled) {
    border-color: var(--line-strong);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--brand-line);
    box-shadow: 0 0 0 3px var(--brand-soft);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.sel__trigger--md {
  padding: 11px 14px;
  font-size: 14px;
}

.sel__trigger--sm {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: var(--r-xs);
}

.sel__trigger--open {
  border-color: var(--brand-line);
  background: var(--surface);
}

.sel__trigger--empty .sel__label {
  color: var(--text-dim);
}

.sel__label {
  flex: 1;
  min-width: 0;
  @include truncate;
}

.sel__caret {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-dim);
  transition: transform var(--t-base) var(--ease);
}

.sel__trigger--open .sel__caret {
  transform: rotate(180deg);
  color: var(--brand-strong);
}

.sel__icon {
  flex-shrink: 0;
  width: 14px;
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}

.sel__swatch {
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 1px solid var(--line-strong);
}

/* --- Menú --- */
.sel__pop {
  position: fixed;
  z-index: 950;
  max-width: min(420px, calc(100vw - 24px));
  padding: var(--s-2);
  border-radius: var(--r-md);
  background: var(--ink-750);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
}

.sel__search {
  position: relative;
  margin-bottom: var(--s-2);

  i {
    position: absolute;
    inset-inline-start: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: var(--text-dim);
  }

  input {
    width: 100%;
    padding: 8px 10px 8px 30px;
    border-radius: var(--r-xs);
    background: var(--surface-sunken);
    border: 1px solid var(--line);
    font-size: 13px;
    color: var(--text);

    &:focus {
      outline: none;
      border-color: var(--brand-line);
    }
  }
}

.sel__list {
  @include col(1px);
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
  @include scrollbar;
}

.sel__option {
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

.sel__option--active {
  background: var(--surface-hover);
  color: var(--text);
}

.sel__option--on {
  color: var(--brand-strong);
  font-weight: 600;
}

.sel__option--off {
  opacity: 0.45;
  cursor: not-allowed;
}

.sel__option-text {
  @include col(0);
  flex: 1;
  min-width: 0;

  span {
    @include truncate;
  }

  em {
    font-style: normal;
    font-size: 11px;
    color: var(--text-dim);
    @include truncate;
  }
}

.sel__check {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--brand-strong);
}

.sel__empty {
  padding: var(--s-4);
  text-align: center;
  font-size: 12px;
  color: var(--text-dim);
}
</style>
