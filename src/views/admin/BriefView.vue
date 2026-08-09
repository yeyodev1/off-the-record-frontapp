<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { analyticsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { formatDate, formatIndicator, formatNumber } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BarChart from '@/components/charts/BarChart.vue'
import Sparkline from '@/components/charts/Sparkline.vue'
import type { DailyBrief } from '@/types'

const toasts = useToastStore()
const brief = ref<DailyBrief | null>(null)
const loading = ref(true)

const headlineChart = computed(
  () => brief.value?.headlines.map((item) => ({ label: item.title, value: item.reads, color: item.color })) || [],
)

const sectionChart = computed(
  () => brief.value?.sections.map((section) => ({ label: section.categoryName, value: section.reads })) || [],
)

async function load() {
  loading.value = true
  try {
    const { data } = await analyticsApi.brief()
    brief.value = data
  } catch (error) {
    toasts.error('No pudimos armar el resumen', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function copyBrief() {
  if (!brief.value) return

  const lines = [
    `OFF THE RECORD · Resumen del ${formatDate(brief.value.date)}`,
    '',
    'TITULARES',
    ...brief.value.headlines.map((item, index) => `${index + 1}. ${item.title}`),
    '',
    'ACTUALIZACIONES',
    ...brief.value.updates.map((item, index) => `${index + 1}. ${item.title}`),
    '',
    'INDICADORES',
    ...brief.value.indicators.map(
      (indicator) =>
        `· ${indicator.name}: ${formatIndicator(indicator.value, indicator.format, indicator.unit)}` +
        (indicator.deltaPercent !== null ? ` (${indicator.deltaPercent > 0 ? '+' : ''}${indicator.deltaPercent}%)` : ''),
    ),
  ]

  navigator.clipboard
    .writeText(lines.join('\n'))
    .then(() => toasts.success('Resumen copiado', 'Listo para enviarlo por Signal.'))
    .catch(() => toasts.error('No se pudo copiar', 'Copia el texto manualmente.'))
}

onMounted(load)
</script>

<template>
  <div class="brief">
    <PageHeader
      eyebrow="Cierre del día"
      title="Resumen del día"
      detail="Gráfico de titulares, actualizaciones e indicadores económicos."
      icon="fa-solid fa-sun"
    >
      <template #actions>
        <AppButton variant="outline" icon="fa-solid fa-rotate" @click="load">Actualizar</AppButton>
        <AppButton icon="fa-regular fa-copy" @click="copyBrief">Copiar para Signal</AppButton>
      </template>
    </PageHeader>

    <AppSkeleton v-if="loading" :rows="4" height="120px" />

    <template v-else-if="brief">
      <section class="brief__indicators">
        <article v-for="indicator in brief.indicators" :key="indicator._id" class="ind">
          <header>
            <span>{{ indicator.name }}</span>
            <AppBadge v-if="indicator.code" tone="neutral">{{ indicator.code }}</AppBadge>
          </header>

          <strong :style="{ color: indicator.color }">
            {{ formatIndicator(indicator.value, indicator.format, indicator.unit) }}
          </strong>

          <div class="ind__foot">
            <em
              v-if="indicator.deltaPercent !== null"
              :class="indicator.deltaPercent >= 0 ? 'is-up' : 'is-down'"
            >
              <i :class="indicator.deltaPercent >= 0 ? 'fa-solid fa-caret-up' : 'fa-solid fa-caret-down'" />
              {{ Math.abs(indicator.deltaPercent).toFixed(2) }}%
            </em>
            <span v-if="indicator.source">{{ indicator.source }}</span>
          </div>

          <Sparkline :values="indicator.history.map((point) => point.value)" :color="indicator.color" :height="30" />
        </article>
      </section>

      <div class="brief__row">
        <AppPanel class="brief__grow" title="Titulares del día" icon="fa-solid fa-newspaper">
          <BarChart v-if="headlineChart.length" :data="headlineChart" unit="lecturas" />
          <EmptyState v-else icon="fa-regular fa-newspaper" title="Sin publicaciones hoy" />
        </AppPanel>

        <AppPanel class="brief__side" title="Lecturas por sección" icon="fa-solid fa-layer-group" tone="var(--iris)">
          <BarChart v-if="sectionChart.length" :data="sectionChart" unit="lecturas" />
          <EmptyState v-else icon="fa-solid fa-layer-group" title="Sin lecturas hoy" />
        </AppPanel>
      </div>

      <div class="brief__row">
        <AppPanel class="brief__grow" title="Reportajes publicados" icon="fa-solid fa-file-lines">
          <div v-if="brief.headlines.length" class="brief__list">
            <article v-for="item in brief.headlines" :key="item.id" :style="{ '--accent': item.color }">
              <span class="brief__dot" />
              <div>
                <p class="brief__kicker">{{ item.kicker || item.category }}</p>
                <strong>{{ item.title }}</strong>
                <p v-if="item.summary">{{ item.summary }}</p>
              </div>
              <span class="brief__reads">{{ formatNumber(item.reads) }}</span>
            </article>
          </div>
          <EmptyState v-else icon="fa-regular fa-newspaper" title="Nada publicado" />
        </AppPanel>

        <AppPanel class="brief__side" title="Actualizaciones" icon="fa-solid fa-bolt" tone="var(--ocean)">
          <div v-if="brief.updates.length" class="brief__list">
            <article v-for="item in brief.updates" :key="item.id" :style="{ '--accent': item.color }">
              <span class="brief__dot" />
              <div>
                <strong>{{ item.title }}</strong>
                <p v-if="item.summary">{{ item.summary }}</p>
              </div>
              <span class="brief__reads">{{ formatNumber(item.reads) }}</span>
            </article>
          </div>
          <EmptyState v-else icon="fa-solid fa-bolt" title="Sin actualizaciones" />
        </AppPanel>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.brief {
  @include col(var(--s-6));
}

.brief__indicators {
  @include wrap(var(--s-4));
}

.ind {
  @include col(var(--s-2));
  flex: 1 1 200px;
  padding: var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);

  header {
    @include row(var(--s-2), center, space-between);
    @include eyebrow;
    font-size: 10px;
  }

  strong {
    font-family: var(--font-display);
    font-size: 26px;
  }
}

.ind__foot {
  @include row(var(--s-3), center);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);

  em {
    font-style: normal;
  }

  .is-up {
    color: var(--moss);
  }
  .is-down {
    color: var(--danger);
  }
}

.brief__row {
  @include wrap(var(--s-4));
  align-items: stretch;
}

.brief__grow {
  flex: 3 1 440px;
}

.brief__side {
  flex: 2 1 320px;
}

.brief__list {
  @include col(var(--s-3));

  article {
    @include row(var(--s-3), flex-start);
    padding-inline-start: var(--s-2);

    div {
      @include col(2px);
      flex: 1;
      min-width: 0;
    }

    strong {
      font-size: 15px;
    }

    p {
      font-size: 13px;
      color: var(--text-muted);
      @include truncate(2);
    }
  }
}

.brief__kicker {
  @include eyebrow;
  font-size: 9px;
  color: var(--accent) !important;
}

.brief__dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent, var(--brand));
}

.brief__reads {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
}
</style>
