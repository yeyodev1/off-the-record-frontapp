<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'soft'
    size?: 'sm' | 'md' | 'lg'
    icon?: string
    trailingIcon?: string
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit'
    title?: string
  }>(),
  {
    variant: 'primary',
    size: 'md',
    icon: '',
    trailingIcon: '',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
    title: '',
  },
)

defineEmits<{ (e: 'click', payload: MouseEvent): void }>()
</script>

<template>
  <button
    :class="['btn', `btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'btn--loading': loading }]"
    :type="type"
    :title="title"
    :disabled="disabled || loading"
    :data-cuelume-press="variant === 'primary' ? 'pulse' : 'press'"
    :data-cuelume-release="variant === 'primary' ? 'release' : 'scan'"
    @click="$emit('click', $event)"
  >
    <i v-if="loading" class="fa-solid fa-circle-notch btn__spin" aria-hidden="true" />
    <i v-else-if="icon" :class="[icon, 'btn__icon']" aria-hidden="true" />
    <span v-if="$slots.default" class="btn__label"><slot /></span>
    <i v-if="trailingIcon && !loading" :class="[trailingIcon, 'btn__icon']" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
.btn {
  @include row(var(--s-2), center, center);
  position: relative;
  border-radius: var(--r-pill);
  border: 1px solid transparent;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  transition:
    background var(--t-fast) var(--ease),
    border-color var(--t-fast) var(--ease),
    transform var(--t-fast) var(--ease),
    box-shadow var(--t-fast) var(--ease),
    opacity var(--t-fast) var(--ease);

  &:active:not(:disabled) {
    transform: translateY(1px) scale(0.99);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.btn--sm {
  padding: 6px 14px;
  font-size: 13px;
}
.btn--md {
  padding: 10px 20px;
  font-size: 14px;
}
.btn--lg {
  padding: 13px 26px;
  font-size: 15px;
}

.btn--block {
  width: 100%;
}

.btn--primary {
  background: linear-gradient(135deg, var(--brand-strong), var(--brand));
  color: #fff;
  box-shadow: 0 10px 26px -14px rgba(200, 57, 43, 0.9);

  &:hover:not(:disabled) {
    box-shadow: 0 16px 34px -14px rgba(200, 57, 43, 1);
  }
}

.btn--soft {
  background: var(--brand-soft);
  color: var(--brand-strong);
  border-color: var(--brand-line);

  &:hover:not(:disabled) {
    background: rgba(200, 57, 43, 0.22);
  }
}

.btn--outline {
  border-color: var(--line-strong);
  color: var(--text);
  background: rgba(255, 255, 255, 0.02);

  &:hover:not(:disabled) {
    background: var(--surface-hover);
    border-color: var(--brand-line);
  }
}

.btn--ghost {
  color: var(--text-muted);

  &:hover:not(:disabled) {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.btn--danger {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: rgba(239, 77, 90, 0.4);

  &:hover:not(:disabled) {
    background: rgba(239, 77, 90, 0.24);
  }
}

.btn__icon {
  font-size: 0.95em;
}

.btn__spin {
  animation: btn-spin 0.8s linear infinite;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
