<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ values: number[]; color?: string; height?: number }>(), {
  color: 'var(--gold)',
  height: 36,
})

const W = 120

const path = computed(() => {
  const values = props.values
  if (values.length < 2) return ''

  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * W
      const y = props.height - ((value - min) / span) * (props.height - 4) - 2
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <svg v-if="path" class="spark" :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" aria-hidden="true">
    <path :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <span v-else class="spark spark--empty" aria-hidden="true" />
</template>

<style scoped lang="scss">
.spark {
  width: 100%;
  height: v-bind('`${height}px`');
  overflow: visible;
}

.spark--empty {
  display: block;
  border-bottom: 1px dashed var(--line-strong);
}
</style>
