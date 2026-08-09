<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Calendario propio. El `<input type="date">` nativo se descartó por lo mismo
 * que el `<select>`: lo dibuja el sistema operativo, ignora nuestros colores y
 * en Windows rompe la interfaz. Aquí el popover va con Teleport y position
 * fixed para que nada lo recorte.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    min?: string
    max?: string
    label?: string
    /** Los filtros de archivo no deben dejar elegir mañana. */
    allowFuture?: boolean
  }>(),
  { placeholder: 'Elegir fecha', min: '', max: '', label: '', allowFuture: false },
)

const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const pop = ref<HTMLElement | null>(null)
const place = ref({ top: 0, left: 0, width: 0 })

/** `YYYY-MM-DD` sin pasar por Date: evita el corrimiento por zona horaria. */
function parse(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

function format(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const selected = computed(() => parse(props.modelValue))

// Mes que se está mirando; arranca en el seleccionado o en el actual.
const cursor = ref(
  selected.value
    ? { year: selected.value.year, month: selected.value.month }
    : { year: new Date().getFullYear(), month: new Date().getMonth() },
)

watch(
  () => props.modelValue,
  () => {
    if (selected.value) cursor.value = { year: selected.value.year, month: selected.value.month }
  },
)

const etiqueta = computed(() => {
  const value = selected.value
  if (!value) return ''
  return `${value.day} ${MESES[value.month]?.slice(0, 3)} ${value.year}`
})

/** Rejilla del mes, empezando en lunes. */
const semanas = computed(() => {
  const { year, month } = cursor.value
  const primero = new Date(year, month, 1)
  // getDay() da 0 para domingo; se corre para que la semana empiece en lunes.
  const desplazamiento = (primero.getDay() + 6) % 7
  const dias = new Date(year, month + 1, 0).getDate()

  const celdas: (number | null)[] = Array(desplazamiento).fill(null)
  for (let dia = 1; dia <= dias; dia++) celdas.push(dia)
  while (celdas.length % 7) celdas.push(null)

  const filas: (number | null)[][] = []
  for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7))
  return filas
})

const hoyISO = (() => {
  const d = new Date()
  return format(d.getFullYear(), d.getMonth(), d.getDate())
})()

/** Tope real: el que pidan, o hoy si no se permite el futuro. */
const tope = computed(() => {
  if (props.allowFuture) return props.max
  if (!props.max) return hoyISO
  return props.max < hoyISO ? props.max : hoyISO
})

function bloqueado(day: number) {
  const value = format(cursor.value.year, cursor.value.month, day)
  if (props.min && value < props.min) return true
  if (tope.value && value > tope.value) return true
  return false
}

/** No dejar avanzar a meses enteramente bloqueados. */
const puedeAvanzar = computed(() => {
  if (!tope.value) return true
  const siguiente = new Date(cursor.value.year, cursor.value.month + 1, 1)
  return format(siguiente.getFullYear(), siguiente.getMonth(), 1) <= tope.value
})

function esHoy(day: number) {
  const hoy = new Date()
  return (
    hoy.getFullYear() === cursor.value.year &&
    hoy.getMonth() === cursor.value.month &&
    hoy.getDate() === day
  )
}

function esElegido(day: number) {
  const value = selected.value
  return !!value && value.year === cursor.value.year && value.month === cursor.value.month && value.day === day
}

function elegir(day: number) {
  if (bloqueado(day)) return
  emit('update:modelValue', format(cursor.value.year, cursor.value.month, day))
  open.value = false
}

function mover(delta: number) {
  const mes = cursor.value.month + delta
  cursor.value = {
    year: cursor.value.year + Math.floor(mes / 12),
    month: ((mes % 12) + 12) % 12,
  }
}

function limpiar() {
  emit('update:modelValue', '')
  open.value = false
}

function hoy() {
  const ahora = new Date()
  emit('update:modelValue', format(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()))
  open.value = false
}

/** El popover va a `body`, así que se posiciona a mano. */
function ubicar() {
  const el = trigger.value
  if (!el) return

  const caja = el.getBoundingClientRect()
  const alto = 320
  const abajo = window.innerHeight - caja.bottom

  place.value = {
    // Si no cabe abajo, se abre hacia arriba.
    top: abajo < alto && caja.top > alto ? caja.top - alto - 6 : caja.bottom + 6,
    left: Math.min(caja.left, window.innerWidth - 296),
    width: caja.width,
  }
}

async function alternar() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    ubicar()
  }
}

function alScroll(event: Event) {
  if (!open.value) return
  // Si el scroll ocurre dentro del propio calendario no hay que cerrarlo.
  if (pop.value?.contains(event.target as Node)) return

  const caja = trigger.value?.getBoundingClientRect()
  if (!caja || caja.bottom < 0 || caja.top > window.innerHeight) open.value = false
  else ubicar()
}

function alClic(event: MouseEvent) {
  if (!open.value) return
  const destino = event.target as Node
  if (trigger.value?.contains(destino) || pop.value?.contains(destino)) return
  open.value = false
}

function alTeclado(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) open.value = false
}

