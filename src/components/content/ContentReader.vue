<script setup lang="ts">
import { computed, ref } from 'vue'
import ImageLightbox from '@/components/content/ImageLightbox.vue'
import InfographicView from '@/components/charts/InfographicView.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { formatDate, formatNumber } from '@/composables/useFormat'
import type { ContentBlock, ContentItem, InfographicSpec, LightboxImage } from '@/types'

const props = defineProps<{ item: ContentItem; compact?: boolean }>()

const blocks = computed(() => props.item.blocks || [])

/* ------------------------------------------------------------------ */
/* Visor de imágenes                                                   */
/* ------------------------------------------------------------------ */

const visorIndice = ref(-1)
const visorAbierto = computed(() => visorIndice.value >= 0)

/**
 * Todas las imágenes del artículo, en orden de lectura. Incluye tanto los
 * bloques de imagen como las que vienen dentro del HTML de un bloque (el
 * contenido migrado las trae así), para poder pasar de una a otra en el visor.
 */
const imagenes = computed<LightboxImage[]>(() => {
  const lista: LightboxImage[] = []

  for (const block of blocks.value) {
    if (block.kind === 'media' && block.assetKind === 'image' && block.assetUrl) {
      lista.push({ src: block.assetUrl, caption: block.caption || props.item.title })
      continue
    }

    for (const match of String(block.html || '').matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)) {
      if (match[1]) lista.push({ src: match[1], caption: props.item.title })
    }
  }

  // Sin repetidas: la misma foto dos veces confundiría al navegar.
  const vistas = new Set<string>()
  return lista.filter((img) => (vistas.has(img.src) ? false : vistas.add(img.src)))
})

function abrir(src: string) {
  const indice = imagenes.value.findIndex((img) => img.src === src)
  visorIndice.value = indice >= 0 ? indice : 0
}

/** Las imágenes dentro de `v-html` no llevan escuchador propio: se delega. */
function alClicEnCuerpo(event: MouseEvent) {
  const destino = event.target as HTMLElement
  if (destino?.tagName !== 'IMG') return

  const src = (destino as HTMLImageElement).src
  if (src) abrir(src)
}

function styleOf(block: ContentBlock) {
  return {
    textAlign: block.align,
    paddingInlineStart: block.indent ? `${block.indent * 24}px` : undefined,
    lineHeight: String(block.lineHeight || 1.7),
    fontFamily: block.fontFamily || undefined,
    fontSize: block.fontSize || undefined,
    color: block.kind === 'paragraph' && block.color ? block.color : undefined,
  }
}

function specOf(block: ContentBlock) {
  return block.meta as unknown as InfographicSpec
}
</script>

