<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '@/composables/useFormat'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { ContentItem } from '@/types'

const props = defineProps<{ item: ContentItem; kind: 'article' | 'update' }>()

const to = computed(
  () => `/lector/${props.kind === 'update' ? 'actualizaciones' : 'reportajes'}/${props.item._id}`,
)

const ASSET_ICONS: Record<string, string> = {
  image: 'fa-regular fa-image',
  video: 'fa-solid fa-film',
  audio: 'fa-solid fa-headphones',
  document: 'fa-regular fa-file-lines',
}
</script>

<template>
  <RouterLink
    class="rcard"
    :to="to"
    data-cuelume-hover="whisper"
    data-cuelume-press="press"
    data-cuelume-release="page"
    :style="{ '--accent': item.accentColor }"
  >
    <span class="rcard__accent" />

    <!-- Portada: viene ya resuelta del servidor, sin traer los bloques. -->
    <figure v-if="item.coverUrl" class="rcard__cover">
      <img :src="item.coverUrl" :alt="item.title" loading="lazy" decoding="async" />
    </figure>

    <div class="rcard__main">
      <div class="rcard__meta">
        <AppBadge v-if="item.categoryName" :color="item.accentColor">{{ item.categoryName }}</AppBadge>
        <span>{{ formatDate(item.publishedAt) }}</span>
        <span v-if="item.readingMinutes">· {{ item.readingMinutes }} min</span>
        <span v-if="item.priority === 'breaking'" class="rcard__flag">Última hora</span>
      </div>

      <h2>{{ item.title }}</h2>
      <p v-if="item.summary">{{ item.summary }}</p>

      <div class="rcard__foot">
        <span v-for="name in (item.tags || []).slice(0, 3)" :key="name" class="rcard__tag">#{{ name }}</span>

        <span v-if="item.attachments?.length" class="rcard__assets">
          <i
            v-for="asset in item.attachments.slice(0, 4)"
            :key="asset.uid"
            :class="ASSET_ICONS[asset.kind] || 'fa-regular fa-file'"
            aria-hidden="true"
          />
        </span>
      </div>
    </div>

    <i class="rcard__arrow fa-solid fa-arrow-right" aria-hidden="true" />
  </RouterLink>
</template>

<style scoped lang="scss">
.rcard {
  position: relative;
  @include row(var(--s-4), center);
  padding: var(--s-4);
  padding-inline-start: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  overflow: hidden;
  transition:
    transform var(--t-base) var(--ease),
    border-color var(--t-base) var(--ease);

  &:hover {
    transform: translateX(4px);
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);

    .rcard__arrow {
      opacity: 1;
      transform: translateX(0);
    }

    .rcard__cover img {
      transform: scale(1.06);
    }
  }
}

.rcard__accent {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 4px;
  background: var(--accent, var(--brand));
}

.rcard__cover {
  flex: 0 0 auto;
  width: 132px;
  height: 92px;
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--surface-sunken);
  border: 1px solid var(--line);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform var(--t-slow) var(--ease);
  }

  @include mobile {
    width: 84px;
    height: 68px;
  }
}

.rcard__main {
  @include col(var(--s-2));
  flex: 1;
  min-width: 0;

  h2 {
    font-size: 19px;
  }

  p {
    font-size: 14px;
    color: var(--text-muted);
    @include truncate(2);
  }
}

.rcard__meta {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
  @include eyebrow;
  font-size: 10px;
}

.rcard__flag {
  padding: 2px 8px;
  border-radius: var(--r-pill);
  background: color-mix(in srgb, var(--danger) 18%, transparent);
  color: var(--danger);
}

.rcard__foot {
  @include row(var(--s-3), center);
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
}

.rcard__tag {
  color: var(--text-dim);
}

.rcard__assets {
  @include row(var(--s-2), center);
  margin-inline-start: auto;
  font-size: 11px;
}

.rcard__arrow {
  flex-shrink: 0;
  color: var(--accent, var(--brand));
  opacity: 0;
  transform: translateX(-6px);
  transition:
    opacity var(--t-base) var(--ease),
    transform var(--t-base) var(--ease);

  @include mobile {
    display: none;
  }
}
</style>
