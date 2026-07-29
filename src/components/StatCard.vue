<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  detail: string
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
}>()
</script>

<template>
  <article class="stat-card surface-card" :class="[`stat-card--${tone || 'primary'}`]">
    <span>{{ title }}</span>
    <strong>{{ value }}</strong>
    <p>{{ detail }}</p>
  </article>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.stat-card {
  padding: 1.2rem;
  display: grid;
  gap: 0.4rem;
  min-height: 160px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.18), transparent 34%),
    linear-gradient(145deg, #121f3c, #0b1429);
  border-color: rgba(255, 255, 255, 0.12);

  &::after {
    content: '';
    position: absolute;
    inset: auto -24px -24px auto;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(32, 148, 210, 0.16), transparent 70%);
    pointer-events: none;
  }

  span {
    position: relative;
    z-index: 1;
    font-size: 0.74rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(246, 241, 232, 0.62);
  }

  strong {
    position: relative;
    z-index: 1;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.06em;
    color: $text-light;
  }

  p {
    position: relative;
    z-index: 1;
    color: rgba(246, 241, 232, 0.72);
  }

  &--primary {
    border-color: rgba(32, 148, 210, 0.18);
  }

  &--secondary {
    border-color: rgba(201, 168, 76, 0.2);

    strong {
      color: $accent-red;
    }
  }

  &--success {
    border-color: rgba(16, 185, 129, 0.18);
  }

  &--warning {
    border-color: rgba(245, 158, 11, 0.18);

    strong {
      color: $alert-warning;
    }
  }

  &--info {
    border-color: rgba(59, 130, 246, 0.18);

    strong {
      color: $alert-info;
    }
  }

  &--error {
    border-color: rgba(239, 68, 68, 0.18);

    strong {
      color: $alert-error;
    }
  }
}
</style>
