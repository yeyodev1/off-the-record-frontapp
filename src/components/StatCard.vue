<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  detail: string
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
}>()
</script>

<template>
  <article class="stat-card" :class="[`stat-card--${tone || 'primary'}`]">
    <span>{{ title }}</span>
    <strong>{{ value }}</strong>
    <p>{{ detail }}</p>
  </article>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.stat-card {
  padding: 1.25rem;
  border-radius: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: grid;
  gap: 0.35rem;
  min-height: 140px;

  span {
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(1, 13, 39, 0.56);
  }

  strong {
    font-size: clamp(1.8rem, 3vw, 2.4rem);
    letter-spacing: -0.05em;
  }

  p {
    color: rgba(1, 13, 39, 0.62);
  }

  &--primary strong {
    color: $primary-dark;
  }

  &--secondary strong {
    color: $accent-red;
  }

  &--success strong {
    color: $accent-red;
  }

  &--warning strong {
    color: $alert-warning;
  }

  &--info strong {
    color: $alert-info;
  }

  &--error strong {
    color: $alert-error;
  }
}
</style>
