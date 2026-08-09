<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { catalogApi, fileToDataUrl, uploadsApi, usersApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { useSessionStore } from '@/stores/session'
import { ROLE_LABELS } from '@/config/navigation'
import { formatBytes, formatDateTime, formatRelative } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppField from '@/components/ui/AppField.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { AppUser, Category, UserArchive } from '@/types'

const toasts = useToastStore()
const session = useSessionStore()

const users = ref<AppUser[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const search = ref('')
const roleFilter = ref('')

const formOpen = ref(false)
const saving = ref(false)
const editing = ref<AppUser | null>(null)
const formError = ref('')

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<{
  user: AppUser
  archives: UserArchive[]
  reads: { targetTitle: string; readAt: string; categoryName: string }[]
  logins: { action: string; at: string; ip: string }[]
} | null>(null)

const confirmOpen = ref(false)
const deleting = ref(false)
const target = ref<AppUser | null>(null)

const archiveInput = ref<HTMLInputElement | null>(null)
const uploadingArchive = ref(false)

const form = reactive({
  name: '',
  lastname: '',
  email: '',
  password: '',
  ci: '',
  phone: '',
  signalHandle: '',
  telegramChatId: '',
  organization: '',
  position: '',
  notes: '',
  roleId: 2,
  premium: false,
  active: true,
  categoryIds: [] as string[],
})

const roleTabs = computed(() => [
  { value: '', label: 'Todos', icon: 'fa-solid fa-users', count: users.value.length },
  { value: '4', label: 'Superadmin', icon: 'fa-solid fa-crown', count: users.value.filter((u) => u.roleId === 4).length },
  { value: '1', label: 'Admins', icon: 'fa-solid fa-user-shield', count: users.value.filter((u) => u.roleId === 1).length },
  { value: '3', label: 'Editores', icon: 'fa-solid fa-pen-nib', count: users.value.filter((u) => u.roleId === 3).length },
  { value: '2', label: 'Lectores', icon: 'fa-solid fa-book-open-reader', count: users.value.filter((u) => u.roleId === 2).length },
])

const roleOptions = computed(() => [
  ...(session.isSuperadmin
    ? [{ value: 4, label: 'Superadministrador', icon: 'fa-solid fa-crown' }]
    : []),
  { value: 1, label: 'Administrador', icon: 'fa-solid fa-user-shield' },
  { value: 3, label: 'Editor', icon: 'fa-solid fa-pen-nib' },
  { value: 2, label: 'Lector', icon: 'fa-solid fa-book-open-reader' },
])

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return users.value.filter((user) => {
    if (roleFilter.value && String(user.roleId) !== roleFilter.value) return false
    if (!term) return true
    return `${user.name} ${user.lastname} ${user.email} ${user.organization} ${user.ci}`.toLowerCase().includes(term)
  })
})

function roleTone(roleId: number) {
  if (roleId === 4) return 'gold'
  if (roleId === 1) return 'brand'
  if (roleId === 3) return 'iris'
  return 'ocean'
}

async function load() {
  loading.value = true
  try {
    const [list, cats] = await Promise.all([usersApi.list(), catalogApi.categories('audience')])
    users.value = list.data
    categories.value = cats.data
  } catch (error) {
    toasts.error('No pudimos cargar los usuarios', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    name: '',
    lastname: '',
    email: '',
    password: '',
    ci: '',
    phone: '',
    signalHandle: '',
  telegramChatId: '',
    organization: '',
    position: '',
    notes: '',
    roleId: 2,
    premium: false,
    active: true,
    categoryIds: [],
  })
  formError.value = ''
}

function openCreate() {
  editing.value = null
  resetForm()
  formOpen.value = true
}

