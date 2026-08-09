<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { LightboxImage } from '@/types'

const props = defineProps<{ images: LightboxImage[]; index: number }>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'update:index', value: number): void
}>()

const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const arrastrando = ref(false)
const descargando = ref(false)
const inicio = { x: 0, y: 0, panX: 0, panY: 0 }

const actual = computed(() => props.images[props.index] || null)
const hayVarias = computed(() => props.images.length > 1)

/** Cada imagen nueva empieza sin ampliar. */
watch(
  () => props.index,
  () => reset(),
)

function reset() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

function acercar(paso = 0.5) {
  zoom.value = Math.min(5, Number((zoom.value + paso).toFixed(2)))
}

function alejar(paso = 0.5) {
  zoom.value = Math.max(1, Number((zoom.value - paso).toFixed(2)))
  // Al volver al tamaño original se recentra: si no, queda desplazada.
  if (zoom.value === 1) pan.value = { x: 0, y: 0 }
}

/** Un clic alterna entre tamaño original y 2×, que es lo que se espera. */
function alternarZoom() {
  if (zoom.value > 1) {
    reset()
    return
  }
  zoom.value = 2
}

function alRueda(event: WheelEvent) {
  event.preventDefault()
  if (event.deltaY < 0) acercar(0.25)
  else alejar(0.25)
}

function empezarArrastre(event: PointerEvent) {
  if (zoom.value <= 1) return
  arrastrando.value = true
  inicio.x = event.clientX
  inicio.y = event.clientY
  inicio.panX = pan.value.x
  inicio.panY = pan.value.y
  ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
}

function moverArrastre(event: PointerEvent) {
  if (!arrastrando.value) return
  pan.value = {
    x: inicio.panX + (event.clientX - inicio.x),
    y: inicio.panY + (event.clientY - inicio.y),
  }
}

function soltarArrastre() {
  arrastrando.value = false
}

function ir(delta: number) {
  if (!hayVarias.value) return
  // Circular: de la última se pasa a la primera.
  const siguiente = (props.index + delta + props.images.length) % props.images.length
  emit('update:index', siguiente)
}

/**
 * Descarga real: se pide el archivo y se guarda con un nombre legible.
 * Un `<a download>` a secas no funciona con Cloudinary por ser otro origen.
 */
async function descargar() {
  if (!actual.value || descargando.value) return

  descargando.value = true
  try {
    const response = await fetch(actual.value.src)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    const extension = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const base = (actual.value.caption || 'imagen')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)

    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `${base || 'imagen'}.${extension}`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
  } catch {
    // Si el origen no deja descargar, al menos que pueda abrirla y guardarla.
    window.open(actual.value.src, '_blank', 'noopener')
  } finally {
    descargando.value = false
  }
}

function abrirAparte() {
  if (actual.value) window.open(actual.value.src, '_blank', 'noopener')
}

function alTeclado(event: KeyboardEvent) {
  const teclas: Record<string, () => void> = {
    Escape: () => emit('close'),
    ArrowRight: () => ir(1),
    ArrowLeft: () => ir(-1),
    '+': () => acercar(),
    '=': () => acercar(),
    '-': () => alejar(),
    '0': reset,
  }

  const accion = teclas[event.key]
  if (!accion) return

  event.preventDefault()
  accion()
}

window.addEventListener('keydown', alTeclado)
// El fondo no debe desplazarse mientras el visor está abierto.
const scrollPrevio = document.body.style.overflow
document.body.style.overflow = 'hidden'

onBeforeUnmount(() => {
  window.removeEventListener('keydown', alTeclado)
  document.body.style.overflow = scrollPrevio
})
</script>

