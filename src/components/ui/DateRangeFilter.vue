<script setup lang="ts">
import { computed, ref } from 'vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import type { DateRange } from '@/types'

const props = defineProps<{ modelValue: DateRange; label?: string }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: DateRange): void }>()

const custom = ref(false)

/** Fecha local en `YYYY-MM-DD`; `toISOString` la correría por la zona horaria. */
function iso(date: Date) {
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mes}-${dia}`
}

const HOY = iso(new Date())

const PRESETS = computed(() => {
  const hoy = new Date()

  const hace = (dias: number) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - dias)
    return iso(d)
  }

  // Tres opciones a propósito. Con miles de piezas en el archivo, una lista
  // larga de atajos invita a pulsar el más caro sin querer.
  return [
    { key: 'semana', label: 'Esta semana', from: hace(7), to: HOY },
    { key: 'mes', label: 'Este mes', from: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), to: HOY },
    { key: 'todo', label: 'Todo', from: '', to: '' },
  ]
})

const activo = computed(() => {
  const match = PRESETS.value.find(
    (preset) => preset.from === props.modelValue.from && preset.to === props.modelValue.to,
  )
  return match?.key || (props.modelValue.from || props.modelValue.to ? 'personalizado' : 'todo')
})

const abierto = computed(() => custom.value || activo.value === 'personalizado')

function pick(preset: { from: string; to: string }) {
  custom.value = false
  emit('update:modelValue', { from: preset.from, to: preset.to })
}

/**
 * Al abrir el rango a mano sin nada puesto se propone lo más habitual —del
 * primero de mes hasta hoy— en vez de dos campos vacíos que no filtran nada.
 */
function toggleCustom() {
  if (abierto.value) {
    custom.value = false
    return
  }

  custom.value = true
  if (!props.modelValue.from && !props.modelValue.to) {
    const hoy = new Date()
    emit('update:modelValue', { from: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), to: HOY })
  }
}

function setField(field: 'from' | 'to', value: string) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const hayRango = computed(() => Boolean(props.modelValue.from || props.modelValue.to))

/* --- Transición de alto: se despliega en vez de aparecer de golpe --- */

function alEntrar(el: Element) {
  const node = el as HTMLElement
  node.style.height = '0'
  node.style.opacity = '0'
  // Forzar el cálculo antes de animar, si no el navegador agrupa los cambios.
  void node.offsetHeight
  node.style.height = `${node.scrollHeight}px`
  node.style.opacity = '1'
}

function alEntrarFin(el: Element) {
  // `auto` para que el popover del calendario no quede recortado.
  ;(el as HTMLElement).style.height = 'auto'
}

function alSalir(el: Element) {
  const node = el as HTMLElement
  node.style.height = `${node.scrollHeight}px`
  void node.offsetHeight
  node.style.height = '0'
  node.style.opacity = '0'
}
</script>

<template>
  <div class="drange">
    <p v-if="label" class="drange__label">{{ label }}</p>

    <div class="drange__chips">
      <button
        v-for="preset in PRESETS"
        :key="preset.key"
        :class="['drange__chip', { 'drange__chip--on': activo === preset.key && !custom }]"
        type="button"
        :title="preset.key === 'todo' ? 'Todo el archivo: tarda más' : ''"
        data-cuelume-toggle
        @click="pick(preset)"
      >
        {{ preset.label }}
      </button>

      <button
        :class="['drange__chip', { 'drange__chip--on': abierto }]"
        type="button"
        data-cuelume-toggle
        @click="toggleCustom"
      >
        <i class="fa-regular fa-calendar" aria-hidden="true" />
        Rango
        <i :class="['drange__caret', 'fa-solid', abierto ? 'fa-chevron-up' : 'fa-chevron-down']" aria-hidden="true" />
      </button>
    </div>

    <Transition name="expand" @enter="alEntrar" @after-enter="alEntrarFin" @leave="alSalir">
      <div v-if="abierto" class="drange__wrap">
        <div class="drange__custom">
          <AppDatePicker
            label="Desde"
            placeholder="Sin límite"
            :model-value="modelValue.from"
            :max="modelValue.to"
            @update:model-value="setField('from', $event)"
          />

          <i class="drange__arrow fa-solid fa-arrow-right-long" aria-hidden="true" />

          <AppDatePicker
            label="Hasta"
            placeholder="Hoy"
            :model-value="modelValue.to"
            :min="modelValue.from"
            @update:model-value="setField('to', $event)"
          />

          <button
            v-if="hayRango"
            class="drange__clear"
            type="button"
            title="Quitar el rango"
            @click="pick({ from: '', to: '' })"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.drange {
  @include col(var(--s-2));
}

.drange__label {
  @include eyebrow;
}

.drange__chips {
  @include wrap(var(--s-2));
}

.drange__chip {
  @include row(var(--s-2), center);
  padding: 6px 13px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--text-muted);
  transition:
    border-color var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease);

  i {
    font-size: 10px;
  }

  &:hover {
    border-color: var(--line-strong);
    color: var(--text);
  }
}

.drange__chip--on {
  border-color: var(--brand-line);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.drange__caret {
  font-size: 8px;
  opacity: 0.7;
}

/* El envoltorio es lo que se anima; el contenido no cambia de alto. */
.drange__wrap {
  overflow: hidden;
}

.drange__custom {
  @include row(var(--s-3), flex-end);
  flex-wrap: wrap;
  // Se ajusta a su contenido: estirado a todo el ancho dejaba un hueco enorme
  // entre las dos fechas y empujaba la × a su propia línea.
  width: fit-content;
  max-width: 100%;
  margin-top: var(--s-2);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);

  > .dp {
    flex: 0 0 auto;
  }
}

.drange__arrow {
  flex: 0 0 auto;
  height: 36px;
  @include row(0, center, center);
  font-size: 11px;
  color: var(--text-dim);

  @include mobile {
    display: none;
  }
}

.drange__clear {
  @include row(0, center, center);
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  color: var(--text-dim);
  font-size: 12px;

  &:hover {
    border-color: color-mix(in srgb, var(--danger) 50%, transparent);
    color: var(--danger);
  }
}

.expand-enter-active,
.expand-leave-active {
  transition:
    height var(--t-base) var(--ease),
    opacity var(--t-base) var(--ease);
}

@media (prefers-reduced-motion: reduce) {
  .expand-enter-active,
  .expand-leave-active {
    transition: none;
  }
}
</style>
