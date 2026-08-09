<script setup lang="ts">
withDefaults(defineProps<{ eyebrow?: string; title: string; detail?: string; icon?: string }>(), {
  eyebrow: '',
  detail: '',
  icon: '',
})
</script>

<template>
  <header class="page-head">
    <div class="page-head__main">
      <span v-if="icon" class="page-head__icon"><i :class="icon" aria-hidden="true" /></span>
      <div class="page-head__text">
        <p v-if="eyebrow" class="page-head__eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p v-if="detail" class="page-head__detail">{{ detail }}</p>
      </div>
    </div>

    <div v-if="$slots.actions" class="page-head__actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped lang="scss">
.page-head {
  @include row(var(--s-4), flex-end, space-between);
  flex-wrap: wrap;
}

.page-head__main {
  @include row(var(--s-4), center);
  min-width: 0;
}

.page-head__icon {
  @include row(0, center, center);
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: var(--r-md);
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  color: var(--brand-strong);
  font-size: 17px;
}

.page-head__text {
  @include col(2px);
  min-width: 0;

  h1 {
    font-size: clamp(24px, 4vw, 32px);
  }
}

.page-head__eyebrow {
  @include eyebrow;
}

.page-head__detail {
  font-size: 14px;
  color: var(--text-muted);
  max-width: 68ch;
}

.page-head__actions {
  @include row(var(--s-2), center, flex-end);
  flex-wrap: wrap;
}
</style>
