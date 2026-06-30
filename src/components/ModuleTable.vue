<script setup lang="ts">
import type { ModuleColumn } from '@/config/modules'

defineProps<{
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
</script>

<template>
  <div class="table-shell">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length + 1">Cargando...</td>
        </tr>
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length + 1">Sin resultados</td>
        </tr>
        <tr v-for="row in rows" v-else :key="String(row._id || row.id)">
          <td v-for="column in columns" :key="column.key">
            {{ formatValue(row[column.key], column.type) }}
          </td>
          <td class="actions">
            <button type="button" @click="$emit('edit', row)">Editar</button>
            <button type="button" class="danger" @click="$emit('remove', row)">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.table-shell {
  overflow: auto;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 840px;
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

  button {
    border: 1px solid rgba(1, 13, 39, 0.1);
    background: rgba(1, 13, 39, 0.03);
    padding: 0.55rem 0.85rem;
    border-radius: 12px;
    cursor: pointer;
  }

  .danger {
    border-color: rgba(200, 57, 43, 0.2);
    background: rgba(200, 57, 43, 0.08);
    color: $accent-red;
  }
}
</style>
