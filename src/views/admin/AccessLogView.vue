<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { analyticsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { ROLE_LABELS } from '@/config/navigation'
import { formatDateTime, formatRelative } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { AccessLogEntry } from '@/types'

const toasts = useToastStore()
const entries = ref<AccessLogEntry[]>([])
const loading = ref(true)
const filter = ref('')

const ACTION_META: Record<string, { label: string; tone: string; icon: string }> = {
  login: { label: 'Ingreso', tone: 'moss', icon: 'fa-solid fa-right-to-bracket' },
  logout: { label: 'Salida', tone: 'neutral', icon: 'fa-solid fa-right-from-bracket' },
  failed: { label: 'Fallido', tone: 'danger', icon: 'fa-solid fa-triangle-exclamation' },
  refresh: { label: 'Renovación', tone: 'ocean', icon: 'fa-solid fa-rotate' },
}

const tabs = computed(() => [
  { value: '', label: 'Todo', icon: 'fa-solid fa-list', count: entries.value.length },
  { value: 'login', label: 'Ingresos', icon: 'fa-solid fa-right-to-bracket', count: entries.value.filter((e) => e.action === 'login').length },
  { value: 'failed', label: 'Fallidos', icon: 'fa-solid fa-triangle-exclamation', count: entries.value.filter((e) => e.action === 'failed').length },
  { value: 'logout', label: 'Salidas', icon: 'fa-solid fa-right-from-bracket' },
])

const filtered = computed(() =>
  filter.value ? entries.value.filter((entry) => entry.action === filter.value) : entries.value,
)

async function load() {
  loading.value = true
  try {
    const { data } = await analyticsApi.accessLog(150)
    entries.value = data
  } catch (error) {
    toasts.error('No pudimos cargar el registro', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="access">
    <PageHeader
      eyebrow="Seguridad"
      title="Registro de accesos"
      detail="Cada ingreso, salida e intento fallido queda registrado con IP y dispositivo."
      icon="fa-solid fa-shield-halved"
    >
      <template #actions>
        <AppButton variant="outline" icon="fa-solid fa-rotate" @click="load">Actualizar</AppButton>
      </template>
    </PageHeader>

    <AppTabs v-model="filter" :items="tabs" />

    <AppSkeleton v-if="loading" :rows="6" height="62px" />

    <AppPanel v-else-if="filtered.length" title="Movimientos recientes" icon="fa-solid fa-clock-rotate-left">
      <TransitionGroup name="list" tag="div" class="access__list">
        <article v-for="entry in filtered" :key="entry._id" class="entry">
          <span :class="['entry__icon', `entry__icon--${entry.action}`]">
            <i :class="ACTION_META[entry.action]?.icon || 'fa-solid fa-circle'" />
          </span>

          <div class="entry__main">
            <div class="entry__title">
              <strong>{{ entry.userName || entry.email || 'Desconocido' }}</strong>
              <AppBadge :tone="(ACTION_META[entry.action]?.tone as never) || 'neutral'">
                {{ ACTION_META[entry.action]?.label || entry.action }}
              </AppBadge>
              <AppBadge v-if="entry.roleId" tone="neutral">{{ ROLE_LABELS[entry.roleId] }}</AppBadge>
            </div>

            <p v-if="entry.reason" class="entry__reason">{{ entry.reason }}</p>
            <p class="entry__agent">{{ entry.userAgent || 'Agente desconocido' }}</p>
          </div>

          <div class="entry__side">
            <span>{{ formatDateTime(entry.at) }}</span>
            <span>{{ formatRelative(entry.at) }}</span>
            <span v-if="entry.ip">{{ entry.ip }}</span>
          </div>
        </article>
      </TransitionGroup>
    </AppPanel>

    <EmptyState v-else icon="fa-solid fa-shield-halved" title="Sin movimientos" detail="Aún no hay registros de acceso." />
  </div>
</template>

<style scoped lang="scss">
.access {
  @include col(var(--s-5));
}

.access__list {
  @include col(var(--s-2));
  position: relative;
}

.entry {
  @include row(var(--s-3), center);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);

  @include mobile {
    flex-wrap: wrap;
  }
}

.entry__icon {
  @include row(0, center, center);
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-dim);
  font-size: 12px;
}

.entry__icon--login {
  background: var(--moss-soft);
  color: var(--moss);
}
.entry__icon--failed {
  background: var(--danger-soft);
  color: var(--danger);
}

.entry__main {
  @include col(2px);
  flex: 1;
  min-width: 0;
}

.entry__title {
  @include row(var(--s-2), center);
  flex-wrap: wrap;

  strong {
    font-size: 14px;
  }
}

.entry__reason {
  font-size: 12px;
  color: var(--danger);
}

.entry__agent {
  font-size: 11px;
  color: var(--text-dim);
  @include truncate;
}

.entry__side {
  @include col(1px, flex-end);
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
  text-align: end;
}
</style>
