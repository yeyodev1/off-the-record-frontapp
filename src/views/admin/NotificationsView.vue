<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { catalogApi, contentApi, notificationsApi, settingsApi, usersApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { useSessionStore } from '@/stores/session'
import { ROLE_LABELS } from '@/config/navigation'
import { formatDateTime, formatRelative } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppField from '@/components/ui/AppField.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ReceiptsDrawer from '@/components/content/ReceiptsDrawer.vue'
import AutoRulesPanel from '@/components/admin/AutoRulesPanel.vue'
import ChannelsPanel from '@/components/admin/ChannelsPanel.vue'
import type { AppNotification, AppUser, Category, ChannelStatus, ContentItem, MessagingSettings } from '@/types'

const toasts = useToastStore()
const session = useSessionStore()

const notifications = ref<AppNotification[]>([])
const settings = ref<MessagingSettings | null>(null)
const channelStatus = ref<{ telegram: ChannelStatus; signal: ChannelStatus } | null>(null)
const view = ref<'lista' | 'automaticas' | 'canales'>('lista')

const VIEW_TABS = [
  { value: 'lista', label: 'Enviadas', icon: 'fa-solid fa-paper-plane' },
  { value: 'automaticas', label: 'Automáticas', icon: 'fa-solid fa-robot' },
  { value: 'canales', label: 'Integraciones', icon: 'fa-solid fa-plug' },
]

/** Solo el admin toca integraciones; el editor las ve. */
const canEditSettings = computed(() => session.isAdmin)

async function loadSettings() {
  try {
    const { data } = await settingsApi.read()
    settings.value = data
  } catch {
    /* sin ajustes el resto de la vista sigue funcionando */
  }
}

async function loadChannelStatus() {
  try {
    const { data } = await settingsApi.channels()
    channelStatus.value = data
  } catch {
    /* el semáforo es informativo */
  }
}

/** Guarda un cambio suelto de las reglas automáticas. */
async function patchSettings(patch: Record<string, unknown>) {
  try {
    const { data } = await settingsApi.save(patch)
    settings.value = data
    toasts.success('Reglas actualizadas')
  } catch (error) {
    toasts.error('No se pudo guardar', apiErrorMessage(error))
  }
}
const categories = ref<Category[]>([])
const users = ref<AppUser[]>([])
const articles = ref<ContentItem[]>([])
const loading = ref(true)
const statusFilter = ref('')

const formOpen = ref(false)
const saving = ref(false)
const formError = ref('')

const confirmOpen = ref(false)
const deleting = ref(false)
const target = ref<AppNotification | null>(null)

const receiptsOpen = ref(false)
const receiptsTarget = ref<AppNotification | null>(null)

const form = reactive({
  title: '',
  message: '',
  channel: 'app' as 'app' | 'signal' | 'email',
  audience: 'all' as 'all' | 'role' | 'category' | 'users',
  roleId: 2,
  categoryId: '',
  userIds: [] as string[],
  targetType: 'none' as 'article' | 'update' | 'none',
  targetId: '',
  link: '',
  scheduledFor: '',
  sendNow: true,
})

const CHANNEL_OPTIONS = [
  { value: 'app', label: 'En la plataforma', icon: 'fa-solid fa-bell' },
  { value: 'signal', label: 'Signal', icon: 'fa-brands fa-signal-messenger' },
  { value: 'email', label: 'Correo', icon: 'fa-regular fa-envelope' },
]

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Toda la audiencia', icon: 'fa-solid fa-users' },
  { value: 'role', label: 'Por rol', icon: 'fa-solid fa-user-shield' },
  { value: 'category', label: 'Por categoría', icon: 'fa-solid fa-layer-group' },
  { value: 'users', label: 'Personas específicas', icon: 'fa-solid fa-user-check' },
]

const ROLE_OPTIONS = [
  { value: 2, label: 'Lectores' },
  { value: 3, label: 'Editores' },
  { value: 1, label: 'Administradores' },
]

const TIMING_OPTIONS = [
  { value: true, label: 'Enviar ahora', icon: 'fa-solid fa-paper-plane' },
  { value: false, label: 'Programar', icon: 'fa-regular fa-clock' },
]

const categoryOptions = computed(() =>
  categories.value.map((category) => ({ value: category._id, label: category.name, color: category.color })),
)

const articleOptions = computed(() => [
  { value: '', label: 'Sin relación' },
  ...articles.value.map((article) => ({ value: article._id, label: article.title })),
])

