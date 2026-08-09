<script setup lang="ts">
import { computed, ref } from 'vue'

export interface LinePoint {
  label: string
  value: number
}

const props = withDefaults(
  defineProps<{ data: LinePoint[]; color?: string; height?: number; unit?: string; area?: boolean }>(),
  { color: 'var(--brand)', height: 180, unit: '', area: true },
)

const W = 600
const PAD = 8
const hovered = ref(-1)

const max = computed(() => Math.max(1, ...props.data.map((point) => point.value)))
const min = computed(() => Math.min(0, ...props.data.map((point) => point.value)))

const points = computed(() => {
  const count = props.data.length
  if (!count) return []
  const span = max.value - min.value || 1

  return props.data.map((point, index) => ({
    ...point,
    x: count === 1 ? W / 2 : PAD + (index / (count - 1)) * (W - PAD * 2),
    y: props.height - PAD - ((point.value - min.value) / span) * (props.height - PAD * 2),
  }))
})

const linePath = computed(() => {
  if (!points.value.length) return ''
  return points.value
    .map((point, index) => {
      const prev = points.value[index - 1]
      if (index === 0 || !prev) return `M ${point.x} ${point.y}`
      const cx = (prev.x + point.x) / 2
      return `C ${cx} ${prev.y} ${cx} ${point.y} ${point.x} ${point.y}`
    })
    .join(' ')
})

const areaPath = computed(() => {
  if (!points.value.length) return ''
  const last = points.value[points.value.length - 1]
  const first = points.value[0]
  if (!last || !first) return ''
  return `${linePath.value} L ${last.x} ${props.height} L ${first.x} ${props.height} Z`
})

const gradientId = `line-grad-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <div class="line">
    <svg
      class="line__svg"
      :viewBox="`0 0 ${W} ${height}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="`Serie de ${data.length} puntos`"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.38" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <path v-if="area && areaPath" :d="areaPath" :fill="`url(#${gradientId})`" class="line__area" />
      <path v-if="linePath" :d="linePath" fill="none" :stroke="color" stroke-width="2.5" class="line__path" />

      <circle
        v-for="(point, index) in points"
        :key="point.label"
        :cx="point.x"
        :cy="point.y"
        :r="hovered === index ? 6 : 3.5"
        :fill="color"
        class="line__dot"
        @mouseenter="hovered = index"
        @mouseleave="hovered = -1"
      />
    </svg>

    <div class="line__axis">
      <span v-for="(point, index) in points" :key="point.label" :class="{ 'line__tick--on': hovered === index }">
        {{ point.label.slice(5) }}
      </span>
    </div>

    <Transition name="fade">
      <p v-if="hovered > -1" class="line__tip">
        <strong>{{ points[hovered]?.value.toLocaleString('es-EC') }}{{ unit ? ` ${unit}` : '' }}</strong>
        <span>{{ points[hovered]?.label }}</span>
      </p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.line {
  @include col(var(--s-2));
  position: relative;
  width: 100%;
}

.line__svg {
  width: 100%;
  height: v-bind('`${height}px`');
  overflow: visible;
}

.line__path {
  stroke-linecap: round;
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: line-draw 1.2s var(--ease) forwards;
}

.line__area {
  opacity: 0;
  animation: line-fade 700ms var(--ease) 400ms forwards;
}

.line__dot {
  cursor: pointer;
  transition: r var(--t-fast) var(--ease);
}

.line__axis {
  @include row(var(--s-1), center, space-between);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
  overflow: hidden;

  span {
    transition: color var(--t-fast) var(--ease);
  }
}

.line__tick--on {
  color: var(--text);
}

.line__tip {
  @include row(var(--s-2), baseline);
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  padding: 4px 10px;
  border-radius: var(--r-sm);
  background: var(--ink-850);
  border: 1px solid var(--line-strong);
  font-size: 12px;

  span {
    color: var(--text-dim);
  }
}

@keyframes line-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes line-fade {
  to {
    opacity: 1;
  }
}
</style>
