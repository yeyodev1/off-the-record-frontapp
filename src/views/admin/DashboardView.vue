<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { analyticsApi, contentApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { useSessionStore } from '@/stores/session'
import { STATUS_META } from '@/config/navigation'
import { formatDateTime, formatNumber, formatRelative } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatTile from '@/components/ui/StatTile.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BarChart from '@/components/charts/BarChart.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import type { AnalyticsOverview, ContentItem } from '@/types'

const router = useRouter()
const toasts = useToastStore()
const session = useSessionStore()

const overview = ref<AnalyticsOverview | null>(null)
const pending = ref<ContentItem[]>([])
const loading = ref(true)

const timeline = computed(
  () => overview.value?.timeline.map((point) => ({ label: point.date, value: point.reads })) || [],
)

const sections = computed(
  () => overview.value?.sections.map((section) => ({ label: section.categoryName, value: section.reads })) || [],
)

const topContent = computed(() => overview.value?.top || [])

async function load() {
  loading.value = true
  try {
    const [analytics, articles, updates] = await Promise.all([
      analyticsApi.overview(30),
      contentApi.list('article', { status: 'scheduled' }),
      contentApi.list('update', { status: 'scheduled' }),
    ])

    overview.value = analytics.data
    pending.value = [...articles.data, ...updates.data]
      .sort((a, b) => new Date(a.scheduledFor || 0).getTime() - new Date(b.scheduledFor || 0).getTime())
      .slice(0, 6)
  } catch (error) {
    toasts.error('No pudimos cargar el panel', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="dash">
    <PageHeader
      eyebrow="Sala de redacción"
      :title="`Hola, ${session.user?.name || 'equipo'}`"
      detail="Estado editorial, audiencia y publicaciones programadas."
      icon="fa-solid fa-gauge-high"
    >
      <template #actions>
        <AppButton variant="outline" icon="fa-solid fa-bolt" @click="router.push('/admin/actualizaciones/nueva')">
          Nueva actualización
        </AppButton>
        <AppButton icon="fa-solid fa-plus" @click="router.push('/admin/reportajes/nuevo')">Nuevo reportaje</AppButton>
      </template>
    </PageHeader>

    <AppSkeleton v-if="loading" :rows="3" height="110px" />

    <template v-else-if="overview">
      <section class="dash__tiles">
        <StatTile
          label="Reportajes publicados"
          :value="overview.stats.published"
          icon="fa-solid fa-newspaper"
          color="var(--brand)"
          :hint="`${overview.stats.articles} en total`"
        />
        <StatTile
          label="Programados"
          :value="overview.stats.scheduled + overview.stats.scheduledUpdates"
          icon="fa-regular fa-clock"
          color="var(--iris)"
          hint="Reportajes + actualizaciones"
        />
        <StatTile
          label="Borradores"
          :value="overview.stats.drafts"
          icon="fa-regular fa-pen-to-square"
          color="var(--gold)"
          hint="Pendientes de cerrar"
        />
        <StatTile
          label="Lecturas hoy"
          :value="overview.stats.readsToday"
          icon="fa-solid fa-book-open"
          color="var(--moss)"
          :hint="`${formatNumber(overview.stats.reads30)} en 30 días`"
        />
        <StatTile
          label="Ingresos hoy"
          :value="overview.stats.loginsToday"
          icon="fa-solid fa-right-to-bracket"
          color="var(--ocean)"
          :hint="`${overview.stats.activeUsers} usuarios activos`"
        />
      </section>

      <section class="dash__row">
        <AppPanel
          class="dash__grow"
          title="Lecturas de los últimos 14 días"
          detail="Volumen diario de aperturas"
          icon="fa-solid fa-chart-line"
        >
          <LineChart v-if="timeline.length" :data="timeline" :height="200" unit="lecturas" />
          <EmptyState v-else icon="fa-solid fa-chart-line" title="Sin lecturas registradas" />
        </AppPanel>

        <AppPanel
          class="dash__side"
          title="Lo más leído por sección"
          icon="fa-solid fa-layer-group"
          tone="var(--iris)"
        >
          <DonutChart v-if="sections.length" :data="sections" caption="Lecturas" />
          <EmptyState v-else icon="fa-solid fa-layer-group" title="Aún sin datos por sección" />
        </AppPanel>
      </section>

      <section class="dash__row">
        <AppPanel class="dash__grow" title="Contenidos más leídos" icon="fa-solid fa-fire" tone="var(--gold)">
          <BarChart
            v-if="topContent.length"
            :data="topContent.map((entry) => ({ label: entry.title, value: entry.reads }))"
            unit="lecturas"
          />
          <EmptyState v-else icon="fa-solid fa-fire" title="Sin ranking todavía" />
        </AppPanel>

        <AppPanel class="dash__side" title="Publicaciones programadas" icon="fa-regular fa-clock" tone="var(--ocean)">
          <div v-if="pending.length" class="dash__queue">
            <RouterLink
              v-for="item in pending"
              :key="item._id"
              class="dash__queue-item"
              :to="`/admin/${item.articleId !== undefined ? 'actualizaciones' : 'reportajes'}/${item._id}`"
            >
              <span class="dash__queue-dot" :style="{ background: item.accentColor }" />
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ formatDateTime(item.scheduledFor) }} · {{ formatRelative(item.scheduledFor) }}</span>
              </div>
              <AppBadge :tone="STATUS_META[item.status]?.tone as never">{{ STATUS_META[item.status]?.label }}</AppBadge>
            </RouterLink>
          </div>

          <EmptyState
            v-else
            icon="fa-regular fa-calendar-check"
            title="Nada en cola"
            detail="Programa una publicación desde el editor."
          />
        </AppPanel>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dash {
  @include col(var(--s-6));
}

.dash__tiles {
  @include wrap(var(--s-4));
}

.dash__row {
  @include wrap(var(--s-4));
  align-items: stretch;
}

.dash__grow {
  flex: 3 1 460px;
}

.dash__side {
  flex: 2 1 320px;
}

.dash__queue {
  @include col(var(--s-2));
}

.dash__queue-item {
  @include row(var(--s-3), center);
  padding: var(--s-3);
  border-radius: var(--r-sm);
  transition: background var(--t-fast) var(--ease);

  &:hover {
    background: var(--surface-hover);
  }

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
    font-size: 10px;
  }
}

.dash__queue-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}
</style>
