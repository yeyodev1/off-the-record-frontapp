<script setup lang="ts">
/**
 * Imita la forma exacta de ContentCard para que al llegar los datos nada
 * salte: mismo alto, mismo borde, misma franja de color.
 */
</script>

<template>
  <div class="rskel" aria-hidden="true">
    <span class="rskel__accent" />
    <span class="rskel__cover rskel__bar" />

    <div class="rskel__main">
      <div class="rskel__meta">
        <span class="rskel__bar" style="width: 88px; height: 16px" />
        <span class="rskel__bar" style="width: 64px" />
      </div>

      <span class="rskel__bar rskel__bar--title" />
      <span class="rskel__bar" style="width: 92%" />
      <span class="rskel__bar" style="width: 68%" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.rskel {
  position: relative;
  @include row(var(--s-4), center);
  padding: var(--s-4);
  padding-inline-start: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  overflow: hidden;
}

.rskel__accent {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 4px;
  background: var(--line-strong);
}

.rskel__cover {
  flex: 0 0 auto;
  width: 132px;
  height: 92px;
  border-radius: var(--r-md);

  @include mobile {
    width: 84px;
    height: 68px;
  }
}

.rskel__main {
  @include col(var(--s-2));
  flex: 1;
  min-width: 0;
}

.rskel__meta {
  @include row(var(--s-2), center);
}

.rskel__bar {
  display: block;
  width: 100%;
  height: 11px;
  border-radius: var(--r-pill);
  background: linear-gradient(
    90deg,
    var(--surface-sunken) 0%,
    color-mix(in srgb, var(--line-strong) 55%, transparent) 50%,
    var(--surface-sunken) 100%
  );
  background-size: 200% 100%;
  animation: rskel-shimmer 1.3s var(--ease) infinite;
}

.rskel__bar--title {
  width: 62%;
  height: 20px;
  margin-block: 2px;
}

@keyframes rskel-shimmer {
  from {
    background-position: 150% 0;
  }
  to {
    background-position: -50% 0;
  }
}

// Respeta a quien pidió menos movimiento en el sistema.
@media (prefers-reduced-motion: reduce) {
  .rskel__bar {
    animation: none;
  }
}
</style>