function openEdit(user: AppUser) {
  editing.value = user
  Object.assign(form, {
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    password: '',
    ci: user.ci,
    phone: user.phone,
    signalHandle: user.signalHandle,
    telegramChatId: user.telegramChatId || '',
    organization: user.organization,
    position: user.position,
    notes: user.notes,
    roleId: user.roleId,
    premium: user.premium,
    active: user.active,
    categoryIds: [...(user.categoryIds || [])],
  })
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  formError.value = ''

  if (!form.name.trim() || !form.email.trim()) {
    formError.value = 'Nombre y correo son obligatorios.'
    return
  }

  if (!editing.value && form.password.length < 8) {
    formError.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      const payload: Record<string, unknown> = { ...form }
      if (!form.password) delete payload.password
      const { data, message } = await usersApi.update(editing.value._id, payload as never)
      users.value = users.value.map((user) => (user._id === data._id ? data : user))
      toasts.success(message, data.email)
    } else {
      const { data, message } = await usersApi.create(form as never)
      users.value = [data, ...users.value]
      toasts.success(message, data.email)
    }
    formOpen.value = false
  } catch (error) {
    formError.value = apiErrorMessage(error, 'No se pudo guardar el usuario.')
  } finally {
    saving.value = false
  }
}

async function openDetail(user: AppUser) {
  detailOpen.value = true
  detailLoading.value = true
  try {
    const { data } = await usersApi.detail(user._id)
    detail.value = data as never
  } catch (error) {
    toasts.error('No pudimos abrir la ficha', apiErrorMessage(error))
  } finally {
    detailLoading.value = false
  }
}

function askDelete(user: AppUser) {
  target.value = user
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!target.value) return
  deleting.value = true
  try {
    await usersApi.remove(target.value._id)
    users.value = users.value.filter((user) => user._id !== target.value?._id)
    toasts.success('Usuario eliminado', target.value.email)
    confirmOpen.value = false
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  } finally {
    deleting.value = false
  }
}

async function uploadArchive(files: FileList | null) {
  if (!files?.length || !detail.value) return

  uploadingArchive.value = true
  try {
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file)
      const { data } = await uploadsApi.upload(dataUrl, file.name)
      const { data: archive } = await usersApi.addArchive(detail.value.user._id, {
        name: file.name,
        url: data.url,
        kind: data.kind as never,
        mime: file.type,
        bytes: file.size,
      })
      detail.value.archives = [archive, ...detail.value.archives]
    }
    toasts.success('Archivo agregado', 'Queda vinculado a la ficha del usuario.')
  } catch (error) {
    toasts.error('No se pudo adjuntar', apiErrorMessage(error))
  } finally {
    uploadingArchive.value = false
    if (archiveInput.value) archiveInput.value.value = ''
  }
}

async function removeArchive(archive: UserArchive) {
  if (!detail.value) return
  try {
    await usersApi.removeArchive(detail.value.user._id, archive._id)
    detail.value.archives = detail.value.archives.filter((item) => item._id !== archive._id)
    toasts.success('Archivo eliminado')
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  }
}

function toggleCategory(id: string) {
  form.categoryIds = form.categoryIds.includes(id)
    ? form.categoryIds.filter((item) => item !== id)
    : [...form.categoryIds, id]
}

watch(formOpen, (open) => {
  if (!open) editing.value = null
})

onMounted(load)
</script>

