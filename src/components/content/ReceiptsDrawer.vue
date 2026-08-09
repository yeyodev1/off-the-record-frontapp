<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { receiptsApi, type ReceiptSummary } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { ROLE_LABELS } from '@/config/navigation'
import { formatDateTime, formatDuration } from '@/composables/useFormat'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import type { ContentKind } from '@/types'

const props = defineProps<{
  modelValue: boolean
  kind?: ContentKind
  contentId?: string
  notificationId?: string
  title?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const toasts = useToastStore()
const summary = ref<ReceiptSummary | null>(null)
const loading = ref(false)
const tab = ref<'all' | 'read' | 'unread'>('all')

const rows = computed(() => {
  const all = summary.value?.rows || []
  if (tab.value === 'read') return all.filter((row) => row.read)
  if (tab.value === 'unread') return all.filter((row) => !row.read)
  return all
})

const tabs = computed(() => [
  { value: 'all', label: 'Todos', icon: 'fa-solid fa-users', count: summary.value?.total || 0 },
  { value: 'read', label: 'Lo vieron', icon: 'fa-solid fa-eye', count: summary.value?.read || 0 },
  { value: 'unread', label: 'No lo vieron', icon: 'fa-solid fa-eye-slash', count: summary.value?.unread || 0 },
])

async function load() {
  if (!props.contentId && !props.notificationId) return

  loading.value = true
  summary.value = null

  try {
    const { data } = props.notificationId
      ? await receiptsApi.notification(props.notificationId)
      : await receiptsApi.content(props.kind || 'article', props.contentId as string)
    summary.value = data
  } catch (error) {
    toasts.error('No pudimos cargar los acuses', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function exportCsv() {
  if (!summary.value) return

  const header = ['Nombre', 'Correo', 'Rol', 'Organización', 'Estado', 'Fecha de lectura', 'Tiempo']
  const lines = summary.value.rows.map((row) =>
    [
      row.name,
      row.email,
      ROLE_LABELS[row.roleId] || row.roleId,
      row.organization,
      row.read ? 'Leído' : 'No leído',
      row.readAt ? formatDateTime(row.readAt) : '',
      row.seconds ? formatDuration(row.seconds) : '',
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  )

  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `acuses-${(summary.value.title || 'contenido').slice(0, 40)}.csv`
  link.click()
  URL.revokeObjectURL(url)

  toasts.success('CSV descargado', 'El listado de acuses está en tus descargas.')
}

watch(
  () => [props.modelValue, props.contentId, props.notificationId],
  ([open]) => {
    if (open) {
      tab.value = 'all'
      void load()
    }
  },
)
</script>

<template>
  <AppDrawer
    :model-value="modelValue"
    width="560px"
    title="Acuses de lectura"
    :subtitle="title"
    icon="fa-solid fa-eye"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <AppSkeleton v-if="loading" :rows="5" height="54px" />

    <div v-else-if="summary" class="receipts">
      <section class="receipts__summary">
        <div class="receipts__gauge" :style="{ '--rate': `${summary.rate}%` }">
          <span class="receipts__gauge-value">{{ summary.rate }}%</span>
          <span class="receipts__gauge-label">Cobertura</span>
        </div>

        <div class="receipts__counts">
          <p><strong>{{ summary.read }}</strong> lo vieron</p>
          <p class="is-dim"><strong>{{ summary.unread }}</strong> no lo vieron</p>
          <p class="is-dim"><strong>{{ summary.total }}</strong> en la audiencia</p>
        </div>

        <button class="receipts__export" type="button" @click="exportCsv">
          <i class="fa-solid fa-file-csv" aria-hidden="true" /> Exportar CSV
        </button>
      </section>

      <AppTabs v-model="tab" :items="tabs" />

      <TransitionGroup v-if="rows.length" name="list" tag="div" class="receipts__list">
        <article v-for="row in rows" :key="row.userId" :class="['receipt', { 'receipt--read': row.read }]">
          <span class="receipt__state">
            <i :class="row.read ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" aria-hidden="true" />
          </span>

          <div class="receipt__main">
            <strong>{{ row.name || row.email }}</strong>
            <span>{{ row.email }}</span>
            <span v-if="row.organization" class="receipt__org">{{ row.organization }} · {{ row.position }}</span>
          </div>

          <div class="receipt__side">
            <AppBadge :tone="row.read ? 'moss' : 'neutral'">{{ row.read ? 'Leído' : 'Pendiente' }}</AppBadge>
            <span v-if="row.readAt">{{ formatDateTime(row.readAt) }}</span>
            <span v-if="row.seconds">{{ formatDuration(row.seconds) }}</span>
            <span v-if="row.times > 1">{{ row.times }} aperturas</span>
          </div>
        </article>
      </TransitionGroup>

      <EmptyState
        v-else
        :icon="tab === 'unread' ? 'fa-solid fa-circle-check' : 'fa-solid fa-eye-slash'"
        :title="tab === 'unread' ? 'Todos lo leyeron' : 'Nadie en esta lista'"
      />
    </div>

    <EmptyState v-else icon="fa-solid fa-eye" title="Sin datos" detail="Abre un contenido para ver sus acuses." />
  </AppDrawer>
</template>

<style scoped lang="scss">
.receipts {
  @include col(var(--s-4));
}

.receipts__summary {
  @include row(var(--s-4), center);
  flex-wrap: wrap;
  padding: var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
}

.receipts__gauge {
  position: relative;
  @include col(0, center);
  justify-content: center;
  width: 86px;
  height: 86px;
  flex-shrink: 0;
  border-radius: 50%;
  background: conic-gradient(var(--moss) var(--rate), var(--ink-700) 0);

  &::after {
    content: '';
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    background: var(--surface-sunken);
  }
}

.receipts__gauge-value,
.receipts__gauge-label {
  position: relative;
  z-index: 1;
}

.receipts__gauge-value {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--text-strong);
}

.receipts__gauge-label {
  @include eyebrow;
  font-size: 9px;
}

.receipts__counts {
  @include col(2px);
  flex: 1;
  min-width: 120px;
  font-size: 13px;

  strong {
    font-family: var(--font-mono);
    color: var(--text-strong);
  }

  .is-dim {
    color: var(--text-muted);
  }
}

.receipts__export {
  @include row(var(--s-2), center);
  padding: 8px 14px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line-strong);
  font-size: 12px;
  color: var(--text-muted);

  &:hover {
    border-color: var(--brand-line);
    color: var(--brand-strong);
  }
}

.receipts__list {
  @include col(var(--s-2));
  position: relative;
}

.receipt {
  @include row(var(--s-3), center);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);

  @include mobile {
    flex-wrap: wrap;
  }
}

.receipt--read {
  border-color: rgba(87, 167, 115, 0.32);
}

.receipt__state {
  @include row(0, center, center);
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--r-xs);
  background: var(--ink-700);
  color: var(--text-dim);
  font-size: 12px;
}

.receipt--read .receipt__state {
  background: var(--moss-soft);
  color: var(--moss);
}

.receipt__main {
  @include col(1px);
  flex: 1;
  min-width: 0;

  strong {
    font-size: 14px;
    @include truncate;
  }

  span {
    font-size: 12px;
    color: var(--text-dim);
    @include truncate;
  }
}

.receipt__org {
  color: var(--text-muted) !important;
}

.receipt__side {
  @include col(2px, flex-end);
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
  text-align: end;
}
</style>
