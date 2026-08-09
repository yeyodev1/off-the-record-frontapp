<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { reportsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { useSessionStore } from '@/stores/session'
import { formatDate, formatDateTime, formatIndicator, formatNumber } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import StatTile from '@/components/ui/StatTile.vue'
import BarChart from '@/components/charts/BarChart.vue'
import InfographicView from '@/components/charts/InfographicView.vue'
import type { EditorialReport } from '@/types'

const toasts = useToastStore()
const session = useSessionStore()

const reports = ref<EditorialReport[]>([])
const selected = ref<EditorialReport | null>(null)
const loading = ref(true)
const generating = ref('')
const kind = ref<'daily' | 'monthly'>('daily')

const confirmOpen = ref(false)
const deleting = ref(false)

const tabs = computed(() => [
  {
    value: 'daily',
    label: 'Diarios',
    icon: 'fa-solid fa-calendar-day',
    count: reports.value.filter((r) => r.kind === 'daily').length,
  },
  {
    value: 'monthly',
    label: 'Mensuales',
    icon: 'fa-solid fa-calendar',
    count: reports.value.filter((r) => r.kind === 'monthly').length,
  },
])

const filtered = computed(() => reports.value.filter((report) => report.kind === kind.value))

const sectionChart = computed(
  () => selected.value?.sections.map((s) => ({ label: s.title, value: s.reads, color: s.color || undefined })) || [],
)

async function load() {
  loading.value = true
  try {
    const { data } = await reportsApi.list()
    reports.value = data
    selected.value = data.find((report) => report.kind === kind.value) || null
  } catch (error) {
    toasts.error('No pudimos cargar los reportes', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

async function generate(target: 'daily' | 'monthly') {
  generating.value = target
  try {
    const { data, message } = await reportsApi.generate(target)
    reports.value = [data, ...reports.value.filter((report) => report._id !== data._id)]
    kind.value = target
    selected.value = data
    if (data.error) toasts.warning(message, data.error)
    else toasts.success(message, data.headline)
  } catch (error) {
    toasts.error('No se pudo generar el reporte', apiErrorMessage(error))
  } finally {
    generating.value = ''
  }
}

function copyReport() {
  if (!selected.value) return
  const report = selected.value

  const text = [
    report.title.toUpperCase(),
    '',
    report.headline,
    '',
    report.narrative,
    '',
    'HALLAZGOS',
    ...report.highlights.map((item) => `· ${item}`),
    '',
    'RECOMENDACIONES',
    ...report.recommendations.map((item) => `· ${item}`),
    '',
    'CIFRAS',
    ...report.metrics.map((metric) => `· ${metric.label}: ${metric.value}`),
  ].join('\n')

  navigator.clipboard
    .writeText(text)
    .then(() => toasts.success('Reporte copiado', 'Listo para enviarlo al equipo.'))
    .catch(() => toasts.error('No se pudo copiar', 'Copia el texto manualmente.'))
}

async function confirmDelete() {
  if (!selected.value) return
  deleting.value = true
  try {
    await reportsApi.remove(selected.value._id)
    reports.value = reports.value.filter((report) => report._id !== selected.value?._id)
    selected.value = filtered.value[0] || null
    toasts.success('Reporte eliminado')
    confirmOpen.value = false
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  } finally {
    deleting.value = false
  }
}

watch(kind, () => {
  selected.value = filtered.value[0] || null
})

onMounted(load)
</script>

<template>
  <div class="reports">
    <PageHeader
      eyebrow="Dirección"
      title="Reportes"
      detail="El agente redacta solo el reporte diario y el mensual con las cifras de la redacción."
      icon="fa-solid fa-file-invoice"
    >
      <template #actions>
        <AppButton
          variant="outline"
          icon="fa-solid fa-calendar-day"
          :loading="generating === 'daily'"
          @click="generate('daily')"
        >
          Generar diario
        </AppButton>
        <AppButton
          icon="fa-solid fa-calendar"
          :loading="generating === 'monthly'"
          @click="generate('monthly')"
        >
          Generar mensual
        </AppButton>
      </template>
    </PageHeader>

    <AppSkeleton v-if="loading" :rows="3" height="120px" />

    <template v-else>
      <AppTabs v-model="kind" :items="tabs" />

      <div class="reports__layout">
        <!-- Histórico -->
        <AppPanel class="reports__list-panel" title="Histórico" icon="fa-solid fa-clock-rotate-left" :padded="false">
          <div v-if="filtered.length" class="reports__list">
            <button
              v-for="report in filtered"
              :key="report._id"
              :class="['reports__item', { 'reports__item--on': selected?._id === report._id }]"
              type="button"
              @click="selected = report"
            >
              <span class="reports__period">{{ report.periodKey }}</span>
              <strong>{{ report.headline || report.title }}</strong>
              <span class="reports__meta">
                <AppBadge :tone="report.generatedBy === 'auto' ? 'moss' : 'neutral'">
                  {{ report.generatedBy === 'auto' ? 'automático' : 'manual' }}
                </AppBadge>
                <em v-if="report.error" class="reports__warn">sin IA</em>
              </span>
            </button>
          </div>

          <EmptyState
            v-else
            icon="fa-solid fa-file-invoice"
            title="Aún no hay reportes"
            detail="Se generan solos cada mañana, o púlsalo arriba para crearlo ahora."
          />
        </AppPanel>

        <!-- Detalle -->
        <div v-if="selected" class="reports__detail">
          <AppPanel :title="selected.title" :detail="`Período ${formatDate(selected.periodStart)} — ${formatDate(selected.periodEnd)}`" icon="fa-solid fa-file-lines">
            <template #actions>
              <AppBadge tone="iris">{{ selected.engine }}</AppBadge>
              <AppButton size="sm" variant="ghost" icon="fa-regular fa-copy" title="Copiar" @click="copyReport" />
              <AppButton
                v-if="session.isAdmin"
                size="sm"
                variant="ghost"
                icon="fa-regular fa-trash-can"
                title="Eliminar"
                @click="confirmOpen = true"
              />
            </template>

            <div class="reports__body">
              <p class="reports__headline">{{ selected.headline }}</p>

              <p v-if="selected.error" class="reports__error">
                <i class="fa-solid fa-triangle-exclamation" /> {{ selected.error }}
              </p>

              <p v-for="(paragraph, index) in selected.narrative.split('\n').filter(Boolean)" :key="index" class="reports__para">
                {{ paragraph }}
              </p>

              <p class="reports__stamp">
                Generado {{ formatDateTime(selected.generatedAt) }} · {{ selected.generatedBy === 'auto' ? 'automáticamente' : 'a demanda' }}
              </p>
            </div>
          </AppPanel>

          <section class="reports__tiles">
            <StatTile
              v-for="metric in selected.metrics"
              :key="metric.label"
              :label="metric.label"
              :value="metric.value"
              :color="metric.color"
              icon="fa-solid fa-chart-simple"
            />
          </section>

          <div class="reports__row">
            <AppPanel v-if="selected.highlights.length" class="reports__grow" title="Hallazgos" icon="fa-solid fa-lightbulb" tone="var(--gold)">
              <ul class="reports__bullets">
                <li v-for="item in selected.highlights" :key="item"><i class="fa-solid fa-circle" /> {{ item }}</li>
              </ul>
            </AppPanel>

            <AppPanel v-if="selected.recommendations.length" class="reports__grow" title="Recomendaciones" icon="fa-solid fa-flag" tone="var(--moss)">
              <ul class="reports__bullets">
                <li v-for="item in selected.recommendations" :key="item"><i class="fa-solid fa-arrow-right-long" /> {{ item }}</li>
              </ul>
            </AppPanel>
          </div>

          <AppPanel v-if="selected.chart" title="Infografía del período" icon="fa-solid fa-chart-pie" tone="var(--iris)">
            <InfographicView :spec="selected.chart" />
          </AppPanel>

          <div class="reports__row">
            <AppPanel class="reports__grow" title="Lecturas por sección" icon="fa-solid fa-layer-group">
              <BarChart v-if="sectionChart.length" :data="sectionChart" unit="lecturas" />
              <EmptyState v-else icon="fa-solid fa-layer-group" title="Sin lecturas en el período" />
            </AppPanel>

            <AppPanel class="reports__grow" title="Publicado en el período" icon="fa-solid fa-newspaper">
              <div v-if="selected.published.length" class="reports__entries">
                <article v-for="item in selected.published" :key="item.id" :style="{ '--accent': item.color }">
                  <span class="reports__dot" />
                  <div>
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.category }} · {{ item.kind === 'article' ? 'reportaje' : 'actualización' }}</span>
                  </div>
                  <span class="reports__reads">{{ formatNumber(item.reads) }}</span>
                </article>
              </div>
              <EmptyState v-else icon="fa-regular fa-newspaper" title="Nada publicado" />
            </AppPanel>
          </div>

          <AppPanel v-if="selected.indicators.length" title="Indicadores del cierre" icon="fa-solid fa-coins" tone="var(--gold)">
            <div class="reports__indicators">
              <article v-for="indicator in selected.indicators" :key="indicator.code || indicator.name">
                <span>{{ indicator.name }}</span>
                <strong :style="{ color: indicator.color }">
                  {{ formatIndicator(indicator.value, indicator.format, indicator.unit) }}
                </strong>
                <em v-if="indicator.deltaPercent !== null" :class="indicator.deltaPercent >= 0 ? 'is-up' : 'is-down'">
                  {{ indicator.deltaPercent > 0 ? '+' : '' }}{{ indicator.deltaPercent }}%
                </em>
              </article>
            </div>
          </AppPanel>
        </div>

        <EmptyState
          v-else
          class="reports__detail"
          icon="fa-solid fa-file-invoice"
          title="Selecciona un reporte"
          detail="O genera el de hoy con el botón de arriba."
        />
      </div>
    </template>

    <ConfirmDialog
      v-model="confirmOpen"
      :title="`¿Eliminar «${selected?.title || ''}»?`"
      message="Se puede volver a generar en cualquier momento."
      confirm-label="Eliminar"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped lang="scss">
.reports {
  @include col(var(--s-5));
}

.reports__layout {
  @include row(var(--s-4), flex-start);
  align-items: flex-start;

  @include tablet {
    flex-direction: column;
  }
}

.reports__list-panel {
  flex: 0 0 280px;
  width: 100%;
  max-width: 300px;
  position: sticky;
  top: calc(var(--topbar-h) + var(--s-4));

  @include tablet {
    position: static;
    max-width: none;
    flex: 1 1 auto;
  }
}

.reports__list {
  @include col(0);
  max-height: 62vh;
  overflow-y: auto;
  @include scrollbar;
}

.reports__item {
  @include col(4px);
  align-items: flex-start;
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--line);
  text-align: start;
  transition: background var(--t-fast) var(--ease);

  strong {
    font-size: 13px;
    color: var(--text);
    @include truncate(2);
  }

  &:hover {
    background: var(--surface-hover);
  }
}

.reports__item--on {
  background: var(--brand-soft);
  border-inline-start: 3px solid var(--brand);
}

.reports__period {
  @include eyebrow;
  font-size: 9px;
}

.reports__meta {
  @include row(var(--s-2), center);
}

.reports__warn {
  @include eyebrow;
  font-size: 9px;
  font-style: normal;
  color: var(--gold);
}

.reports__detail {
  @include col(var(--s-4));
  flex: 1;
  min-width: 0;
  width: 100%;
}

.reports__body {
  @include col(var(--s-3));
}

.reports__headline {
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 1.35;
  color: var(--text-strong);
}

.reports__para {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-muted);
}

