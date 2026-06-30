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
    return value ? 'Sí' : 'No'
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
    <div v-if="loading" class="table-state surface-card">Cargando registros...</div>
    <div v-else-if="!rows.length" class="table-state surface-card">Sin resultados</div>

    <template v-else>
      <div class="table-shell__mobile">
        <article v-for="row in rows" :key="String(row._id || row.id)" class="row-card surface-card">
          <header class="row-card__header">
            <div>
              <span class="row-card__eyebrow">{{ props.columns[0]?.label || 'Registro' }}</span>
              <strong>{{ getPrimaryValue(row) }}</strong>
            </div>

            <div class="row-card__actions">
              <button type="button" class="secondary-button" @click="$emit('edit', row)">
                <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>Editar
              </button>
              <button type="button" class="danger-button" @click="$emit('remove', row)">
                <i class="fa-solid fa-trash" aria-hidden="true"></i>Eliminar
              </button>
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

      <div class="table-shell__desktop surface-card">
        <table class="desktop-table">
          <thead>
            <tr>
              <th v-for="column in props.columns" :key="column.key">{{ column.label }}</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="String(row._id || row.id)">
              <td v-for="column in props.columns" :key="column.key">
                {{ formatValue(row[column.key], column.type) }}
              </td>
              <td class="actions">
                <button type="button" class="secondary-button" @click="$emit('edit', row)">
                  <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>Editar
                </button>
                <button type="button" class="danger-button" @click="$emit('remove', row)">
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.table-shell {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.table-shell__mobile {
  display: grid;
  gap: 0.85rem;
  min-width: 0;
}

.table-state,
.row-card,
.table-shell__desktop {
  border-radius: var(--radius-xl);
  min-width: 0;
}

.table-state {
  padding: 1rem;
  border: 1px dashed rgba(1, 13, 39, 0.14);
  color: rgba(1, 13, 39, 0.72);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 247, 243, 0.96));
}

.row-card {
  padding: 1rem;
  display: grid;
  gap: 1rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 247, 243, 0.96));
}

.row-card__header {
  display: grid;
  gap: 0.85rem;

  strong {
    display: block;
    margin-top: 0.3rem;
    font-family: var(--font-display);
    font-size: 1.1rem;
    color: $primary-dark;
    letter-spacing: -0.03em;
  }
}

.row-card__eyebrow {
  display: inline-block;
  color: $accent-red;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.68rem;
}

.row-card__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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
    font-family: var(--font-display);
    font-size: 0.96rem;
    color: $primary-dark;
    word-break: break-word;
  }
}

.table-shell__desktop {
  display: none;
  overflow: auto;
  min-width: 0;
}

.desktop-table {
  display: block;
  min-width: 860px;
  width: 100%;
  border-collapse: collapse;
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
    width: auto;
  }
}

@media (min-width: 900px) {
  .table-shell__mobile {
    display: none;
  }

  .table-shell__desktop {
    display: block;
  }
}
</style>
