<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; title: string; detail?: string }>(), {
  icon: 'fa-regular fa-folder-open',
  detail: '',
})
</script>

<template>
  <div class="empty">
    <span class="empty__icon"><i :class="icon" aria-hidden="true" /></span>
    <h3>{{ title }}</h3>
    <p v-if="detail">{{ detail }}</p>
    <div v-if="$slots.default" class="empty__actions"><slot /></div>
  </div>
</template>

<style scoped lang="scss">
.empty {
  @include col(var(--s-3), center);
  justify-content: center;
  padding: var(--s-9) var(--s-5);
  text-align: center;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: rgba(255, 255, 255, 0.015);

  h3 {
    font-size: 17px;
  }

  p {
    max-width: 44ch;
    font-size: 14px;
    color: var(--text-muted);
  }
}

.empty__icon {
  @include row(0, center, center);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-hover);
  color: var(--text-dim);
  font-size: 20px;
}

.empty__actions {
  @include row(var(--s-3), center, center);
  flex-wrap: wrap;
  margin-top: var(--s-2);
}
</style>