<template>
  <article :class="['reader', { 'reader--compact': compact }]">
    <header class="reader__head" :style="{ '--accent': item.accentColor }">
      <div class="reader__meta">
        <AppBadge v-if="item.categoryName" :color="item.accentColor">{{ item.categoryName }}</AppBadge>
        <span>{{ formatDate(item.publishedAt || item.createdAt) }}</span>
        <span v-if="item.readingMinutes">· {{ item.readingMinutes }} min de lectura</span>
        <span v-if="item.stats?.views">· {{ formatNumber(item.stats.views) }} lecturas</span>
      </div>

      <p v-if="item.kicker" class="reader__kicker">{{ item.kicker }}</p>
      <h1>{{ item.title }}</h1>
      <p v-if="item.summary" class="reader__summary">{{ item.summary }}</p>

      <p class="reader__byline">
        <i class="fa-solid fa-pen-nib" aria-hidden="true" />
        {{ item.authorName || 'Redacción Off The Record' }}
      </p>
    </header>

    <div class="reader__body otr-prose" @click="alClicEnCuerpo">
      <template v-for="block in blocks" :key="block.uid">
        <hr
          v-if="block.kind === 'divider'"
          class="otr-divider"
          :style="{ borderColor: block.color || 'var(--line-strong)' }"
        />

        <h3
          v-else-if="block.kind === 'intertitle' || block.kind === 'subheading'"
          class="otr-intertitle"
          :style="{ ...styleOf(block), '--otr-accent': block.color || 'var(--brand)' }"
          v-html="block.html || block.text"
        />

        <h2 v-else-if="block.kind === 'heading'" :style="styleOf(block)" v-html="block.html || block.text" />

        <blockquote
          v-else-if="block.kind === 'quote'"
          :style="{ ...styleOf(block), borderInlineStartColor: block.color || 'var(--brand)' }"
          v-html="block.html || block.text"
        />

        <aside
          v-else-if="block.kind === 'callout'"
          class="otr-callout"
          :style="{
            ...styleOf(block),
            background: block.background || 'rgba(255,255,255,0.03)',
            borderInlineStartColor: block.color || 'var(--gold)',
          }"
          v-html="block.html || block.text"
        />

        <component
          :is="block.ordered ? 'ol' : 'ul'"
          v-else-if="block.kind === 'list'"
          :style="styleOf(block)"
        >
          <li v-for="(entry, index) in block.items.filter(Boolean)" :key="index">{{ entry }}</li>
        </component>

        <figure v-else-if="block.kind === 'media' && block.assetUrl" class="otr-media">
          <img
            v-if="block.assetKind === 'image'"
            :src="block.assetUrl"
            :alt="block.caption"
            class="otr-zoomable"
            loading="lazy"
            @click="abrir(block.assetUrl)"
          />
          <video v-else-if="block.assetKind === 'video'" :src="block.assetUrl" controls preload="metadata" />
          <audio v-else-if="block.assetKind === 'audio'" :src="block.assetUrl" controls preload="none" />
          <a v-else :href="block.assetUrl" target="_blank" rel="noreferrer">
            <i class="fa-regular fa-file-lines" aria-hidden="true" /> {{ block.caption || 'Documento adjunto' }}
          </a>
          <figcaption v-if="block.caption && block.assetKind !== 'document'">{{ block.caption }}</figcaption>
        </figure>

        <InfographicView
          v-else-if="(block.kind === 'infographic' || block.kind === 'chart') && specOf(block)?.series?.length"
          :spec="specOf(block)"
        />

        <div v-else :style="styleOf(block)" v-html="block.html || `<p>${block.text}</p>`" />
      </template>
    </div>

    <ImageLightbox
      v-if="visorAbierto"
      :images="imagenes"
      :index="visorIndice"
      @update:index="visorIndice = $event"
      @close="visorIndice = -1"
    />

    <footer v-if="item.attachments?.length" class="reader__attachments">
      <p class="reader__attachments-title"><i class="fa-solid fa-paperclip" aria-hidden="true" /> Material adjunto</p>
      <ul>
        <li v-for="asset in item.attachments" :key="asset.uid">
          <a :href="asset.url" target="_blank" rel="noreferrer">
            <i
              :class="{
                'fa-regular fa-image': asset.kind === 'image',
                'fa-solid fa-film': asset.kind === 'video',
                'fa-solid fa-headphones': asset.kind === 'audio',
                'fa-regular fa-file-lines': asset.kind === 'document',
              }"
              aria-hidden="true"
            />
            {{ asset.name || asset.url }}
          </a>
        </li>
      </ul>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.reader {
  @include col(var(--s-6));
  max-width: 760px;
  width: 100%;
}

.reader__head {
  @include col(var(--s-3));
  padding-bottom: var(--s-5);
  border-bottom: 2px solid var(--accent, var(--brand));

  h1 {
    font-size: clamp(28px, 5vw, 44px);
    line-height: 1.1;
  }
}

.reader__meta {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
  @include eyebrow;
  font-size: 11px;
}

.reader__kicker {
  @include eyebrow;
  color: var(--accent, var(--brand));
  font-size: 11px;
}

.reader__summary {
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1.6;
  color: var(--text-muted);
}

.reader__byline {
  @include row(var(--s-2), center);
  font-size: 13px;
  color: var(--text-dim);

  i {
    font-size: 11px;
    color: var(--accent, var(--brand));
  }
}

.reader__body {
  @include col(0);
}

.reader__divider-label {
  @include eyebrow;
  text-align: center;
}

.reader__attachments {
  @include col(var(--s-3));
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);

  ul {
    @include col(var(--s-2));
    list-style: none;
  }

  a {
    @include row(var(--s-3), center);
    font-size: 14px;
    color: var(--text-muted);

    i {
      width: 16px;
      color: var(--brand);
    }

    &:hover {
      color: var(--text);
    }
  }
}

.reader__attachments-title {
  @include row(var(--s-2), center);
  @include eyebrow;
}

.reader--compact {
  .reader__head h1 {
    font-size: clamp(22px, 4vw, 30px);
  }
}
</style>