const statusTabs = computed(() => [
  { value: '', label: 'Todas', icon: 'fa-solid fa-list', count: notifications.value.length },
  { value: 'sent', label: 'Enviadas', icon: 'fa-solid fa-paper-plane' },
  { value: 'scheduled', label: 'Programadas', icon: 'fa-regular fa-clock' },
  { value: 'draft', label: 'Borradores', icon: 'fa-regular fa-pen-to-square' },
])

const filtered = computed(() =>
  statusFilter.value ? notifications.value.filter((item) => item.status === statusFilter.value) : notifications.value,
)

const audienceLabel = (item: AppNotification) => {
  if (item.audience === 'all') return 'Toda la audiencia'
  if (item.audience === 'role') return `Rol: ${ROLE_LABELS[item.roleId || 0] || '—'}`
  if (item.audience === 'category') return categories.value.find((c) => c._id === item.categoryId)?.name || 'Categoría'
  return `${item.userIds.length} personas`
}

async function load() {
  loading.value = true
  try {
    const [list, cats, userList, articleList] = await Promise.all([
      notificationsApi.list(),
      catalogApi.categories('audience'),
      usersApi.list().catch(() => ({ data: [] as AppUser[] })),
      contentApi.list('article', {}),
    ])
    notifications.value = list.data
    categories.value = cats.data
    users.value = userList.data
    articles.value = articleList.data
  } catch (error) {
    toasts.error('No pudimos cargar las notificaciones', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, {
    title: '',
    message: '',
    channel: 'app',
    audience: 'all',
    roleId: 2,
    categoryId: '',
    userIds: [],
    targetType: 'none',
    targetId: '',
    link: '',
    scheduledFor: '',
    sendNow: true,
  })
  formError.value = ''
  formOpen.value = true
}

function setTarget(value: string | number | boolean) {
  form.targetId = String(value)
  form.targetType = form.targetId ? 'article' : 'none'
}

function toggleUser(id: string) {
  form.userIds = form.userIds.includes(id) ? form.userIds.filter((item) => item !== id) : [...form.userIds, id]
}

async function submit() {
  formError.value = ''

  if (!form.title.trim() || !form.message.trim()) {
    formError.value = 'El título y el mensaje son obligatorios.'
    return
  }

  if (!form.sendNow && !form.scheduledFor) {
    formError.value = 'Elige la fecha de envío o marca «enviar ahora».'
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form,
      scheduledFor: form.sendNow ? null : new Date(form.scheduledFor).toISOString(),
    }
    const { data, message } = await notificationsApi.create(payload as never)
    notifications.value = [data, ...notifications.value]
    toasts.success(message, `${data.deliveredCount} destinatarios`)
    formOpen.value = false
  } catch (error) {
    formError.value = apiErrorMessage(error, 'No se pudo crear la notificación.')
  } finally {
    saving.value = false
  }
}

async function sendNow(item: AppNotification) {
  try {
    const { data, message } = await notificationsApi.send(item._id)
    notifications.value = notifications.value.map((entry) => (entry._id === data._id ? data : entry))
    toasts.success(message, `${data.deliveredCount} destinatarios`)
  } catch (error) {
    toasts.error('No se pudo enviar', apiErrorMessage(error))
  }
}

function askDelete(item: AppNotification) {
  target.value = item
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!target.value) return
  deleting.value = true
  try {
    await notificationsApi.remove(target.value._id)
    notifications.value = notifications.value.filter((item) => item._id !== target.value?._id)
    toasts.success('Notificación eliminada')
    confirmOpen.value = false
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  } finally {
    deleting.value = false
  }
}

function openReceipts(item: AppNotification) {
  receiptsTarget.value = item
  receiptsOpen.value = true
}

onMounted(() => {
  void load()
  void loadSettings()
  void loadChannelStatus()
})
</script>

