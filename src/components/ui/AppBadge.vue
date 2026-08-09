<script setup lang="ts">
withDefaults(
  defineProps<{ tone?: 'neutral' | 'brand' | 'gold' | 'iris' | 'ocean' | 'moss' | 'danger'; icon?: string; color?: string; dot?: boolean }>(),
  { tone: 'neutral', icon: '', color: '', dot: false },
)
</script>

<template>
  <span
    :class="['badge', `badge--${tone}`, { 'badge--custom': !!color }]"
    :style="color ? { color, background: `${color}22`, borderColor: `${color}55` } : undefined"
  >
    <span v-if="dot" class="badge__dot" />
    <i v-else-if="icon" :class="icon" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped lang="scss">
.badge {
  @include row(6px, center, center);
  padding: 4px 10px;
  border-radius: var(--r-pill);
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.5;
}

.badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.badge--neutral {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--line);
  color: var(--text-muted);
}
.badge--brand {
  background: var(--brand-soft);
  border-color: var(--brand-line);
  color: var(--brand-strong);
}
.badge--gold {
  background: var(--gold-soft);
  border-color: rgba(242, 193, 78, 0.4);
  color: var(--gold);
}
.badge--iris {
  background: var(--iris-soft);
  border-color: rgba(123, 108, 246, 0.4);
  color: #a99bff;
}
.badge--ocean {
  background: var(--ocean-soft);
  border-color: rgba(46, 134, 171, 0.4);
  color: #5fb6d8;
}
.badge--moss {
  background: var(--moss-soft);
  border-color: rgba(87, 167, 115, 0.4);
  color: #7fce9c;
}
.badge--danger {
  background: var(--danger-soft);
  border-color: rgba(239, 77, 90, 0.4);
  color: var(--danger);
}
</style>
