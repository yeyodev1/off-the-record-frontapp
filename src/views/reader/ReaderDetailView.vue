<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useReaderFeedStore } from '@/stores/readerFeed'
import ContentReader from '@/components/content/ContentReader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import CardSkeleton from '@/components/reader/CardSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { ContentItem, ContentKind } from '@/types'

const route = useRoute()
const router = useRouter()
const feed = useReaderFeedStore()

const kind: ContentKind = route.params.kind === 'reportajes' ? 'article' : 'update'
const id = String(route.params.id || '')

// Si ya se leyó antes, se pinta al instante y no hay skeleton.
const item = ref<ContentItem | null>(feed.cachedDetail(kind, id))
const loading = ref(!item.value)
const error = ref('')
const openedAt = ref(Date.now())

async function reportRead(completed = false) {
  if (!item.value) return
  const seconds = Math.round((Date.now() - openedAt.value) / 1000)
  if (seconds < 2) return

  try {
    await contentApi.registerRead(kind, id, seconds, completed)
  } catch {
    /* la métrica nunca interrumpe la lectura */
  }
}

function onHidden() {
  if (document.visibilityState === 'hidden') void reportRead()
}

function goBack() {
  // Volver a la lista de la que se venía; si se entró por enlace, a la portada.
  if (window.history.length > 1) router.back()
  else void router.push('/lector')
}

onMounted(async () => {
  try {
    item.value = await feed.ensureDetail(kind, id)
    openedAt.value = Date.now()
    document.addEventListener('visibilitychange', onHidden)
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'No pudimos abrir esta lectura.')
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onHidden)
  void reportRead(true)
})
</script>

<template>
  <div class="rdetail">
    <AppButton variant="ghost" size="sm" icon="fa-solid fa-arrow-left" @click="goBack">Volver</AppButton>

    <div v-if="loading" class="rdetail__skeleton">
      <CardSkeleton v-for="index in 3" :key="index" />
    </div>

    <EmptyState v-else-if="error" icon="fa-solid fa-triangle-exclamation" title="No disponible" :detail="error" />

    <div v-else-if="item" class="rdetail__body">
      <ContentReader :item="item" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.rdetail {
  @include col(var(--s-5));
}

.rdetail__skeleton {
  @include col(var(--s-3));
}

.rdetail__body {
  @include row(0, flex-start, center);
}
</style>
