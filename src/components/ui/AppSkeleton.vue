<script setup lang="ts">
withDefaults(defineProps<{ rows?: number; height?: string }>(), { rows: 3, height: '58px' })
</script>

<template>
  <div class="skeleton">
    <span v-for="row in rows" :key="row" class="skeleton__row" :style="{ height, animationDelay: `${row * 70}ms` }" />
  </div>
</template>

<style scoped lang="scss">
.skeleton {
  @include col(var(--s-3));
}

.skeleton__row {
  display: block;
  width: 100%;
  border-radius: var(--r-md);
  background: linear-gradient(90deg, var(--ink-750) 25%, var(--ink-700) 37%, var(--ink-750) 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 50%;
  }
  to {
    background-position: 0 50%;
  }
}
</style>
