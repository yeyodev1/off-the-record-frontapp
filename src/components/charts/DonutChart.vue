<script setup lang="ts">
import { computed, ref } from 'vue'

export interface DonutSlice {
  label: string
  value: number
  color?: string
}

const props = withDefaults(defineProps<{ data: DonutSlice[]; unit?: string; caption?: string }>(), {
  unit: '',
  caption: '',
})

const PALETTE = ['var(--brand)', 'var(--iris)', 'var(--gold)', 'var(--ocean)', 'var(--moss)', 'var(--danger)']
const R = 60
const C = 2 * Math.PI * R
const hovered = ref(-1)

const total = computed(() => props.data.reduce((sum, slice) => sum + slice.value, 0) || 1)

const slices = computed(() => {
  let offset = 0
  return props.data.map((slice, index) => {
    const share = slice.value / total.value
    const length = share * C
    const entry = {
      ...slice,
      color: slice.color || PALETTE[index % PALETTE.length],
      dash: `${length} ${C - length}`,
      offset: -offset,
      share,
    }
    offset += length
    return entry
  })
})

const focus = computed(() => (hovered.value > -1 ? slices.value[hovered.value] : null))
</script>

<template>
  <div class="donut">
    <div class="donut__chart">
      <svg viewBox="0 0 160 160" role="img" aria-label="Distribución">
        <circle cx="80" cy="80" :r="R" fill="none" stroke="var(--ink-700)" stroke-width="18" />
        <circle
          v-for="(slice, index) in slices"
          :key="slice.label"
          cx="80"
          cy="80"
          :r="R"
          fill="none"
          :stroke="slice.color"
          :stroke-width="hovered === index ? 24 : 18"
          :stroke-dasharray="slice.dash"
          :stroke-dashoffset="slice.offset"
          transform="rotate(-90 80 80)"
          class="donut__slice"
          :style="{ animationDelay: `${index * 90}ms` }"
          @mouseenter="hovered = index"
          @mouseleave="hovered = -1"
        />
      </svg>

      <div class="donut__center">
        <strong>{{ focus ? `${Math.round(focus.share * 100)}%` : total.toLocaleString('es-EC') }}</strong>
        <span>{{ focus ? focus.label : caption || 'Total' }}</span>
      </div>
    </div>

    <ul class="donut__legend">
      <li
        v-for="(slice, index) in slices"
        :key="slice.label"
        :class="{ 'donut__legend-item--on': hovered === index }"
        @mouseenter="hovered = index"
        @mouseleave="hovered = -1"
      >
        <span class="donut__swatch" :style="{ background: slice.color }" />
        <span class="donut__legend-label">{{ slice.label }}</span>
        <span class="donut__legend-value">{{ slice.value.toLocaleString('es-EC') }}{{ unit ? ` ${unit}` : '' }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.donut {
  @include row(var(--s-5), center);
  flex-wrap: wrap;
}

.donut__chart {
  position: relative;
  flex: 0 0 auto;
  width: 170px;
  height: 170px;

  svg {
    width: 100%;
    height: 100%;
  }
}

.donut__slice {
  cursor: pointer;
  transform-origin: center;
  transition: stroke-width var(--t-fast) var(--ease);
  opacity: 0;
  animation: donut-in 500ms var(--ease) forwards;
}

.donut__center {
  position: absolute;
  inset: 0;
  @include col(0, center);
  justify-content: center;
  pointer-events: none;

  strong {
    font-family: var(--font-display);
    font-size: 24px;
    color: var(--text-strong);
  }

  span {
    @include eyebrow;
    font-size: 10px;
    max-width: 96px;
    text-align: center;
    @include truncate;
  }
}

.donut__legend {
  @include col(var(--s-2));
  flex: 1 1 200px;
  list-style: none;
  min-width: 0;

  li {
    @include row(var(--s-2), center);
    padding: 4px 8px;
    border-radius: var(--r-xs);
    cursor: pointer;
    transition: background var(--t-fast) var(--ease);
  }
}

.donut__legend-item--on {
  background: var(--surface-hover);
}

.donut__swatch {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 2px;
}

.donut__legend-label {
  flex: 1;
  font-size: 13px;
  color: var(--text-muted);
  @include truncate;
}

.donut__legend-value {
  font-family: var(--font-mono);
  font-size: 12px;
}

@keyframes donut-in {
  to {
    opacity: 1;
  }
}
</style>