<template>
  <div class="users">
    <PageHeader
      eyebrow="Administración"
      title="Usuarios"
      detail="Altas, categorías de audiencia, archivos y actividad de cada cuenta."
      icon="fa-solid fa-users"
    >
      <template #actions>
        <AppButton icon="fa-solid fa-user-plus" @click="openCreate">Crear usuario</AppButton>
      </template>
    </PageHeader>

    <section class="users__filters">
      <AppTabs v-model="roleFilter" :items="roleTabs" />

      <div class="users__search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input v-model="search" type="search" placeholder="Buscar por nombre, correo, cédula u organización…" />
      </div>
    </section>

    <AppSkeleton v-if="loading" :rows="5" height="76px" />

    <TransitionGroup v-else-if="filtered.length" name="list" tag="div" class="users__list">
      <article v-for="user in filtered" :key="user._id" class="user">
        <span class="user__avatar" :class="{ 'user__avatar--off': !user.active }">
          {{ (user.name?.[0] || '?').toUpperCase() }}{{ (user.lastname?.[0] || '').toUpperCase() }}
        </span>

        <div class="user__main" @click="openDetail(user)">
          <div class="user__title">
            <strong>{{ user.name }} {{ user.lastname }}</strong>
            <AppBadge :tone="roleTone(user.roleId) as never">{{ ROLE_LABELS[user.roleId] || 'Sin rol' }}</AppBadge>
            <AppBadge v-if="user.premium" tone="gold" icon="fa-solid fa-crown">Premium</AppBadge>
            <AppBadge v-if="!user.active" tone="danger">Inactivo</AppBadge>
          </div>

          <p class="user__mail">{{ user.email }}</p>
          <p v-if="user.organization" class="user__org">{{ user.organization }} · {{ user.position }}</p>

          <div v-if="user.categoryNames?.length" class="user__cats">
            <span v-for="name in user.categoryNames" :key="name">{{ name }}</span>
          </div>
        </div>

        <div class="user__side">
          <span><i class="fa-solid fa-right-to-bracket" /> {{ user.loginCount || 0 }}</span>
          <span>{{ user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'nunca ingresó' }}</span>
        </div>

        <div class="user__actions">
          <AppButton size="sm" variant="ghost" icon="fa-solid fa-id-card" title="Ficha" @click="openDetail(user)" />
          <AppButton size="sm" variant="ghost" icon="fa-solid fa-pen" title="Editar" @click="openEdit(user)" />
          <AppButton
            v-if="user._id !== session.user?._id"
            size="sm"
            variant="ghost"
            icon="fa-regular fa-trash-can"
            title="Eliminar"
            @click="askDelete(user)"
          />
        </div>
      </article>
    </TransitionGroup>

    <EmptyState v-else icon="fa-solid fa-users" title="Sin usuarios" detail="Crea la primera cuenta del equipo.">
      <AppButton icon="fa-solid fa-user-plus" @click="openCreate">Crear usuario</AppButton>
    </EmptyState>

    <!-- Alta / edición -->
    <AppModal
      v-model="formOpen"
      size="lg"
      :title="editing ? 'Editar usuario' : 'Crear usuario'"
      :subtitle="editing?.email"
      icon="fa-solid fa-user-pen"
    >
      <form class="uform" @submit.prevent="submit">
        <div class="uform__row">
          <AppField label="Nombre" required><input v-model="form.name" type="text" /></AppField>
          <AppField label="Apellido"><input v-model="form.lastname" type="text" /></AppField>
        </div>

        <div class="uform__row">
          <AppField label="Correo" required><input v-model="form.email" type="email" /></AppField>
          <AppField
            :label="editing ? 'Nueva contraseña' : 'Contraseña'"
            :hint="editing ? 'Déjala vacía para no cambiarla.' : 'Mínimo 8 caracteres.'"
          >
            <input v-model="form.password" type="password" autocomplete="new-password" />
          </AppField>
        </div>

        <div class="uform__row">
          <AppField label="Cédula / ID"><input v-model="form.ci" type="text" /></AppField>
          <AppField label="Teléfono"><input v-model="form.phone" type="tel" /></AppField>
          <AppField label="Signal" hint="Número con país; es a donde escribe el puente">
            <input v-model="form.signalHandle" type="text" placeholder="+593 99 000 0000" />
          </AppField>
          <AppField label="Chat de Telegram" hint="Lo entrega el bot cuando la persona le escribe /start">
            <input v-model="form.telegramChatId" type="text" placeholder="123456789" />
          </AppField>
        </div>

        <div class="uform__row">
          <AppField label="Organización"><input v-model="form.organization" type="text" /></AppField>
          <AppField label="Cargo"><input v-model="form.position" type="text" /></AppField>
        </div>

        <div class="uform__row">
          <AppField label="Rol">
            <AppSelect
              :model-value="form.roleId"
              :options="roleOptions"
              @update:model-value="form.roleId = Number($event)"
            />
          </AppField>
        </div>

        <AppField label="Categorías de audiencia" hint="Determinan qué notificaciones y contenidos recibe.">
          <div class="uform__cats">
            <button
              v-for="category in categories"
              :key="category._id"
              type="button"
              :class="{ 'is-on': form.categoryIds.includes(category._id) }"
              :style="
                form.categoryIds.includes(category._id)
                  ? { borderColor: category.color, color: category.color, background: `${category.color}1f` }
                  : undefined
              "
              @click="toggleCategory(category._id)"
            >
              <i :class="category.icon" /> {{ category.name }}
            </button>
          </div>
        </AppField>

        <AppField label="Notas internas" :error="formError">
          <textarea v-model="form.notes" rows="2" placeholder="Contexto sobre el cliente o el miembro del equipo" />
        </AppField>

        <div class="uform__switches">
          <AppSwitch v-model="form.active" label="Cuenta activa" hint="Si se desactiva no podrá ingresar." />
          <AppSwitch v-model="form.premium" label="Cliente premium" hint="Acceso a material reservado." />
        </div>
      </form>

      <template #footer>
        <AppButton variant="ghost" @click="formOpen = false">Cancelar</AppButton>
        <AppButton :loading="saving" icon="fa-regular fa-floppy-disk" @click="submit">
          {{ editing ? 'Guardar cambios' : 'Crear usuario' }}
        </AppButton>
      </template>
    </AppModal>

    <!-- Ficha -->
    <AppDrawer v-model="detailOpen" width="580px" title="Ficha del usuario" icon="fa-solid fa-id-card">
      <AppSkeleton v-if="detailLoading" :rows="4" height="60px" />

      <div v-else-if="detail" class="udetail">
        <header class="udetail__head">
          <span class="user__avatar">
            {{ (detail.user.name?.[0] || '?').toUpperCase() }}{{ (detail.user.lastname?.[0] || '').toUpperCase() }}
          </span>
          <div>
            <strong>{{ detail.user.name }} {{ detail.user.lastname }}</strong>
            <span>{{ detail.user.email }}</span>
            <span v-if="detail.user.signalHandle">Signal: {{ detail.user.signalHandle }}</span>
            <span v-if="detail.user.telegramChatId">Telegram: {{ detail.user.telegramChatId }}</span>
          </div>
          <AppBadge :tone="roleTone(detail.user.roleId) as never">{{ ROLE_LABELS[detail.user.roleId] }}</AppBadge>
        </header>

        <section class="udetail__section">
          <p class="udetail__title"><i class="fa-solid fa-folder-open" /> Archivos</p>

          <input
            ref="archiveInput"
            class="udetail__file"
            type="file"
            multiple
            @change="uploadArchive(($event.target as HTMLInputElement).files)"
          />
          <AppButton size="sm" variant="outline" icon="fa-solid fa-upload" :loading="uploadingArchive" @click="archiveInput?.click()">
            Adjuntar archivo
          </AppButton>

          <div v-if="detail.archives.length" class="udetail__files">
            <article v-for="archive in detail.archives" :key="archive._id">
              <a :href="archive.url" target="_blank" rel="noreferrer">
                <i class="fa-regular fa-file-lines" /> {{ archive.name }}
              </a>
              <span>{{ formatBytes(archive.bytes) }} · {{ formatDateTime(archive.createdAt) }}</span>
              <button type="button" title="Quitar" @click="removeArchive(archive)">
                <i class="fa-regular fa-trash-can" />
              </button>
            </article>
          </div>
          <p v-else class="udetail__empty">Sin archivos adjuntos.</p>
        </section>

        <section class="udetail__section">
          <p class="udetail__title"><i class="fa-solid fa-book-open" /> Últimas lecturas</p>
          <div v-if="detail.reads.length" class="udetail__rows">
            <article v-for="(read, index) in detail.reads" :key="index">
              <strong>{{ read.targetTitle }}</strong>
              <span>{{ read.categoryName }} · {{ formatDateTime(read.readAt) }}</span>
            </article>
          </div>
          <p v-else class="udetail__empty">Todavía no registra lecturas.</p>
        </section>

        <section class="udetail__section">
          <p class="udetail__title"><i class="fa-solid fa-shield-halved" /> Ingresos recientes</p>
          <div v-if="detail.logins.length" class="udetail__rows">
            <article v-for="(entry, index) in detail.logins" :key="index">
              <strong>{{ entry.action === 'login' ? 'Ingreso' : entry.action === 'failed' ? 'Intento fallido' : entry.action }}</strong>
              <span>{{ formatDateTime(entry.at) }} · {{ entry.ip || 'sin IP' }}</span>
            </article>
          </div>
          <p v-else class="udetail__empty">Sin registros de acceso.</p>
        </section>
      </div>
    </AppDrawer>

    <ConfirmDialog
      v-model="confirmOpen"
      :title="`¿Eliminar a ${target?.name || ''}?`"
      message="Se borrará la cuenta y sus archivos vinculados."
      confirm-label="Eliminar cuenta"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped lang="scss">
