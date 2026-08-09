<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { contentApi, notificationsApi, receiptsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { formatDate, formatRelative } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ReceiptsDrawer from '@/components/content/ReceiptsDrawer.vue'
import type { AppNotification, ContentItem, ContentKind } from '@/types'

const toasts = useToastStore()

const source = ref<'article' | 'update' | 'notification'>('article')
const articles = ref<ContentItem[]>([])
const updates = ref<ContentItem[]>([])
const notifications = ref<AppNotification[]>([])
const inactive = ref<
  { userId: string; name: string; email: string; organization: string; categoryNames: string[]; lastLoginAt: string | null }[]
>([])
const loading = ref(true)

const drawerOpen = ref(false)
const drawerKind = ref<ContentKind>('article')
const drawerContentId = ref('')
const drawerNotificationId = ref('')
const drawerTitle = ref('')

const tabs = computed(() => [
  { value: 'article', label: 'Reportajes', icon: 'fa-solid fa-newspaper', count: articles.value.length },
  { value: 'update', label: 'Actualizaciones', icon: 'fa-solid fa-bolt', count: updates.value.length },
  { value: 'notification', label: 'Notificaciones', icon: 'fa-solid fa-bell', count: notifications.value.length },
])

const rows = computed(() => {
  if (source.value === 'notification') return notifications.value
  return source.value === 'article' ? articles.value : updates.value
})

async function load() {
  loading.value = true
  try {
    const [articleList, updateList, notificationList, inactiveList] = await Promise.all([
      contentApi.list('article', { status: 'published' }),
      contentApi.list('update', { status: 'published' }),
      notificationsApi.list('sent'),
      receiptsApi.inactive(14),
    ])

    articles.value = articleList.data
    updates.value = updateList.data
    notifications.value = notificationList.data
    inactive.value = inactiveList.data
  } catch (error) {
    toasts.error('No pudimos cargar los acuses', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function openContent(item: ContentItem) {
  drawerNotificationId.value = ''
  drawerKind.value = source.value === 'update' ? 'update' : 'article'
  drawerContentId.value = item._id
  drawerTitle.value = item.title
  drawerOpen.value = true
}

function openNotification(item: AppNotification) {
  drawerContentId.value = ''
  drawerNotificationId.value = item._id
  drawerTitle.value = item.title
  drawerOpen.value = true
}

watch(source, () => {
  drawerOpen.value = false
})

onMounted(load)
</script>

<template>
  <div class="rec">
    <PageHeader
      eyebrow="Superadministración"
      title="Acuses de lectura"
      detail="Quién vio y quién no cada reportaje, actualización o notificación enviada."
      icon="fa-solid fa-eye"
    >
      <template #actions>
        <AppButton variant="outline" icon="fa-solid fa-rotate" @click="load">Actualizar</AppButton>
      </template>
    </PageHeader>

    <AppTabs v-model="source" :items="tabs" />

    <AppSkeleton v-if="loading" :rows="5" height="72px" />

    <template v-else>
      <AppPanel
        :title="source === 'notification' ? 'Notificaciones enviadas' : 'Contenido publicado'"
        detail="Selecciona una pieza para ver el detalle persona por persona"
        icon="fa-solid fa-list-check"
      >
        <div v-if="rows.length" class="rec__list">
          <template v-if="source === 'notification'">
            <article
              v-for="item in notifications"
              :key="item._id"
              class="rec__row"
              @click="openNotification(item)"
            >
              <span class="rec__icon"><i class="fa-solid fa-bell" /></span>
              <div class="rec__main">
                <strong>{{ item.title }}</strong>
                <span>{{ item.message }}</span>
              </div>
              <div class="rec__stats">
                <AppBadge tone="moss">{{ item.readBy.length }} leídas</AppBadge>
                <AppBadge tone="neutral">{{ item.deliveredCount }} enviadas</AppBadge>
                <span>{{ formatRelative(item.sentAt) }}</span>
              </div>
              <i class="fa-solid fa-chevron-right rec__chevron" />
            </article>
          </template>

          <template v-else>
            <article
              v-for="item in rows as ContentItem[]"
              :key="item._id"
              class="rec__row"
              :style="{ '--accent': item.accentColor }"
              @click="openContent(item)"
            >
              <span class="rec__icon" :style="{ color: item.accentColor, background: `${item.accentColor}22` }">
                <i :class="source === 'article' ? 'fa-solid fa-newspaper' : 'fa-solid fa-bolt'" />
              </span>
              <div class="rec__main">
                <strong>{{ item.title }}</strong>
                <span>{{ item.categoryName || 'Sin sección' }} · {{ formatDate(item.publishedAt) }}</span>
              </div>
              <div class="rec__stats">
                <AppBadge tone="moss">{{ item.stats?.uniqueViews || 0 }} lectores</AppBadge>
                <AppBadge tone="neutral">{{ item.stats?.views || 0 }} lecturas</AppBadge>
                <span v-if="item.share?.enabled">{{ item.share.visits }} por enlace</span>
              </div>
              <i class="fa-solid fa-chevron-right rec__chevron" />
            </article>
          </template>
        </div>

        <EmptyState v-else icon="fa-solid fa-eye" title="Nada publicado todavía" />
      </AppPanel>

      <AppPanel
        title="Lectores sin actividad"
        detail="Sin abrir contenido en los últimos 14 días"
        icon="fa-solid fa-user-clock"
        tone="var(--gold)"
      >
        <div v-if="inactive.length" class="rec__inactive">
          <article v-for="person in inactive" :key="person.userId">
            <div>
              <strong>{{ person.name || person.email }}</strong>
              <span>{{ person.email }}</span>
              <span v-if="person.organization" class="rec__org">{{ person.organization }}</span>
            </div>
            <span class="rec__last">
              {{ person.lastLoginAt ? `último ingreso ${formatRelative(person.lastLoginAt)}` : 'nunca ingresó' }}
            </span>
          </article>
        </div>

        <EmptyState v-else icon="fa-solid fa-circle-check" title="Todos activos" detail="Nadie lleva 14 días sin leer." />
      </AppPanel>
    </template>

    <ReceiptsDrawer
      v-model="drawerOpen"
      :kind="drawerKind"
      :content-id="drawerContentId"
      :notification-id="drawerNotificationId"
      :title="drawerTitle"
    />
  </div>
</template>

<style scoped lang="scss">
.rec {
  @include col(var(--s-5));
}

.rec__list {
  @include col(var(--s-2));
}

.rec__row {
  @include row(var(--s-3), center);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  cursor: pointer;
  transition:
    border-color var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease);

  &:hover {
    border-color: var(--line-strong);
    background: var(--surface-hover);

    .rec__chevron {
      transform: translateX(3px);
      color: var(--brand);
    }
  }

  @include mobile {
    flex-wrap: wrap;
  }
}

.rec__icon {
  @include row(0, center, center);
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  background: var(--iris-soft);
  color: #a99bff;
  font-size: 13px;
}

.rec__main {
  @include col(2px);
  flex: 1;
  min-width: 0;

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

.rec__stats {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
  flex-shrink: 0;

  span {
    @include eyebrow;
    font-size: 9px;
  }
}

.rec__chevron {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-dim);
  transition:
    transform var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);
}

.rec__inactive {
  @include col(var(--s-2));

  article {
    @include row(var(--s-3), center, space-between);
    padding: var(--s-3);
    border-radius: var(--r-sm);
    background: var(--surface-sunken);
    border: 1px solid var(--line);

    div {
      @include col(1px);
      min-width: 0;
    }

    strong {
      font-size: 14px;
    }

    span {
      font-size: 12px;
      color: var(--text-dim);
      @include truncate;
    }
  }
}

.rec__org {
  color: var(--text-muted) !important;
}

.rec__last {
  @include eyebrow;
  font-size: 9px;
  flex-shrink: 0;
  color: var(--gold) !important;
}
</style>
