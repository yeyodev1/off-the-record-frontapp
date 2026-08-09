<script setup lang="ts">
import { computed } from 'vue'
import BarChart from './BarChart.vue'
import DonutChart from './DonutChart.vue'
import LineChart from './LineChart.vue'
import type { InfographicSpec } from '@/types'

const props = defineProps<{ spec: InfographicSpec }>()

const series = computed(() => props.spec.series || [])

const asBars = computed(() => series.value.map((item) => ({ label: item.label, value: item.value, color: item.color })))
const asLine = computed(() => series.value.map((item) => ({ label: item.label, value: item.value })))
</script>

<template>
  <figure class="info">
    <figcaption class="info__head">
      <h3>{{ spec.title }}</h3>
      <p v-if="spec.subtitle">{{ spec.subtitle }}</p>
    </figcaption>

    <div class="info__chart">
      <DonutChart v-if="spec.kind === 'donut'" :data="asBars" :unit="spec.unit" />

      <LineChart
        v-else-if="spec.kind === 'line' || spec.kind === 'timeline'"
        :data="asLine"
        :unit="spec.unit"
        :color="series[0]?.color || 'var(--brand)'"
      />

      <div v-else-if="spec.kind === 'stat'" class="info__stats">
        <div v-for="item in series" :key="item.label" class="info__stat" :style="{ '--stat-color': item.color }">
          <strong>{{ item.value.toLocaleString('es-EC') }}<em v-if="spec.unit">{{ spec.unit }}</em></strong>
          <span>{{ item.label }}</span>
          <small v-if="item.note">{{ item.note }}</small>
        </div>
      </div>

      <BarChart v-else :data="asBars" :unit="spec.unit" />
    </div>

    <ul v-if="spec.insights?.length" class="info__insights">
      <li v-for="insight in spec.insights" :key="insight">
        <i class="fa-solid fa-arrow-right-long" aria-hidden="true" />
        <span>{{ insight }}</span>
      </li>
    </ul>

    <p v-if="spec.source" class="info__source">Fuente: {{ spec.source }}</p>
  </figure>
</template>

<style scoped lang="scss">
.info {
  @include col(var(--s-4));
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
}

.info__head {
  @include col(2px);

  h3 {
    font-size: 18px;
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.info__stats {
  @include wrap(var(--s-3));
}

.info__stat {
  @include col(2px);
  flex: 1 1 140px;
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--stat-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--stat-color) 34%, transparent);

  strong {
    font-family: var(--font-display);
    font-size: 26px;
    color: var(--stat-color);

    em {
      font-size: 14px;
      font-style: normal;
      margin-inline-start: 3px;
    }
  }

  span {
    font-size: 13px;
    color: var(--text);
  }

  small {
    font-size: 11px;
    color: var(--text-dim);
  }
}

.info__insights {
  @include col(var(--s-2));
  list-style: none;

  li {
    @include row(var(--s-2), flex-start);
    font-size: 13px;
    color: var(--text-muted);

    i {
      margin-top: 4px;
      font-size: 10px;
      color: var(--brand);
    }
  }
}

.info__source {
  @include eyebrow;
  font-size: 10px;
}
</style>
