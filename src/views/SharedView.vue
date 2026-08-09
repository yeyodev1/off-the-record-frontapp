<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { contentApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import ContentReader from '@/components/content/ContentReader.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { ContentItem } from '@/types'

const route = useRoute()
const item = ref<ContentItem | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  const kind = route.params.kind === 'r' ? 'article' : 'update'
  const token = String(route.params.token || '')

  try {
    const { data } = await contentApi.shared(kind, token)
    item.value = data
  } catch (caught) {
    error.value = apiErrorMessage(caught, 'Este enlace ya no está disponible.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="shared">
    <header class="shared__bar">
      <RouterLink class="shared__brand" to="/">
        <img src="/otr.svg" alt="" width="30" height="30" />
        <span>Off The Record</span>
      </RouterLink>
      <span class="shared__tag"><i class="fa-solid fa-lock" aria-hidden="true" /> Enlace privado</span>
    </header>

    <main class="shared__main">
      <AppSkeleton v-if="loading" :rows="5" height="72px" />
      <EmptyState v-else-if="error" icon="fa-solid fa-link-slash" title="Enlace no disponible" :detail="error" />
      <ContentReader v-else-if="item" :item="item" />
    </main>

    <footer class="shared__foot">
      Contenido confidencial de Off The Record. No reenviar sin autorización.
    </footer>
  </div>
</template>

<style scoped lang="scss">
.shared {
  @include col(0);
  min-height: 100vh;
}

.shared__bar {
  @include row(var(--s-3), center, space-between);
  padding: var(--s-4) var(--s-6);
  border-bottom: 1px solid var(--line);
  background: var(--glass);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.shared__brand {
  @include row(var(--s-3), center);
  font-family: var(--font-display);
  font-size: 15px;
}

.shared__tag {
  @include row(var(--s-2), center);
  @include eyebrow;
  font-size: 10px;
  color: var(--gold);
}

.shared__main {
  @include row(0, flex-start, center);
  flex: 1;
  padding: var(--s-8) var(--s-6);

  @include mobile {
    padding: var(--s-5) var(--s-4);
  }
}

.shared__foot {
  padding: var(--s-5) var(--s-6);
  border-top: 1px solid var(--line);
  @include eyebrow;
  font-size: 10px;
  text-align: center;
}
</style>