.users {
  @include col(var(--s-5));
}

.users__filters {
  @include wrap(var(--s-3));
  align-items: center;
}

.users__search {
  position: relative;
  flex: 1 1 260px;

  i {
    position: absolute;
    inset-inline-start: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--text-dim);
  }

  input {
    width: 100%;
    padding: 10px 14px 10px 38px;
    border-radius: var(--r-pill);
    background: var(--surface-sunken);
    border: 1px solid var(--line);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--brand-line);
    }
  }
}

.users__list {
  @include col(var(--s-2));
  position: relative;
}

.user {
  @include row(var(--s-4), center);
  padding: var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  transition: border-color var(--t-fast) var(--ease);

  &:hover {
    border-color: var(--line-strong);
  }

  @include mobile {
    flex-wrap: wrap;
  }
}

.user__avatar {
  @include row(0, center, center);
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand), var(--iris));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.user__avatar--off {
  background: var(--ink-600);
  color: var(--text-dim);
}

.user__main {
  @include col(3px);
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.user__title {
  @include row(var(--s-2), center);
  flex-wrap: wrap;

  strong {
    font-size: 15px;
  }
}

.user__mail {
  font-size: 13px;
  color: var(--text-muted);
  @include truncate;
}

.user__org {
  @include eyebrow;
  font-size: 9px;
}

.user__cats {
  @include wrap(4px);

  span {
    padding: 2px 8px;
    border-radius: var(--r-pill);
    background: rgba(255, 255, 255, 0.05);
    font-size: 10px;
    color: var(--text-dim);
  }
}

.user__side {
  @include col(2px, flex-end);
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);

  @include mobile {
    display: none;
  }
}