<template>
  <div class="notifs">
    <PageHeader
      eyebrow="Audiencia"
      title="Notificaciones"
      detail="Avisos personalizados por rol, categoría o persona, con envío inmediato o programado."
      icon="fa-solid fa-bell"
    >
      <template #actions>
        <AppButton icon="fa-solid fa-plus" @click="openCreate">Nueva notificación</AppButton>
      </template>
    </PageHeader>

    <AppTabs v-model="view" :items="VIEW_TABS" />

    <!-- ---------- Reglas automáticas ---------- -->
    <AutoRulesPanel
      v-if="view === 'automaticas' && settings"
      :settings="settings"
      :can-edit="canEditSettings"
      @change="patchSettings"
    />

    <!-- ---------- Integraciones ---------- -->
    <ChannelsPanel
      v-else-if="view === 'canales' && settings"
      :settings="settings"
      :status="channelStatus"
      :can-edit="canEditSettings"
      @saved="settings = $event"
      @refresh="loadChannelStatus"
    />

    <AppSkeleton v-else-if="view !== 'lista' && !settings" :rows="3" height="120px" />

    <!-- ---------- Lista de notificaciones ---------- -->
    <template v-else>
    <AppTabs v-model="statusFilter" :items="statusTabs" />

    <AppSkeleton v-if="loading" :rows="4" height="86px" />

    <TransitionGroup v-else-if="filtered.length" name="list" tag="div" class="notifs__list">
      <article v-for="item in filtered" :key="item._id" class="notif">
        <span :class="['notif__icon', `notif__icon--${item.status}`]">
          <i
            :class="{
              'fa-solid fa-paper-plane': item.status === 'sent',
              'fa-regular fa-clock': item.status === 'scheduled',
              'fa-regular fa-pen-to-square': item.status === 'draft',
              'fa-solid fa-triangle-exclamation': item.status === 'failed',
            }"
          />
        </span>

        <div class="notif__main">
          <div class="notif__title">
            <strong>{{ item.title }}</strong>
            <AppBadge v-if="item.trigger && item.trigger !== 'manual'" tone="gold">
              <i class="fa-solid fa-robot" aria-hidden="true" /> automática
            </AppBadge>
            <AppBadge :tone="item.channel === 'signal' ? 'moss' : item.channel === 'email' ? 'ocean' : 'neutral'">
              {{ item.channel }}
            </AppBadge>
          </div>

          <p>{{ item.message }}</p>

          <div class="notif__meta">
            <span><i class="fa-solid fa-users" /> {{ audienceLabel(item) }}</span>
            <span v-if="item.status === 'sent'"><i class="fa-solid fa-check" /> {{ item.deliveredCount }} enviadas</span>
            <span v-if="item.status === 'sent'"><i class="fa-solid fa-eye" /> {{ item.readBy.length }} leídas</span>
            <span v-if="item.delivery?.attempted">
              <i class="fa-solid fa-tower-broadcast" /> {{ item.delivery.succeeded }}/{{ item.delivery.attempted }} externos
            </span>
            <span v-if="item.scheduledFor"><i class="fa-regular fa-clock" /> {{ formatDateTime(item.scheduledFor) }}</span>
            <span v-else-if="item.sentAt">{{ formatRelative(item.sentAt) }}</span>
          </div>

          <p v-if="item.delivery?.errors?.length" class="notif__errors">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            {{ item.delivery.errors[0] }}
            <template v-if="item.delivery.errors.length > 1">
              · y {{ item.delivery.errors.length - 1 }} más
            </template>
          </p>
        </div>

        <div class="notif__actions">
          <AppButton
            v-if="item.status !== 'sent'"
            size="sm"
            variant="outline"
            icon="fa-solid fa-paper-plane"
            title="Enviar ahora"
            @click="sendNow(item)"
          />
          <AppButton
            v-if="session.isSuperadmin && item.status === 'sent'"
            size="sm"
            variant="ghost"
            icon="fa-solid fa-eye"
            title="Ver quién la leyó"
            @click="openReceipts(item)"
          />
          <AppButton size="sm" variant="ghost" icon="fa-regular fa-trash-can" title="Eliminar" @click="askDelete(item)" />
        </div>
      </article>
    </TransitionGroup>

    <EmptyState v-else icon="fa-regular fa-bell" title="Sin notificaciones" detail="Crea el primer aviso para tu audiencia.">
      <AppButton icon="fa-solid fa-plus" @click="openCreate">Nueva notificación</AppButton>
    </EmptyState>
    </template>

    <AppModal v-model="formOpen" size="lg" title="Nueva notificación" icon="fa-solid fa-bell">
      <form class="nform" @submit.prevent="submit">
        <AppField label="Título" required><input v-model="form.title" type="text" placeholder="Nuevo reportaje disponible" /></AppField>

        <AppField label="Mensaje" required>
          <textarea v-model="form.message" rows="3" placeholder="Texto que verá el destinatario" />
        </AppField>

        <div class="nform__row">
          <AppField label="Canal">
            <AppSelect v-model="form.channel" :options="CHANNEL_OPTIONS" />
          </AppField>

          <AppField label="Audiencia">
            <AppSelect v-model="form.audience" :options="AUDIENCE_OPTIONS" />
          </AppField>
        </div>

        <AppField v-if="form.audience === 'role'" label="Rol destinatario">
          <AppSelect
            :model-value="form.roleId"
            :options="ROLE_OPTIONS"
            @update:model-value="form.roleId = Number($event)"
          />
        </AppField>

        <AppField v-if="form.audience === 'category'" label="Categoría de audiencia">
          <AppSelect v-model="form.categoryId" :options="categoryOptions" placeholder="Selecciona…" />
        </AppField>

        <AppField v-if="form.audience === 'users'" label="Personas" hint="Toca para seleccionar o quitar.">
          <div class="nform__users">
            <button
              v-for="user in users"
              :key="user._id"
              type="button"
              :class="{ 'is-on': form.userIds.includes(user._id) }"
              @click="toggleUser(user._id)"
            >
              {{ user.name }} {{ user.lastname }}
            </button>
          </div>
        </AppField>

        <div class="nform__row">
          <AppField label="Reportaje relacionado" hint="Opcional, para enlazar el aviso.">
            <AppSelect
              :model-value="form.targetId"
              :options="articleOptions"
              placeholder="Sin relación"
              searchable
              @update:model-value="setTarget"
            />
          </AppField>

          <AppField label="Enlace externo"><input v-model="form.link" type="url" placeholder="https://…" /></AppField>
        </div>

        <div class="nform__row">
          <AppField label="Cuándo enviar">
            <AppSelect
              :model-value="form.sendNow"
              :options="TIMING_OPTIONS"
              @update:model-value="form.sendNow = $event === true"
            />
          </AppField>

          <AppField v-if="!form.sendNow" label="Fecha y hora" :error="formError" required>
            <AppDateTimePicker v-model="form.scheduledFor" />
          </AppField>
        </div>

        <p v-if="formError && form.sendNow" class="nform__error">{{ formError }}</p>
      </form>

      <template #footer>
        <AppButton variant="ghost" @click="formOpen = false">Cancelar</AppButton>
        <AppButton :loading="saving" icon="fa-solid fa-paper-plane" @click="submit">
          {{ form.sendNow ? 'Enviar' : 'Programar' }}
        </AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-model="confirmOpen"
      :title="`¿Eliminar «${target?.title || ''}»?`"
      message="El aviso desaparecerá del historial."
      confirm-label="Eliminar"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <ReceiptsDrawer
      v-model="receiptsOpen"
      :notification-id="receiptsTarget?._id || ''"
      :title="receiptsTarget?.title || ''"
    />
  </div>
