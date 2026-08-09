<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { catalogApi, tagsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { ACCENT_PALETTE } from '@/config/navigation'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { Category, Tag } from '@/types'

const toasts = useToastStore()

const categories = ref<Category[]>([])
const loading = ref(true)
const formOpen = ref(false)
const saving = ref(false)
const editing = ref<Category | null>(null)
const formError = ref('')

const confirmOpen = ref(false)
const deleting = ref(false)
const target = ref<Category | null>(null)

const ICONS = [
  'fa-solid fa-magnifying-glass',
  'fa-solid fa-landmark',
  'fa-solid fa-chart-line',
  'fa-solid fa-shield-halved',
  'fa-solid fa-feather',
  'fa-solid fa-scale-balanced',
  'fa-solid fa-crown',
  'fa-solid fa-user-group',
  'fa-solid fa-pen-nib',
  'fa-solid fa-handshake',
]

const form = reactive({
  name: '',
  scope: 'content' as 'content' | 'audience',
  color: ACCENT_PALETTE[0],
  icon: ICONS[0],
  description: '',
  order: 0,
  active: true,
})

const tags = ref<Tag[]>([])
const tagSearch = ref('')
const mergeOpen = ref(false)
const mergeSource = ref<Tag | null>(null)
const mergeTarget = ref('')
const merging = ref(false)
const tagConfirmOpen = ref(false)
const tagTarget = ref<Tag | null>(null)
const deletingTag = ref(false)

const filteredTags = computed(() => {
  const term = tagSearch.value.trim().toLowerCase()
  return term ? tags.value.filter((tag) => tag.name.toLowerCase().includes(term) || tag.slug.includes(term)) : tags.value
})

const mergeOptions = computed(() =>
  tags.value
    .filter((tag) => tag._id !== mergeSource.value?._id)
    .map((tag) => ({ value: tag._id, label: tag.name, color: tag.color, hint: `${tag.usageCount} usos` })),
)

async function loadTags() {
  try {
    const { data } = await tagsApi.list()
    tags.value = data
  } catch (error) {
    toasts.error('No pudimos cargar las etiquetas', apiErrorMessage(error))
  }
}

async function renameTag(tag: Tag, name: string) {
  const clean = name.trim()
  if (!clean || clean === tag.name) return

  try {
    const { data, message } = await tagsApi.update(tag._id, { name: clean })
    toasts.success(message, data.name)
    await loadTags()
  } catch (error) {
    toasts.error('No se pudo renombrar', apiErrorMessage(error))
  }
}

function openMerge(tag: Tag) {
  mergeSource.value = tag
  mergeTarget.value = ''
  mergeOpen.value = true
}

async function confirmMerge() {
  if (!mergeSource.value || !mergeTarget.value) return

  merging.value = true
  try {
    const { message } = await tagsApi.merge(mergeSource.value._id, mergeTarget.value)
    toasts.success(message)
    mergeOpen.value = false
    await loadTags()
  } catch (error) {
    toasts.error('No se pudieron fusionar', apiErrorMessage(error))
  } finally {
    merging.value = false
  }
}

function askDeleteTag(tag: Tag) {
  tagTarget.value = tag
  tagConfirmOpen.value = true
}

async function confirmDeleteTag() {
  if (!tagTarget.value) return

  deletingTag.value = true
  try {
    await tagsApi.remove(tagTarget.value._id)
    tags.value = tags.value.filter((tag) => tag._id !== tagTarget.value?._id)
    toasts.success('Etiqueta eliminada')
    tagConfirmOpen.value = false
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  } finally {
    deletingTag.value = false
  }
}

async function recount() {
  try {
    const { data, message } = await tagsApi.recount()
    tags.value = data
    toasts.success(message)
  } catch (error) {
    toasts.error('No se pudo recalcular', apiErrorMessage(error))
  }
}

const SCOPE_OPTIONS = [
  { value: 'content', label: 'Sección de contenido', icon: 'fa-solid fa-newspaper' },
  { value: 'audience', label: 'Segmento de audiencia', icon: 'fa-solid fa-user-group' },
]

const contentCategories = computed(() => categories.value.filter((item) => item.scope === 'content'))
const audienceCategories = computed(() => categories.value.filter((item) => item.scope === 'audience'))

async function load() {
  loading.value = true
  try {
    const { data } = await catalogApi.categories()
    categories.value = data
  } catch (error) {
    toasts.error('No pudimos cargar las categorías', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function openCreate(scope: 'content' | 'audience') {
  editing.value = null
  Object.assign(form, {
    name: '',
    scope,
    color: ACCENT_PALETTE[0],
    icon: ICONS[0],
    description: '',
    order: categories.value.filter((item) => item.scope === scope).length,
    active: true,
  })
  formError.value = ''
  formOpen.value = true
}

function openEdit(category: Category) {
  editing.value = category
  Object.assign(form, {
    name: category.name,
    scope: category.scope,
    color: category.color,
    icon: category.icon,
    description: category.description,
    order: category.order,
    active: category.active,
  })
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  if (!form.name.trim()) {
    formError.value = 'El nombre es obligatorio.'
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      const { data, message } = await catalogApi.updateCategory(editing.value._id, form)
      categories.value = categories.value.map((item) => (item._id === data._id ? data : item))
      toasts.success(message, data.name)
    } else {
      const { data, message } = await catalogApi.createCategory(form)
      categories.value = [...categories.value, data]
      toasts.success(message, data.name)
    }
    formOpen.value = false
  } catch (error) {
    formError.value = apiErrorMessage(error, 'No se pudo guardar la categoría.')
  } finally {
    saving.value = false
  }
}

function askDelete(category: Category) {
  target.value = category
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!target.value) return
  deleting.value = true
  try {
    await catalogApi.deleteCategory(target.value._id)
    categories.value = categories.value.filter((item) => item._id !== target.value?._id)
    toasts.success('Categoría eliminada')
    confirmOpen.value = false
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void load()
  void loadTags()
})
</script>

<template>
  <div class="cats">
    <PageHeader
      eyebrow="Configuración"
      title="Categorías"
      detail="Secciones editoriales para las estadísticas y segmentos de audiencia para los envíos."
      icon="fa-solid fa-layer-group"
    />

    <AppSkeleton v-if="loading" :rows="3" height="80px" />

    <template v-else>
      <AppPanel title="Secciones de contenido" detail="Se usan para la estadística por secciones" icon="fa-solid fa-newspaper">
        <template #actions>
          <AppButton size="sm" icon="fa-solid fa-plus" @click="openCreate('content')">Nueva sección</AppButton>
        </template>

        <TransitionGroup v-if="contentCategories.length" name="list" tag="div" class="cats__list">
          <article v-for="category in contentCategories" :key="category._id" class="cat" :style="{ '--cat': category.color }">
            <span class="cat__icon"><i :class="category.icon" /></span>
            <div class="cat__main">
              <strong>{{ category.name }}</strong>
              <span v-if="category.description">{{ category.description }}</span>
            </div>
            <span v-if="!category.active" class="cat__off">Inactiva</span>
            <div class="cat__actions">
              <AppButton size="sm" variant="ghost" icon="fa-solid fa-pen" title="Editar" @click="openEdit(category)" />
              <AppButton size="sm" variant="ghost" icon="fa-regular fa-trash-can" title="Eliminar" @click="askDelete(category)" />
            </div>
          </article>
        </TransitionGroup>

        <EmptyState v-else icon="fa-solid fa-layer-group" title="Sin secciones" />
      </AppPanel>

      <AppPanel
        title="Segmentos de audiencia"
        detail="Agrupan usuarios para notificaciones y permisos"
        icon="fa-solid fa-user-group"
        tone="var(--iris)"
      >
        <template #actions>
          <AppButton size="sm" icon="fa-solid fa-plus" @click="openCreate('audience')">Nuevo segmento</AppButton>
        </template>

        <TransitionGroup v-if="audienceCategories.length" name="list" tag="div" class="cats__list">
          <article v-for="category in audienceCategories" :key="category._id" class="cat" :style="{ '--cat': category.color }">
            <span class="cat__icon"><i :class="category.icon" /></span>
            <div class="cat__main">
              <strong>{{ category.name }}</strong>
              <span v-if="category.description">{{ category.description }}</span>
            </div>
            <span v-if="!category.active" class="cat__off">Inactivo</span>
            <div class="cat__actions">
              <AppButton size="sm" variant="ghost" icon="fa-solid fa-pen" title="Editar" @click="openEdit(category)" />
              <AppButton size="sm" variant="ghost" icon="fa-regular fa-trash-can" title="Eliminar" @click="askDelete(category)" />
            </div>
          </article>
        </TransitionGroup>

        <EmptyState v-else icon="fa-solid fa-user-group" title="Sin segmentos" />
      </AppPanel>

      <AppPanel
        title="Etiquetas"
        detail="Catálogo compartido: el editor solo deja elegir de aquí"
        icon="fa-solid fa-hashtag"
        tone="var(--gold)"
      >
        <template #actions>
          <AppButton size="sm" variant="ghost" icon="fa-solid fa-calculator" @click="recount">
            Recalcular usos
          </AppButton>
        </template>

        <div class="tags-admin">
          <div class="tags-admin__search">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input v-model="tagSearch" type="search" placeholder="Buscar etiqueta…" />
          </div>

          <p class="tags-admin__note">
            <i class="fa-solid fa-circle-info" aria-hidden="true" />
            Las etiquetas se guardan normalizadas (sin tildes ni mayúsculas), así que «Corrupción» y «corrupcion»
            son la misma. Si ya se colaron dos parecidas, fusiónalas.
          </p>

          <TransitionGroup v-if="filteredTags.length" name="list" tag="div" class="tags-admin__list">
            <article v-for="tag in filteredTags" :key="tag._id" class="tag-row" :style="{ '--tag': tag.color }">
              <span class="tag-row__dot" />

              <input
                class="tag-row__name"
                :value="tag.name"
                @change="renameTag(tag, ($event.target as HTMLInputElement).value)"
              />

              <code class="tag-row__slug">{{ tag.slug }}</code>
              <AppBadge tone="neutral">{{ tag.usageCount }} usos</AppBadge>

              <div class="tag-row__actions">
                <AppButton
                  size="sm"
                  variant="ghost"
                  icon="fa-solid fa-code-merge"
                  title="Fusionar con otra"
                  @click="openMerge(tag)"
                />
                <AppButton
                  size="sm"
                  variant="ghost"
                  icon="fa-regular fa-trash-can"
                  title="Eliminar"
                  @click="askDeleteTag(tag)"
                />
              </div>
            </article>
          </TransitionGroup>

          <EmptyState
            v-else
            icon="fa-solid fa-hashtag"
            :title="tagSearch ? 'Sin coincidencias' : 'Aún no hay etiquetas'"
            detail="Se crean desde el editor al escribir una nueva."
          />
        </div>
      </AppPanel>
    </template>

    <AppModal
      v-model="mergeOpen"
      size="sm"
      title="Fusionar etiquetas"
      :subtitle="mergeSource ? `«${mergeSource.name}» desaparecerá` : ''"
      icon="fa-solid fa-code-merge"
    >
      <AppField
        label="Mantener esta etiqueta"
        hint="El contenido que usaba la anterior pasará a esta."
      >
        <AppSelect v-model="mergeTarget" :options="mergeOptions" placeholder="Elige la etiqueta final" searchable />
      </AppField>

      <template #footer>
        <AppButton variant="ghost" @click="mergeOpen = false">Cancelar</AppButton>
        <AppButton :loading="merging" :disabled="!mergeTarget" icon="fa-solid fa-code-merge" @click="confirmMerge">
          Fusionar
        </AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-model="tagConfirmOpen"
      :title="`¿Eliminar «${tagTarget?.name || ''}»?`"
      message="Se quitará también del contenido que la usaba."
      confirm-label="Eliminar"
      :loading="deletingTag"
      @confirm="confirmDeleteTag"
    />

    <AppModal
      v-model="formOpen"
      size="md"
      :title="editing ? 'Editar categoría' : 'Nueva categoría'"
      icon="fa-solid fa-layer-group"
    >
      <form class="cform" @submit.prevent="submit">
        <AppField label="Nombre" required :error="formError">
          <input v-model="form.name" type="text" placeholder="Investigación" />
        </AppField>

        <AppField label="Tipo">
          <AppSelect v-model="form.scope" :options="SCOPE_OPTIONS" />
        </AppField>

        <AppField label="Descripción">
          <input v-model="form.description" type="text" placeholder="Para qué sirve esta categoría" />
        </AppField>

        <AppField label="Color">
          <div class="cform__palette">
            <button
              v-for="color in ACCENT_PALETTE"
              :key="color"
              type="button"
              :class="{ 'is-on': form.color === color }"
              :style="{ background: color }"
              @click="form.color = color"
            />
          </div>
        </AppField>

        <AppField label="Icono">
          <div class="cform__icons">
            <button
              v-for="icon in ICONS"
              :key="icon"
              type="button"
              :class="{ 'is-on': form.icon === icon }"
              @click="form.icon = icon"
            >
              <i :class="icon" />
            </button>
          </div>
        </AppField>

        <AppField label="Orden"><input v-model.number="form.order" type="number" min="0" /></AppField>

        <AppSwitch v-model="form.active" label="Activa" hint="Las inactivas no aparecen en los selectores." />
      </form>

      <template #footer>
        <AppButton variant="ghost" @click="formOpen = false">Cancelar</AppButton>
        <AppButton :loading="saving" icon="fa-regular fa-floppy-disk" @click="submit">Guardar</AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-model="confirmOpen"
      :title="`¿Eliminar «${target?.name || ''}»?`"
      message="Los contenidos asociados quedarán sin categoría."
      confirm-label="Eliminar"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped lang="scss">
.cats {
  @include col(var(--s-5));
}

.cats__list {
  @include col(var(--s-2));
  position: relative;
}

.cat {
  @include row(var(--s-3), center);
  padding: var(--s-3);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  transition: border-color var(--t-fast) var(--ease);

  &:hover {
    border-color: color-mix(in srgb, var(--cat) 45%, transparent);
  }
}

.cat__icon {
  @include row(0, center, center);
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  color: var(--cat);
  background: color-mix(in srgb, var(--cat) 16%, transparent);
  font-size: 13px;
}

.cat__main {
  @include col(1px);
  flex: 1;
  min-width: 0;

  strong {
    font-size: 14px;
  }

  span {
    font-size: 12px;
    color: var(--text-dim);
    @include truncate;
  }
}

.cat__off {
  @include eyebrow;
  font-size: 9px;
  color: var(--danger);
}

.cat__actions {
  @include row(var(--s-1), center);
  flex-shrink: 0;
}

.tags-admin {
  @include col(var(--s-3));
}

.tags-admin__search {
  position: relative;

  i {
    position: absolute;
    inset-inline-start: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: var(--text-dim);
  }

  input {
    width: 100%;
    padding: 9px 12px 9px 34px;
    border-radius: var(--r-pill);
    background: var(--surface-sunken);
    border: 1px solid var(--line);
    font-size: 13px;

    &:focus {
      outline: none;
      border-color: var(--brand-line);
    }
  }
}

.tags-admin__note {
  @include row(var(--s-2), flex-start);
  padding: var(--s-3);
  border-radius: var(--r-sm);
  background: var(--gold-soft);
  font-size: 12px;
  color: var(--gold);

  i {
    margin-top: 2px;
  }
}

.tags-admin__list {
  @include col(var(--s-2));
  max-height: 420px;
  overflow-y: auto;
  @include scrollbar;
}

.tag-row {
  @include row(var(--s-3), center);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-sm);
  background: var(--surface-sunken);
  border: 1px solid var(--line);

  @include mobile {
    flex-wrap: wrap;
  }
}

.tag-row__dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--tag);
}

.tag-row__name {
  flex: 1;
  min-width: 100px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r-xs);
  padding: 4px 8px;
  font-size: 14px;
  color: var(--text);

  &:hover {
    border-color: var(--line);
  }

  &:focus {
    outline: none;
    border-color: var(--brand-line);
    background: var(--ink-800);
  }
}

.tag-row__slug {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);

  @include mobile {
    display: none;
  }
}

.tag-row__actions {
  @include row(0, center);
  flex-shrink: 0;
}

.cform {
  @include col(var(--s-4));
}

.cform__palette,
.cform__icons {
  @include wrap(var(--s-2));

  button {
    width: 32px;
    height: 32px;
    border-radius: var(--r-xs);
    border: 2px solid transparent;
    transition: transform var(--t-fast) var(--ease);

    &:hover {
      transform: scale(1.08);
    }

    &.is-on {
      border-color: var(--text-strong);
    }
  }
}

.cform__icons button {
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  color: var(--text-muted);
  font-size: 12px;

  &.is-on {
    border-color: var(--brand);
    color: var(--brand-strong);
  }
}
</style>
