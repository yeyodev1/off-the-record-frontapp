<script setup lang="ts">
import type { ModuleColumn } from '@/config/modules'

const props = defineProps<{
  columns: ModuleColumn[]
  rows: Record<string, unknown>[]
  loading?: boolean
}>()

defineEmits<{
  edit: [row: Record<string, unknown>]
  remove: [row: Record<string, unknown>]
}>()

function formatValue(value: unknown, type?: ModuleColumn['type']) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (type === 'boolean') {
    return value ? 'Si' : 'No'
  }

  if (type === 'date') {
    return new Date(String(value)).toLocaleString('es-ES')
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return String(value)
}

function getPrimaryValue(row: Record<string, unknown>) {
  const column = props.columns[0]
  if (!column) return String(row._id || row.id || 'Registro')
  return formatValue(row[column.key], column.type)
}
</script>

<template>
  <div class="table-shell">
    <div class="mobile-list">
      <div v-if="loading" class="empty-state">Cargando...</div>
      <div v-else-if="!rows.length" class="empty-state">Sin resultados</div>

      <article v-for="row in rows" v-else :key="String(row._id || row.id)" class="row-card">
        <header class="row-card__header">
          <div>
            <span class="row-card__eyebrow">{{ props.columns[0]?.label || 'Registro' }}</span>
            <strong>{{ getPrimaryValue(row) }}</strong>
          </div>

          <div class="actions actions--stacked">
            <button type="button" @click="$emit('edit', row)"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>Editar</button>
            <button type="button" class="danger" @click="$emit('remove', row)"><i class="fa-solid fa-trash" aria-hidden="true"></i>Eliminar</button>
          </div>
        </header>

        <div class="row-card__grid">
          <div v-for="column in props.columns.slice(1)" :key="column.key">
            <span>{{ column.label }}</span>
            <strong>{{ formatValue(row[column.key], column.type) }}</strong>
          </div>
        </div>
      </article>
    </div>

    <table class="desktop-table">
      <thead>
        <tr>
          <th v-for="column in props.columns" :key="column.key">{{ column.label }}</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="props.columns.length + 1">Cargando...</td>
        </tr>
        <tr v-else-if="!rows.length">
          <td :colspan="props.columns.length + 1">Sin resultados</td>
        </tr>
        <tr v-for="row in rows" v-else :key="String(row._id || row.id)">
          <td v-for="column in props.columns" :key="column.key">
            {{ formatValue(row[column.key], column.type) }}
          </td>
          <td class="actions">
            <button type="button" @click="$emit('edit', row)"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>Editar</button>
            <button type="button" class="danger" @click="$emit('remove', row)"><i class="fa-solid fa-trash" aria-hidden="true"></i>Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.table-shell {
  display: grid;
  gap: 1rem;
}

.mobile-list {
  display: grid;
  gap: 0.85rem;
}

.row-card,
.desktop-table {
  border-radius: 24px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.row-card {
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.row-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  strong {
    display: block;
    font-size: 1.1rem;
    color: $primary-dark;
    letter-spacing: -0.03em;
    margin-top: 0.3rem;
  }
}

.row-card__eyebrow {
  display: inline-block;
  color: $accent-red;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.68rem;
}

.row-card__grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));

  div {
    display: grid;
    gap: 0.2rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(1, 13, 39, 0.08);
  }

  span {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(1, 13, 39, 0.56);
  }

  strong {
    font-size: 0.94rem;
    color: $primary-dark;
    word-break: break-word;
  }
}

.desktop-table {
  display: none;
  overflow: auto;
}

th,
td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(1, 13, 39, 0.08);
}

th {
  position: sticky;
  top: 0;
  background: rgba(1, 13, 39, 0.04);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  button {
    border: 1px solid rgba(1, 13, 39, 0.1);
    background: rgba(1, 13, 39, 0.03);
    padding: 0.55rem 0.85rem;
    border-radius: 12px;
    cursor: pointer;
  }

  .danger {
    border-color: rgba(239, 68, 68, 0.2);
    background: rgba(239, 68, 68, 0.08);
    color: $alert-error;
  }

  i {
    margin-right: 0.45rem;
  }
}

.empty-state {
  padding: 1rem;
  border-radius: 20px;
  border: 1px dashed rgba(1, 13, 39, 0.12);
  background: rgba(1, 13, 39, 0.02);
  color: rgba(1, 13, 39, 0.7);
}

@media (min-width: 900px) {
  .mobile-list {
    display: none;
  }

  .desktop-table {
    display: block;
    min-width: 840px;
    width: 100%;
    border-collapse: collapse;
  }
}
</style>
