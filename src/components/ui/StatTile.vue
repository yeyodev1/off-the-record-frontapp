<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: number | string
    icon?: string
    color?: string
    hint?: string
    delta?: number | null
    animate?: boolean
  }>(),
  { icon: 'fa-solid fa-chart-simple', color: 'var(--brand)', hint: '', delta: null, animate: true },
)

const shown = ref(0)
const isNumeric = computed(() => typeof props.value === 'number')

function run(target: number) {
  if (!props.animate) {
    shown.value = target
    return
  }

  const start = performance.now()
  const from = shown.value
  const duration = 700

  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    shown.value = Math.round(from + (target - from) * eased)
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

onMounted(() => {
  if (isNumeric.value) run(Number(props.value))
})

watch(
  () => props.value,
  (next) => {
    if (isNumeric.value) run(Number(next))
  },
)

const display = computed(() => (isNumeric.value ? shown.value.toLocaleString('es-EC') : String(props.value)))
</script>

<template>
  <article class="tile" :style="{ '--tile-accent': color }">
    <span class="tile__glow" />

    <header class="tile__head">
      <span class="tile__icon"><i :class="icon" aria-hidden="true" /></span>
      <span
        v-if="delta !== null && delta !== undefined"
        :class="['tile__delta', delta >= 0 ? 'tile__delta--up' : 'tile__delta--down']"
      >
        <i :class="delta >= 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'" aria-hidden="true" />
        {{ Math.abs(delta).toFixed(1) }}%
      </span>
    </header>

    <p class="tile__value">{{ display }}</p>
    <p class="tile__label">{{ label }}</p>
    <p v-if="hint" class="tile__hint">{{ hint }}</p>
  </article>
</template>

<style scoped lang="scss">
.tile {
  position: relative;
  @include col(var(--s-2));
  flex: 1 1 190px;
  min-width: 170px;
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  overflow: hidden;
  transition:
    transform var(--t-base) var(--ease),
    border-color var(--t-base) var(--ease);

  &:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--tile-accent) 45%, transparent);
  }
}

.tile__glow {
  position: absolute;
  inset-block-start: -60%;
  inset-inline-end: -30%;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: var(--tile-accent);
  opacity: 0.14;
  filter: blur(38px);
  pointer-events: none;
}

.tile__head {
  @include row(var(--s-2), center, space-between);
}

.tile__icon {
  @include row(0, center, center);
  width: 34px;
  height: 34px;
  border-radius: var(--r-sm);
  color: var(--tile-accent);
  background: color-mix(in srgb, var(--tile-accent) 16%, transparent);
  font-size: 14px;
}

.tile__delta {
  @include row(4px, center);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
}

.tile__delta--up {
  color: var(--moss);
}
.tile__delta--down {
  color: var(--danger);
}

.tile__value {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--text-strong);
}

.tile__label {
  font-size: 13px;
  color: var(--text-muted);
}

.tile__hint {
  @include eyebrow;
  font-size: 10px;
}
</style>
