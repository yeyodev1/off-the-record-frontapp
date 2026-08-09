<script setup lang="ts" generic="T extends Record<string, unknown>">
export interface TableColumn {
  key: string
  label: string
  flex?: number
  min?: string
  align?: 'left' | 'center' | 'right'
  hideOnMobile?: boolean
}

defineProps<{
  columns: TableColumn[]
  rows: T[]
  rowKey: (row: T) => string
  clickable?: boolean
}>()

defineEmits<{ (e: 'row-click', row: T): void }>()
</script>

<template>
  <div class="table">
    <header class="table__head">
      <span
        v-for="column in columns"
        :key="column.key"
        :class="['table__cell', 'table__cell--head', { 'table__cell--mobile-hidden': column.hideOnMobile }]"
        :style="{ flex: column.flex ?? 1, minWidth: column.min ?? '0', textAlign: column.align ?? 'left' }"
      >
        {{ column.label }}
      </span>
    </header>

    <TransitionGroup name="list" tag="div" class="table__body">
      <div
        v-for="row in rows"
        :key="rowKey(row)"
        :class="['table__row', { 'table__row--clickable': clickable }]"
        @click="clickable && $emit('row-click', row)"
      >
        <span
          v-for="column in columns"
          :key="column.key"
          :class="['table__cell', { 'table__cell--mobile-hidden': column.hideOnMobile }]"
          :style="{ flex: column.flex ?? 1, minWidth: column.min ?? '0', textAlign: column.align ?? 'left' }"
          :data-label="column.label"
        >
          <slot :name="`cell-${column.key}`" :row="row">{{ row[column.key] }}</slot>
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped lang="scss">
.table {
  @include col(0);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  overflow: hidden;
}

.table__head {
  @include row(var(--s-4), center);
  padding: var(--s-3) var(--s-5);
  background: var(--surface-sunken);
  border-bottom: 1px solid var(--line);

  @include mobile {
    display: none;
  }
}

.table__body {
  @include col(0);
  position: relative;
}

.table__row {
  @include row(var(--s-4), center);
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--line);
  transition: background var(--t-fast) var(--ease);

  &:last-child {
    border-bottom: none;
  }

  @include mobile {
    flex-direction: column;
    align-items: stretch;
    gap: var(--s-2);
  }
}

.table__row--clickable {
  cursor: pointer;

  &:hover {
    background: var(--surface-hover);
  }
}

.table__cell {
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;

  @include mobile {
    @include row(var(--s-3), center, space-between);
    flex: 1 1 auto !important;
    text-align: start !important;

    &::before {
      content: attr(data-label);
      @include eyebrow;
      flex-shrink: 0;
    }
  }
}

.table__cell--head {
  @include eyebrow;
  font-size: 10px;
}

.table__cell--mobile-hidden {
  @include mobile {
    display: none;
  }
}
</style>
