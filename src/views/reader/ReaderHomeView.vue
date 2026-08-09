<script setup lang="ts">
import { computed } from 'vue'
import { useReaderFeedStore, type FeedQuery } from '@/stores/readerFeed'
import { useSessionStore } from '@/stores/session'
import { formatIndicator } from '@/composables/useFormat'
import ContentCard from '@/components/reader/ContentCard.vue'
import CardSkeleton from '@/components/reader/CardSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Sparkline from '@/components/charts/Sparkline.vue'

const feed = useReaderFeedStore()
const session = useSessionStore()

// La portada muestra sólo la primera página de cada tipo; el resto vive en
// su propia ruta, con su propia caché.
const ARTICLES: FeedQuery = { kind: 'article' }
const UPDATES: FeedQuery = { kind: 'update' }

const articles = computed(() => feed.pageFor(ARTICLES))
const updates = computed(() => feed.pageFor(UPDATES))

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

// Se piden ya, no en `onMounted`: así el estado existe con `loading` en true
// antes del primer pintado y se ven los skeletons en vez de un vacío.
void feed.ensureBrief()
void feed.ensure(ARTICLES)
void feed.ensure(UPDATES)
</script>

<template>
  <div class="rport">
    <header class="rport__hero">
      <p class="rport__eyebrow">{{ greeting }}</p>
      <h1>{{ session.displayName }}</h1>
      <p class="rport__detail">Esto es lo último publicado para tu perfil.</p>
    </header>

    <!-- Indicadores del día -->
    <section v-if="feed.brief?.indicators?.length" class="rport__indicators">
      <article v-for="indicator in feed.brief.indicators" :key="indicator.code" class="rport__indicator">
        <div class="rport__indicator-head">
          <span>{{ indicator.name }}</span>
          <em v-if="indicator.deltaPercent !== null" :class="indicator.deltaPercent >= 0 ? 'is-up' : 'is-down'">
            <i :class="indicator.deltaPercent >= 0 ? 'fa-solid fa-caret-up' : 'fa-solid fa-caret-down'" />
            {{ Math.abs(indicator.deltaPercent).toFixed(1) }}%
          </em>
        </div>
        <strong :style="{ color: indicator.color }">
          {{ formatIndicator(indicator.value, indicator.format, indicator.unit) }}
        </strong>
        <Sparkline :values="indicator.history.map((point) => point.value)" :color="indicator.color" :height="26" />
      </article>
    </section>

    <!-- Reportajes -->
    <section class="rport__block">
      <header class="rport__block-head">
        <h2><i class="fa-solid fa-newspaper" aria-hidden="true" /> Reportajes</h2>
        <RouterLink v-if="articles.total > articles.items.length" to="/lector/reportajes">
          Ver los {{ articles.total }} <i class="fa-solid fa-arrow-right" aria-hidden="true" />
        </RouterLink>
      </header>

      <div v-if="articles.loading || !articles.fetchedAt" class="rport__items">
        <CardSkeleton v-for="index in 3" :key="index" />
      </div>

      <TransitionGroup v-else-if="articles.items.length" name="list" tag="div" class="rport__items">
        <ContentCard v-for="item in articles.items.slice(0, 5)" :key="item._id" :item="item" kind="article" />
      </TransitionGroup>

      <EmptyState
        v-else
        icon="fa-regular fa-newspaper"
        title="Sin reportajes"
        detail="Aún no hay reportajes publicados para tu perfil."
      />
    </section>

    <!-- Actualizaciones -->
    <section class="rport__block">
      <header class="rport__block-head">
        <h2><i class="fa-solid fa-bolt" aria-hidden="true" /> Actualizaciones</h2>
        <RouterLink v-if="updates.total > updates.items.length" to="/lector/actualizaciones">
          Ver las {{ updates.total }} <i class="fa-solid fa-arrow-right" aria-hidden="true" />
        </RouterLink>
      </header>

      <div v-if="updates.loading || !updates.fetchedAt" class="rport__items">
        <CardSkeleton v-for="index in 2" :key="index" />
      </div>

      <TransitionGroup v-else-if="updates.items.length" name="list" tag="div" class="rport__items">
        <ContentCard v-for="item in updates.items.slice(0, 4)" :key="item._id" :item="item" kind="update" />
      </TransitionGroup>

      <EmptyState
        v-else
        icon="fa-solid fa-bolt"
        title="Sin actualizaciones"
        detail="Aquí aparecerán los seguimientos de los reportajes."
      />
    </section>
  </div>
</template>

<style scoped lang="scss">
.rport {
  @include col(var(--s-7));
}

.rport__hero {
  @include col(2px);

  h1 {
    font-family: var(--font-display);
    font-size: 32px;
    color: var(--text-strong);
  }
}

.rport__eyebrow {
  @include eyebrow;
}

.rport__detail {
  font-size: 14px;
  color: var(--text-muted);
}

.rport__indicators {
  @include wrap(var(--s-3));
}

.rport__indicator {
  @include col(var(--s-2));
  flex: 1 1 165px;
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--surface-raised);
  border: 1px solid var(--line);

  strong {
    font-family: var(--font-display);
    font-size: 20px;
  }
}

.rport__indicator-head {
  @include row(var(--s-2), center, space-between);
  @include eyebrow;
  font-size: 10px;

  em {
    font-style: normal;
    font-family: var(--font-mono);
  }

  .is-up {
    color: var(--moss);
  }
  .is-down {
    color: var(--danger);
  }
}

.rport__block {
  @include col(var(--s-4));
}

.rport__block-head {
  @include row(var(--s-3), center, space-between);
  padding-bottom: var(--s-2);
  border-bottom: 1px solid var(--line);

  h2 {
    @include row(var(--s-2), center);
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--text-strong);

    i {
      font-size: 13px;
      color: var(--text-dim);
    }
  }

  a {
    @include row(var(--s-2), center);
    @include eyebrow;
    font-size: 10px;
    color: var(--text-muted);

    &:hover {
      color: var(--brand-strong);
    }
  }
}

.rport__items {
  @include col(var(--s-3));
  position: relative;
}
</style>
