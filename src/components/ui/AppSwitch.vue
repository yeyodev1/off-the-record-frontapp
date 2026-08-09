<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string; hint?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>

<template>
  <label
    :class="['switch', { 'switch--on': modelValue, 'switch--disabled': disabled }]"
    data-cuelume-toggle
  >
    <input
      class="switch__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="switch__track"><span class="switch__thumb" /></span>
    <span v-if="label || hint" class="switch__text">
      <span v-if="label" class="switch__label">{{ label }}</span>
      <span v-if="hint" class="switch__hint">{{ hint }}</span>
    </span>
  </label>
</template>

<style scoped lang="scss">
.switch {
  @include row(var(--s-3), center);
  cursor: pointer;
  user-select: none;
}

.switch--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.switch__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch__track {
  position: relative;
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: var(--r-pill);
  background: var(--ink-600);
  border: 1px solid var(--line-strong);
  transition:
    background var(--t-base) var(--ease),
    border-color var(--t-base) var(--ease);
}

.switch__thumb {
  position: absolute;
  top: 2px;
  inset-inline-start: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-muted);
  transition:
    transform var(--t-base) var(--ease),
    background var(--t-base) var(--ease);
}

.switch--on .switch__track {
  background: var(--brand);
  border-color: var(--brand-strong);
}

.switch--on .switch__thumb {
  background: #fff;
  transform: translateX(18px);
}

.switch__text {
  @include col(1px);
}

.switch__label {
  font-size: 14px;
  font-weight: 500;
}

.switch__hint {
  font-size: 12px;
  color: var(--text-dim);
}
</style>