.user__actions {
  @include row(var(--s-1), center);
  flex-shrink: 0;
}

/* Formulario */
.uform {
  @include col(var(--s-4));
}

.uform__row {
  @include wrap(var(--s-3));

  > * {
    flex: 1 1 180px;
  }
}

.uform__cats {
  @include wrap(var(--s-2));

  button {
    @include row(var(--s-2), center);
    padding: 6px 12px;
    border-radius: var(--r-pill);
    border: 1px solid var(--line);
    font-size: 12px;
    color: var(--text-muted);

    i {
      font-size: 10px;
    }
  }
}

.uform__switches {
  @include wrap(var(--s-4));
}

/* Ficha */
.udetail {
  @include col(var(--s-5));
}

.udetail__head {
  @include row(var(--s-3), center);
  padding-bottom: var(--s-4);
  border-bottom: 1px solid var(--line);

  div {
    @include col(1px);
    flex: 1;
    min-width: 0;
  }

  strong {
    font-size: 16px;
  }

  span {
    font-size: 12px;
    color: var(--text-dim);
    @include truncate;
  }
}

.udetail__section {
  @include col(var(--s-3));
}

.udetail__title {
  @include row(var(--s-2), center);
  @include eyebrow;

  i {
    color: var(--brand);
  }
}

.udetail__file {
  display: none;
}

.udetail__files,
.udetail__rows {
  @include col(var(--s-2));

  article {
    @include row(var(--s-3), center);
    padding: var(--s-3);
    border-radius: var(--r-sm);
    background: var(--surface-sunken);
    border: 1px solid var(--line);
    font-size: 13px;

    a,
    strong {
      flex: 1;
      min-width: 0;
      @include truncate;
    }

    span {
      @include eyebrow;
      font-size: 9px;
      flex-shrink: 0;
    }

    button {
      color: var(--text-dim);
      padding: 4px;

      &:hover {
        color: var(--danger);
      }
    }
  }
}

.udetail__rows article {
  @include col(2px);
  align-items: flex-start;
}

.udetail__empty {
  font-size: 12px;
  color: var(--text-dim);
}
</style>