.reports__error {
  @include row(var(--s-2), center);
  padding: var(--s-3);
  border-radius: var(--r-sm);
  background: var(--gold-soft);
  font-size: 13px;
  color: var(--gold);
}

.reports__stamp {
  @include eyebrow;
  font-size: 9px;
}

.reports__tiles {
  @include wrap(var(--s-3));
}

.reports__row {
  @include wrap(var(--s-4));
  align-items: stretch;
}

.reports__grow {
  flex: 1 1 320px;
}

.reports__bullets {
  @include col(var(--s-2));
  list-style: none;

  li {
    @include row(var(--s-3), flex-start);
    font-size: 14px;
    color: var(--text-muted);

    i {
      margin-top: 6px;
      font-size: 6px;
      color: var(--brand);
    }
  }
}

.reports__entries {
  @include col(var(--s-2));

  article {
    @include row(var(--s-3), center);

    div {
      @include col(1px);
      flex: 1;
      min-width: 0;
    }

    strong {
      font-size: 14px;
      @include truncate;
    }

    span {
      @include eyebrow;
      font-size: 9px;
    }
  }
}

.reports__dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent, var(--brand));
}

.reports__reads {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
}

.reports__indicators {
  @include wrap(var(--s-3));

  article {
    @include col(2px);
    flex: 1 1 150px;
    padding: var(--s-3);
    border-radius: var(--r-md);
    background: var(--surface-sunken);
    border: 1px solid var(--line);

    span {
      @include eyebrow;
      font-size: 9px;
    }

    strong {
      font-family: var(--font-display);
      font-size: 20px;
    }

    em {
      font-style: normal;
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .is-up {
      color: var(--moss);
    }
    .is-down {
      color: var(--danger);
    }
  }
}
</style>
