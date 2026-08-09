<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    icon?: string
    required?: boolean
  }>(),
  { label: '', hint: '', error: '', icon: '', required: false },
)
</script>

<template>
  <label class="field">
    <span v-if="label" class="field__label">
      <i v-if="icon" :class="icon" aria-hidden="true" />
      {{ label }}
      <em v-if="required" aria-hidden="true">*</em>
    </span>

    <slot />

    <Transition name="fade">
      <span v-if="error" class="field__error">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
        {{ error }}
      </span>
      <span v-else-if="hint" class="field__hint">{{ hint }}</span>
    </Transition>
  </label>
</template>

<style scoped lang="scss">
.field {
  @include col(var(--s-2));
  width: 100%;
}

.field__label {
  @include row(var(--s-2), center);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);

  i {
    color: var(--text-dim);
    font-size: 11px;
  }

  em {
    color: var(--brand);
    font-style: normal;
  }
}

.field__hint {
  font-size: 12px;
  color: var(--text-dim);
}

.field__error {
  @include row(var(--s-2), center);
  font-size: 12px;
  color: var(--danger);
}

:slotted(input),
:slotted(textarea) {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 11px 14px;
  font-size: 14px;
  color: var(--text);
  transition:
    border-color var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease),
    box-shadow var(--t-fast) var(--ease);
}

:slotted(input::placeholder),
:slotted(textarea::placeholder) {
  color: var(--text-dim);
}

:slotted(input:focus),
:slotted(textarea:focus) {
  outline: none;
  border-color: var(--brand-line);
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

:slotted(textarea) {
  min-height: 96px;
  resize: vertical;
  line-height: 1.6;
}

</style>
