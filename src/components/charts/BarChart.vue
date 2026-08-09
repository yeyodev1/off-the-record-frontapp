<script setup lang="ts">
import { computed, ref } from 'vue'

export interface BarDatum {
  label: string
  value: number
  color?: string
}

const props = withDefaults(defineProps<{ data: BarDatum[]; unit?: string; horizontal?: boolean }>(), {
  unit: '',
  horizontal: true,
})

const hovered = ref(-1)

const max = computed(() => Math.max(1, ...props.data.map((item) => item.value)))

function pct(value: number) {
  return `${Math.max(2, (value / max.value) * 100)}%`
}

function format(value: number) {
  return `${value.toLocaleString('es-EC')}${props.unit ? ` ${props.unit}` : ''}`
}
</script>

<template>
  <div :class="['bars', horizontal ? 'bars--h' : 'bars--v']">
    <div
      v-for="(item, index) in data"
      :key="item.label"
      :class="['bars__item', { 'bars__item--dim': hovered > -1 && hovered !== index }]"
      @mouseenter="hovered = index"
      @mouseleave="hovered = -1"
    >
      <span class="bars__label" :title="item.label">{{ item.label }}</span>

      <span class="bars__track">
        <span
          class="bars__fill"
          :style="{
            '--target': pct(item.value),
            background: item.color || 'var(--brand)',
            animationDelay: `${index * 60}ms`,
          }"
        />
      </span>

      <span class="bars__value">{{ format(item.value) }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bars {
  @include col(var(--s-3));
  width: 100%;
}

.bars__item {
  @include row(var(--s-3), center);
  transition: opacity var(--t-fast) var(--ease);

  @include mobile {
    flex-wrap: wrap;
  }
}

.bars__item--dim {
  opacity: 0.45;
}

.bars__label {
  flex: 0 0 32%;
  max-width: 32%;
  font-size: 13px;
  color: var(--text-muted);
  @include truncate;

  @include mobile {
    flex: 1 1 100%;
    max-width: 100%;
  }
}

.bars__track {
  flex: 1 1 auto;
  height: 10px;
  min-width: 60px;
  border-radius: var(--r-pill);
  background: var(--ink-700);
  overflow: hidden;
}

.bars__fill {
  display: block;
  height: 100%;
  width: 0;
  border-radius: var(--r-pill);
  animation: bar-grow 900ms var(--ease) forwards;
}

.bars__value {
  flex: 0 0 auto;
  min-width: 62px;
  text-align: end;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
}

@keyframes bar-grow {
  to {
    width: var(--target);
  }
}
</style>
