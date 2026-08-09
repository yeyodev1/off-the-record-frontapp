<script setup lang="ts">
withDefaults(defineProps<{ title?: string; detail?: string; icon?: string; tone?: string; padded?: boolean }>(), {
  title: '',
  detail: '',
  icon: '',
  tone: 'var(--brand)',
  padded: true,
})
</script>

<template>
  <section class="panel" :style="{ '--panel-accent': tone }">
    <header v-if="title || $slots.actions" class="panel__head">
      <div class="panel__title">
        <span v-if="icon" class="panel__icon"><i :class="icon" aria-hidden="true" /></span>
        <div>
          <h2>{{ title }}</h2>
          <p v-if="detail">{{ detail }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="panel__actions"><slot name="actions" /></div>
    </header>

    <div :class="['panel__body', { 'panel__body--padded': padded }]"><slot /></div>
  </section>
</template>

<style scoped lang="scss">
.panel {
  @include col(0);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  min-width: 0;
}

.panel__head {
  @include row(var(--s-3), center, space-between);
  flex-wrap: wrap;
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--line);
}

.panel__title {
  @include row(var(--s-3), center);
  min-width: 0;

  h2 {
    font-size: 16px;
    font-family: var(--font-ui);
    letter-spacing: 0;
  }

  p {
    font-size: 12px;
    color: var(--text-dim);
  }
}

.panel__icon {
  @include row(0, center, center);
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  color: var(--panel-accent);
  background: color-mix(in srgb, var(--panel-accent) 16%, transparent);
  font-size: 13px;
}

.panel__actions {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
}

.panel__body--padded {
  padding: var(--s-5);
}
</style>