</template>

<style scoped lang="scss">
.notif__errors {
  @include row(var(--s-2), flex-start);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--danger);
}

.notifs {
  @include col(var(--s-5));
}

.notifs__list {
  @include col(var(--s-2));
  position: relative;
}

.notif {
  @include row(var(--s-4), flex-start);
  padding: var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);

  @include mobile {
    flex-wrap: wrap;
  }
}

.notif__icon {
  @include row(0, center, center);
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-dim);
}

.notif__icon--sent {
  background: var(--moss-soft);
  color: var(--moss);
}
.notif__icon--scheduled {
  background: var(--iris-soft);
  color: #a99bff;
}
.notif__icon--failed {
  background: var(--danger-soft);
  color: var(--danger);
}

.notif__main {
  @include col(var(--s-2));
  flex: 1;
  min-width: 0;

  p {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.notif__title {
  @include row(var(--s-2), center);
  flex-wrap: wrap;

  strong {
    font-size: 15px;
  }
}

.notif__meta {
  @include wrap(var(--s-3));
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);

  i {
    margin-inline-end: 4px;
  }
}

.notif__actions {
  @include row(var(--s-1), center);
  flex-shrink: 0;
}

.nform {
  @include col(var(--s-4));
}

.nform__row {
  @include wrap(var(--s-3));

  > * {
    flex: 1 1 200px;
  }
}

.nform__users {
  @include wrap(var(--s-2));
  max-height: 180px;
  overflow-y: auto;
  @include scrollbar;

  button {
    padding: 6px 12px;
    border-radius: var(--r-pill);
    border: 1px solid var(--line);
    font-size: 12px;
    color: var(--text-muted);

    &.is-on {
      border-color: var(--brand-line);
      background: var(--brand-soft);
      color: var(--brand-strong);
    }
  }
}

.nform__error {
  font-size: 12px;
  color: var(--danger);
}
</style>