<template>
  <Teleport to="body">
    <div class="lb" role="dialog" aria-modal="true" aria-label="Imagen ampliada">
      <!-- Cerrar al pulsar fuera de la imagen. -->
      <div class="lb__backdrop" @click="emit('close')" />

      <header class="lb__bar">
        <span v-if="hayVarias" class="lb__count">{{ index + 1 }} / {{ images.length }}</span>
        <span v-else class="lb__count">Imagen</span>

        <div class="lb__tools">
          <button type="button" title="Alejar (−)" :disabled="zoom <= 1" @click="alejar()">
            <i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true" />
          </button>

          <span class="lb__zoom">{{ Math.round(zoom * 100) }}%</span>

          <button type="button" title="Acercar (+)" :disabled="zoom >= 5" @click="acercar()">
            <i class="fa-solid fa-magnifying-glass-plus" aria-hidden="true" />
          </button>

          <button type="button" title="Tamaño original (0)" :disabled="zoom === 1" @click="reset">
            <i class="fa-solid fa-compress" aria-hidden="true" />
          </button>

          <span class="lb__sep" />

          <button type="button" title="Descargar" :disabled="descargando" @click="descargar">
            <i :class="descargando ? 'fa-solid fa-circle-notch lb__spin' : 'fa-solid fa-download'" aria-hidden="true" />
          </button>

          <button type="button" title="Abrir en otra pestaña" @click="abrirAparte">
            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          </button>

          <span class="lb__sep" />

          <button type="button" title="Cerrar (Esc)" @click="emit('close')">
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      </header>

      <button v-if="hayVarias" class="lb__nav lb__nav--prev" type="button" aria-label="Anterior" @click="ir(-1)">
        <i class="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>

      <figure class="lb__stage" @wheel="alRueda">
        <img
          v-if="actual"
          :src="actual.src"
          :alt="actual.caption || ''"
          :class="['lb__img', { 'lb__img--zoom': zoom > 1, 'lb__img--drag': arrastrando }]"
          :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
          draggable="false"
          @click.stop="alternarZoom"
          @pointerdown="empezarArrastre"
          @pointermove="moverArrastre"
          @pointerup="soltarArrastre"
          @pointercancel="soltarArrastre"
        />

        <figcaption v-if="actual?.caption" class="lb__caption">{{ actual.caption }}</figcaption>
      </figure>

      <button v-if="hayVarias" class="lb__nav lb__nav--next" type="button" aria-label="Siguiente" @click="ir(1)">
        <i class="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>

      <footer class="lb__hint">
        <span><kbd>Esc</kbd> cerrar</span>
        <span v-if="hayVarias"><kbd>←</kbd><kbd>→</kbd> navegar</span>
        <span><kbd>+</kbd><kbd>−</kbd> zoom</span>
        <span>clic para ampliar</span>
      </footer>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.lb {
  position: fixed;
  inset: 0;
  z-index: 200;
  @include row(0, center, center);
}

.lb__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(1, 8, 26, 0.94);
  backdrop-filter: blur(6px);
}

.lb__bar {
  position: absolute;
  top: 0;
  inset-inline: 0;
  z-index: 2;
  @include row(var(--s-3), center, space-between);
  padding: var(--s-3) var(--s-4);
  background: linear-gradient(to bottom, rgba(1, 8, 26, 0.85), transparent);
}

.lb__count {
  @include eyebrow;
  font-size: 10px;
  color: var(--text-muted);
}

.lb__tools {
  @include row(var(--s-2), center);

  button {
    @include row(0, center, center);
    width: 36px;
    height: 36px;
    border-radius: var(--r-sm);
    border: 1px solid var(--line);
    background: rgba(4, 18, 47, 0.7);
    color: var(--text-muted);
    font-size: 13px;
    transition:
      border-color var(--t-fast) var(--ease),
      color var(--t-fast) var(--ease);

    &:hover:not(:disabled) {
      border-color: var(--brand-line);
      color: var(--text);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }
}

.lb__zoom {
  min-width: 46px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.lb__sep {
  width: 1px;
  height: 20px;
  background: var(--line);
}

.lb__spin {
  animation: lb-spin 0.9s linear infinite;
}

@keyframes lb-spin {
  to {
    transform: rotate(360deg);
  }
}

.lb__stage {
  position: relative;
  z-index: 1;
  @include col(var(--s-3), center);
  max-width: 92vw;
  max-height: 82vh;
}

.lb__img {
  max-width: 92vw;
  max-height: 74vh;
  border-radius: var(--r-md);
  box-shadow: var(--shadow-lg);
  cursor: zoom-in;
  transition: transform var(--t-base) var(--ease);
  user-select: none;
  touch-action: none;
}

.lb__img--zoom {
  cursor: grab;
}

.lb__img--drag {
  cursor: grabbing;
  // Al arrastrar no debe haber suavizado: se sentiría con retardo.
  transition: none;
}

.lb__caption {
  max-width: 70ch;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.lb__nav {
  position: absolute;
  z-index: 2;
  top: 50%;
  transform: translateY(-50%);
  @include row(0, center, center);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: rgba(4, 18, 47, 0.8);
  color: var(--text-muted);

  &:hover {
    border-color: var(--brand-line);
    color: var(--text);
  }
}

.lb__nav--prev {
  inset-inline-start: var(--s-4);
}

.lb__nav--next {
  inset-inline-end: var(--s-4);
}

.lb__hint {
  position: absolute;
  bottom: var(--s-4);
  inset-inline: 0;
  z-index: 2;
  @include row(var(--s-4), center, center);
  flex-wrap: wrap;
  @include eyebrow;
  font-size: 9px;

  span {
    @include row(4px, center);
  }

  kbd {
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--line);
    font-family: var(--font-mono);
    font-size: 9px;
  }

  @include mobile {
    display: none;
  }
}
</style>
