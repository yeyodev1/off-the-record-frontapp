<script setup lang="ts">
export interface TabItem {
  value: string
  label: string
  icon?: string
  count?: number
}

defineProps<{ modelValue: string; items: TabItem[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div class="tabs" role="tablist">
    <button
      v-for="item in items"
      :key="item.value"
      :class="['tabs__item', { 'tabs__item--active': item.value === modelValue }]"
      type="button"
      role="tab"
      :aria-selected="item.value === modelValue"
      data-cuelume-toggle
      @click="emit('update:modelValue', item.value)"
    >
      <i v-if="item.icon" :class="item.icon" aria-hidden="true" />
      <span>{{ item.label }}</span>
      <span v-if="item.count !== undefined" class="tabs__count">{{ item.count }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.tabs {
  @include row(var(--s-1), center);
  flex-wrap: wrap;
  padding: 4px;
  border-radius: var(--r-pill);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  @include scrollbar;
}

.tabs__item {
  @include row(var(--s-2), center, center);
  padding: 8px 16px;
  border-radius: var(--r-pill);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    color: var(--text);
  }
}

.tabs__item--active {
  background: var(--brand);
  color: #fff;
  box-shadow: 0 8px 20px -12px rgba(200, 57, 43, 0.9);
}

.tabs__count {
  padding: 1px 7px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.14);
  font-family: var(--font-mono);
  font-size: 11px;
}
</style>
