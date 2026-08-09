<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { analyticsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { useSessionStore } from '@/stores/session'
import { formatDuration, formatNumber } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppTable from '@/components/ui/AppTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatTile from '@/components/ui/StatTile.vue'
import BarChart from '@/components/charts/BarChart.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import type { AnalyticsOverview, SectionStat, TopContentStat } from '@/types'

const toasts = useToastStore()
const session = useSessionStore()

const overview = ref<AnalyticsOverview | null>(null)
const readers = ref<{ userId: string; name: string; email: string; reads: number; minutes: number }[]>([])
const loading = ref(true)
const range = ref('30')

const rangeTabs = [
  { value: '7', label: '7 días', icon: 'fa-solid fa-calendar-day' },
  { value: '30', label: '30 días', icon: 'fa-solid fa-calendar-week' },
  { value: '90', label: '90 días', icon: 'fa-solid fa-calendar' },
]

const sectionColumns = [
  { key: 'categoryName', label: 'Sección', flex: 3 },
  { key: 'reads', label: 'Lecturas', flex: 1, align: 'right' as const },
  { key: 'uniqueReaders', label: 'Lectores', flex: 1, align: 'right' as const, hideOnMobile: true },
  { key: 'avgSeconds', label: 'Tiempo medio', flex: 1, align: 'right' as const, hideOnMobile: true },
]

const topColumns = [
  { key: 'title', label: 'Contenido', flex: 4 },
  { key: 'categoryName', label: 'Sección', flex: 2, hideOnMobile: true },
  { key: 'reads', label: 'Lecturas', flex: 1, align: 'right' as const },
  { key: 'uniqueReaders', label: 'Lectores', flex: 1, align: 'right' as const, hideOnMobile: true },
]

const timeline = computed(
  () => overview.value?.timeline.map((point) => ({ label: point.date, value: point.reads })) || [],
)

const logins = computed(() => {
  const map = new Map<string, number>()
  overview.value?.logins.filter((entry) => entry.action === 'login').forEach((entry) => map.set(entry.date, entry.total))
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
})

const sectionDonut = computed(
  () => overview.value?.sections.map((section) => ({ label: section.categoryName, value: section.reads })) || [],
)

async function load() {
  loading.value = true
  try {
    const days = Number(range.value)
    const [data, readerData] = await Promise.all([
      analyticsApi.overview(days),
      session.isAdmin ? analyticsApi.readers(days) : Promise.resolve({ data: [] }),
    ])
    overview.value = data.data
    readers.value = readerData.data
  } catch (error) {
    toasts.error('No pudimos cargar la analítica', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

watch(range, load)
onMounted(load)
</script>

<template>
  <div class="an">
    <PageHeader
      eyebrow="Audiencia"
      title="Analítica de lectura"
      detail="Ingresos, lecturas y la estadística de la información más leída por secciones."
      icon="fa-solid fa-chart-line"
    >
      <template #actions>
        <AppTabs v-model="range" :items="rangeTabs" />
      </template>
    </PageHeader>

    <AppSkeleton v-if="loading" :rows="3" height="120px" />

    <template v-else-if="overview">
      <section class="an__tiles">
        <StatTile label="Lecturas del período" :value="overview.stats.reads30" icon="fa-solid fa-book-open" color="var(--brand)" />
        <StatTile label="Lecturas hoy" :value="overview.stats.readsToday" icon="fa-solid fa-bolt" color="var(--gold)" />
        <StatTile label="Ingresos hoy" :value="overview.stats.loginsToday" icon="fa-solid fa-right-to-bracket" color="var(--ocean)" />
        <StatTile label="Usuarios activos" :value="overview.stats.activeUsers" icon="fa-solid fa-users" color="var(--moss)" :hint="`${overview.stats.users} registrados`" />
      </section>

      <div class="an__row">
        <AppPanel class="an__grow" title="Lecturas por día" icon="fa-solid fa-chart-line">
          <LineChart v-if="timeline.length" :data="timeline" :height="220" unit="lecturas" />
          <EmptyState v-else icon="fa-solid fa-chart-line" title="Sin lecturas en el período" />
        </AppPanel>

        <AppPanel class="an__side" title="Distribución por sección" icon="fa-solid fa-chart-pie" tone="var(--iris)">
          <DonutChart v-if="sectionDonut.length" :data="sectionDonut" caption="Lecturas" />
          <EmptyState v-else icon="fa-solid fa-chart-pie" title="Sin datos" />
        </AppPanel>
      </div>

      <div class="an__row">
        <AppPanel class="an__grow" title="Ingresos al sistema" icon="fa-solid fa-right-to-bracket" tone="var(--ocean)">
          <BarChart v-if="logins.length" :data="logins" unit="ingresos" />
          <EmptyState v-else icon="fa-solid fa-right-to-bracket" title="Sin ingresos registrados" />
        </AppPanel>

        <AppPanel v-if="session.isAdmin" class="an__side" title="Lectores más activos" icon="fa-solid fa-user-check" tone="var(--moss)">
          <div v-if="readers.length" class="an__readers">
            <article v-for="reader in readers" :key="reader.userId">
              <div>
                <strong>{{ reader.name || reader.email }}</strong>
                <span>{{ reader.email }}</span>
              </div>
              <AppBadge tone="moss">{{ reader.reads }} lecturas</AppBadge>
            </article>
          </div>
          <EmptyState v-else icon="fa-solid fa-user-check" title="Sin actividad" />
        </AppPanel>
      </div>

      <AppPanel title="Lo más leído por secciones" icon="fa-solid fa-layer-group" :padded="false">
        <AppTable
          v-if="overview.sections.length"
          :columns="sectionColumns"
          :rows="overview.sections as unknown as Record<string, unknown>[]"
          :row-key="(row) => String((row as unknown as SectionStat).categoryName)"
        >
          <template #cell-reads="{ row }">{{ formatNumber((row as unknown as SectionStat).reads) }}</template>
          <template #cell-uniqueReaders="{ row }">{{ formatNumber((row as unknown as SectionStat).uniqueReaders) }}</template>
          <template #cell-avgSeconds="{ row }">{{ formatDuration((row as unknown as SectionStat).avgSeconds) }}</template>
        </AppTable>
        <EmptyState v-else icon="fa-solid fa-layer-group" title="Sin datos por sección" />
      </AppPanel>

      <AppPanel title="Contenidos más leídos" icon="fa-solid fa-fire" tone="var(--gold)" :padded="false">
        <AppTable
          v-if="overview.top.length"
          :columns="topColumns"
          :rows="overview.top as unknown as Record<string, unknown>[]"
          :row-key="(row) => String((row as unknown as TopContentStat).targetId)"
        >
          <template #cell-title="{ row }">
            <RouterLink
              :to="`/admin/${(row as unknown as TopContentStat).targetType === 'article' ? 'reportajes' : 'actualizaciones'}/${(row as unknown as TopContentStat).targetId}`"
            >
              {{ (row as unknown as TopContentStat).title }}
            </RouterLink>
          </template>
          <template #cell-reads="{ row }">{{ formatNumber((row as unknown as TopContentStat).reads) }}</template>
          <template #cell-uniqueReaders="{ row }">{{ formatNumber((row as unknown as TopContentStat).uniqueReaders) }}</template>
        </AppTable>
        <EmptyState v-else icon="fa-solid fa-fire" title="Sin ranking" />
      </AppPanel>
    </template>
  </div>
</template>

<style scoped lang="scss">
.an {
  @include col(var(--s-6));
}

.an__tiles {
  @include wrap(var(--s-4));
}

.an__row {
  @include wrap(var(--s-4));
  align-items: stretch;
}

.an__grow {
  flex: 3 1 460px;
}

.an__side {
  flex: 2 1 320px;
}

.an__readers {
  @include col(var(--s-2));

  article {
    @include row(var(--s-3), center, space-between);
    padding: var(--s-2) 0;

    div {
      @include col(1px);
      min-width: 0;
    }

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
}
</style>