watch(open, (value) => {
  const modo = value ? 'addEventListener' : 'removeEventListener'
  window[modo]('scroll', alScroll, true)
  window[modo]('resize', ubicar)
  document[modo]('mousedown', alClic as EventListener)
  document[modo]('keydown', alTeclado as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', alScroll, true)
  window.removeEventListener('resize', ubicar)
  document.removeEventListener('mousedown', alClic as EventListener)
  document.removeEventListener('keydown', alTeclado as EventListener)
})
</script>

<template>
  <div class="dp">
    <p v-if="label" class="dp__label">{{ label }}</p>

    <button
      ref="trigger"
      :class="['dp__trigger', { 'dp__trigger--open': open, 'dp__trigger--set': !!etiqueta }]"
      type="button"
      data-cuelume-press
      data-cuelume-release
      @click="alternar"
    >
      <i class="fa-regular fa-calendar" aria-hidden="true" />
      <span>{{ etiqueta || placeholder }}</span>
      <i v-if="etiqueta" class="fa-solid fa-xmark dp__x" aria-hidden="true" @click.stop="limpiar" />
      <i v-else class="fa-solid fa-chevron-down dp__caret" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition name="pop">
        <div
          v-if="open"
          ref="pop"
          class="dp__pop"
          :style="{ top: `${place.top}px`, left: `${place.left}px` }"
        >
          <header class="dp__head">
            <button type="button" aria-label="Mes anterior" @click="mover(-1)">
              <i class="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>

            <strong>{{ MESES[cursor.month] }} {{ cursor.year }}</strong>

            <button type="button" aria-label="Mes siguiente" :disabled="!puedeAvanzar" @click="mover(1)">
              <i class="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </header>

          <div class="dp__dow">
            <span v-for="(dia, index) in DIAS" :key="index">{{ dia }}</span>
          </div>

          <div class="dp__grid">
            <template v-for="(semana, si) in semanas" :key="si">
              <span v-for="(dia, di) in semana" :key="`${si}-${di}`" class="dp__cell">
                <button
                  v-if="dia"
                  :class="[
                    'dp__day',
                    { 'dp__day--on': esElegido(dia), 'dp__day--today': esHoy(dia) },
                  ]"
                  type="button"
                  :disabled="bloqueado(dia)"
                  @click="elegir(dia)"
                >
                  {{ dia }}
                </button>
              </span>
            </template>
          </div>

          <footer class="dp__foot">
            <button type="button" @click="hoy">Hoy</button>
            <button v-if="etiqueta" type="button" @click="limpiar">Limpiar</button>
          </footer>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.dp {
  @include col(4px);
  min-width: 0;
}

.dp__label {
  @include eyebrow;
  font-size: 9px;
}

.dp__trigger {
  @include row(var(--s-2), center);
  width: 100%;
  min-width: 148px;
  height: 36px;
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface-sunken);
  font-size: 13px;
  color: var(--text-dim);
  transition:
    border-color var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  > i:first-child {
    font-size: 11px;
  }

  span {
    flex: 1;
    min-width: 0;
    text-align: start;
    @include truncate(1);
  }

  &:hover {
    border-color: var(--line-strong);
    color: var(--text);
  }
}

.dp__trigger--set {
  color: var(--text);
  border-color: var(--brand-line);
}

.dp__trigger--open {
  border-color: var(--brand-line);
  background: var(--surface-raised);
}

.dp__caret {
  font-size: 9px;
  opacity: 0.6;
}

.dp__x {
  font-size: 11px;
  opacity: 0.6;

  &:hover {
    opacity: 1;
    color: var(--danger);
  }
}

/* --- Popover --- */

.dp__pop {
  position: fixed;
  z-index: 120;
  width: 284px;
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--surface-raised);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
  overscroll-behavior: contain;
}

.dp__head {
  @include row(var(--s-2), center, space-between);
  padding-bottom: var(--s-2);

  strong {
    font-family: var(--font-display);
    font-size: 14px;
    color: var(--text-strong);
    text-transform: capitalize;
  }

  button {
    @include row(0, center, center);
    width: 28px;
    height: 28px;
    border-radius: var(--r-sm);
    color: var(--text-muted);
    font-size: 11px;

    &:hover:not(:disabled) {
      background: var(--surface-sunken);
      color: var(--text);
    }

    &:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }
  }
}

.dp__dow {
  @include row(0, center);
  padding-bottom: 4px;

  span {
    flex: 1;
    @include eyebrow;
    font-size: 9px;
    text-align: center;
  }
}

.dp__grid {
  @include wrap(0);
}

.dp__cell {
  @include row(0, center, center);
  // 7 columnas sin grid: el layout del proyecto es solo flex.
  flex: 0 0 calc(100% / 7);
  height: 34px;
}

.dp__day {
  @include row(0, center, center);
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  font-size: 12px;
  color: var(--text-muted);
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover:not(:disabled) {
    background: var(--surface-sunken);
    color: var(--text);
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
}

.dp__day--today {
  border: 1px solid var(--brand-line);
  color: var(--brand-strong);
  font-weight: 600;
}

.dp__day--on {
  background: var(--brand);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.dp__foot {
  @include row(var(--s-2), center);
  padding-top: var(--s-2);
  margin-top: var(--s-2);
  border-top: 1px solid var(--line);

  button {
    @include eyebrow;
    font-size: 9px;
    padding: 5px 10px;
    border-radius: var(--r-pill);
    border: 1px solid var(--line);
    color: var(--text-muted);

    &:hover {
      border-color: var(--brand-line);
      color: var(--brand-strong);
    }
  }
}
</style>
