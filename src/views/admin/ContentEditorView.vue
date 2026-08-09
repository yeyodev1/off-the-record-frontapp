<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { catalogApi, contentApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { blocksToPlainText, emptyBlock, normalizeBlocks } from '@/composables/useBlocks'
import { toLocalInput } from '@/composables/useFormat'
import { ACCENT_PALETTE, STATUS_META } from '@/config/navigation'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppField from '@/components/ui/AppField.vue'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppTagSelect from '@/components/ui/AppTagSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import BlockComposer from '@/components/editor/BlockComposer.vue'
import AttachmentsPanel from '@/components/editor/AttachmentsPanel.vue'
import AiPanel from '@/components/editor/AiPanel.vue'
import SpellPanel from '@/components/editor/SpellPanel.vue'
import SharePanel from '@/components/editor/SharePanel.vue'
import ContentReader from '@/components/content/ContentReader.vue'
import type { Attachment, Category, ContentBlock, ContentItem, ContentKind, ContentStatus, ShareInfo } from '@/types'

const props = defineProps<{ kind: ContentKind; id?: string }>()

const router = useRouter()
const toasts = useToastStore()

const isArticle = computed(() => props.kind === 'article')
const basePath = computed(() => (isArticle.value ? '/admin/reportajes' : '/admin/actualizaciones'))

const loading = ref(Boolean(props.id))
const saving = ref(false)
const mode = ref<'edit' | 'split' | 'preview'>('edit')

const MODE_TABS = [
  { value: 'edit', label: 'Editar', icon: 'fa-solid fa-pen' },
  { value: 'split', label: 'Dividido', icon: 'fa-solid fa-table-columns' },
  { value: 'preview', label: 'Vista previa', icon: 'fa-regular fa-eye' },
]
const confirmLeave = ref(false)
const dirty = ref(false)

const categories = ref<Category[]>([])
const linkedArticles = ref<ContentItem[]>([])
const saved = ref<ContentItem | null>(null)

const form = reactive({
  title: '',
  kicker: '',
  summary: '',
  accentColor: ACCENT_PALETTE[0],
  categoryId: '',
  tags: [] as string[],
  status: 'draft' as ContentStatus,
  scheduledFor: '',
  priority: 'normal' as 'low' | 'normal' | 'high' | 'breaking',
  observations: '',
  articleId: '',
  notifyOnPublish: false,
  blocks: [emptyBlock()] as ContentBlock[],
  attachments: [] as Attachment[],
})

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador', icon: 'fa-regular fa-pen-to-square' },
  { value: 'review', label: 'En revisión', icon: 'fa-solid fa-magnifying-glass' },
  { value: 'scheduled', label: 'Programado', icon: 'fa-regular fa-clock' },
  { value: 'published', label: 'Publicado', icon: 'fa-solid fa-circle-check' },
  { value: 'archived', label: 'Archivado', icon: 'fa-solid fa-box-archive' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'breaking', label: 'Última hora', icon: 'fa-solid fa-fire' },
]

const categoryOptions = computed(() => [
  { value: '', label: 'Sin sección' },
  ...categories.value.map((category) => ({
    value: category._id,
    label: category.name,
    color: category.color,
  })),
])

const articleOptions = computed(() => [
  { value: '', label: 'Sin relación' },
  ...linkedArticles.value.map((article) => ({ value: article._id, label: article.title })),
])

const plainBody = computed(() => `${form.title}\n\n${form.summary}\n\n${blocksToPlainText(form.blocks)}`)
const shareInfo = computed<ShareInfo | null>(() => saved.value?.share ?? null)

function markDirty() {
  dirty.value = true
}

watch(form, markDirty, { deep: true })

function addBlock(block: ContentBlock) {
  form.blocks.push(block)
}

function addAttachment(attachment: Attachment) {
  form.attachments.push(attachment)
}

function buildPayload() {
  const payload: Partial<ContentItem> = {
    title: form.title.trim(),
    summary: form.summary.trim(),
    accentColor: form.accentColor,
    categoryId: form.categoryId,
    tags: form.tags,
    status: form.status,
    scheduledFor: form.status === 'scheduled' && form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null,
    blocks: form.blocks,
    attachments: form.attachments,
  }

  if (isArticle.value) {
    payload.kicker = form.kicker.trim()
    payload.observations = form.observations.trim()
    payload.priority = form.priority
  } else {
    payload.articleId = form.articleId
    payload.articleTitle = linkedArticles.value.find((item) => item._id === form.articleId)?.title || ''
    payload.notifyOnPublish = form.notifyOnPublish
  }

  return payload
}

async function save(nextStatus?: ContentStatus) {
  if (!form.title.trim()) {
    toasts.warning('Falta el título', 'Ponle un título antes de guardar.')
    return
  }

  if (nextStatus) form.status = nextStatus

  if (form.status === 'scheduled' && !form.scheduledFor) {
    toasts.warning('Falta la fecha', 'Elige cuándo debe publicarse.')
    return
  }

  saving.value = true
  try {
    const payload = buildPayload()

    if (saved.value?._id) {
      const { data, message } = await contentApi.update(props.kind, saved.value._id, payload)
      saved.value = data
      toasts.success(message, data.title)
    } else {
      const { data, message } = await contentApi.create(props.kind, payload)
      saved.value = data
      toasts.success(message, data.title)
      router.replace(`${basePath.value}/${data._id}`)
    }

    dirty.value = false
  } catch (error) {
    toasts.error('No se pudo guardar', apiErrorMessage(error))
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (dirty.value) {
    confirmLeave.value = true
    return
  }
  router.push(basePath.value)
}

function hydrate(item: ContentItem) {
  saved.value = item
  form.title = item.title
  form.kicker = item.kicker || ''
  form.summary = item.summary || ''
  form.accentColor = item.accentColor || ACCENT_PALETTE[0]
  form.categoryId = item.categoryId || ''
  form.tags = item.tags || []
  form.status = item.status
  form.scheduledFor = toLocalInput(item.scheduledFor)
  form.priority = item.priority || 'normal'
  form.observations = item.observations || ''
  form.articleId = item.articleId || ''
  form.notifyOnPublish = Boolean(item.notifyOnPublish)
  form.blocks = normalizeBlocks(item.blocks)
  form.attachments = item.attachments || []
}

const previewItem = computed<ContentItem>(
  () =>
    ({
      ...(saved.value || {}),
      ...buildPayload(),
      _id: saved.value?._id || 'preview',
      html: '',
      aiAssets: [],
      categoryName: categories.value.find((category) => category._id === form.categoryId)?.name || '',
      stats: saved.value?.stats || { views: 0, uniqueViews: 0, shareVisits: 0, avgSeconds: 0, lastReadAt: null },
      share: saved.value?.share || { enabled: false, token: '', expiresAt: null, visits: 0, lastVisitAt: null, channel: 'signal' },
      spellcheck: saved.value?.spellcheck || { score: 100, engine: '', issues: [], checkedAt: null },
      authorName: saved.value?.authorName || '',
      createdAt: saved.value?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) as ContentItem,
)

onMounted(async () => {
  try {
    const [cats, articles] = await Promise.all([
      catalogApi.categories('content'),
      isArticle.value ? Promise.resolve({ data: [] as ContentItem[] }) : contentApi.list('article', {}),
    ])

    categories.value = cats.data
    linkedArticles.value = articles.data
    if (!form.categoryId && cats.data[0]) form.categoryId = cats.data[0]._id

    if (props.id) {
      const { data } = await contentApi.detail(props.kind, props.id)
      hydrate(data)
    }
  } catch (error) {
    toasts.error('No pudimos abrir el editor', apiErrorMessage(error))
  } finally {
    loading.value = false
    dirty.value = false
  }
})
</script>

<template>
  <div class="editor">
    <PageHeader
      :eyebrow="saved ? STATUS_META[form.status]?.label : 'Borrador nuevo'"
      :title="form.title || (isArticle ? 'Nuevo reportaje' : 'Nueva actualización')"
      :detail="saved ? `Última edición: ${new Date(saved.updatedAt).toLocaleString('es-EC')}` : 'Aún sin guardar'"
      :icon="isArticle ? 'fa-solid fa-newspaper' : 'fa-solid fa-bolt'"
    >
      <template #actions>
        <AppBadge v-if="dirty" tone="gold" icon="fa-solid fa-circle">Cambios sin guardar</AppBadge>
        <AppButton variant="ghost" icon="fa-solid fa-arrow-left" @click="goBack">Volver</AppButton>
        <AppTabs v-model="mode" :items="MODE_TABS" />
        <AppButton variant="outline" icon="fa-regular fa-floppy-disk" :loading="saving" @click="save()">
          Guardar
        </AppButton>
        <AppButton icon="fa-solid fa-paper-plane" :loading="saving" @click="save('published')">Publicar</AppButton>
      </template>
    </PageHeader>

    <AppSkeleton v-if="loading" :rows="4" height="120px" />

    <div v-else :class="['editor__layout', `editor__layout--${mode}`]">
      <!-- Columna principal -->
      <div v-show="mode !== 'preview'" class="editor__main">
        <AppPanel title="Cabecera" icon="fa-solid fa-pen-nib">
          <div class="editor__head-fields">
            <AppField v-if="isArticle" label="Antetítulo" icon="fa-solid fa-tag">
              <input v-model="form.kicker" type="text" placeholder="Investigación · Serie especial" />
            </AppField>

            <AppField label="Título" icon="fa-solid fa-heading" required>
              <input v-model="form.title" type="text" placeholder="Titular del reportaje" />
            </AppField>

            <AppField label="Sumario" icon="fa-solid fa-align-left" hint="Dos o tres frases que resuman el hallazgo.">
              <textarea v-model="form.summary" rows="3" placeholder="Resumen editorial…" />
            </AppField>
          </div>
        </AppPanel>

        <AppPanel title="Cuerpo" detail="Bloques con formato, color y multimedia" icon="fa-solid fa-layer-group" :padded="true">
          <BlockComposer v-model="form.blocks" :attachments="form.attachments" @add-attachment="addAttachment" />
        </AppPanel>

        <AttachmentsPanel v-model="form.attachments" />
      </div>

      <!-- Vista previa en vivo -->
      <section v-if="mode !== 'edit'" class="editor__preview-pane">
        <header class="editor__preview-head">
          <span><i class="fa-regular fa-eye" aria-hidden="true" /> Así se verá publicado</span>
          <AppBadge tone="neutral">{{ form.blocks.length }} bloques</AppBadge>
        </header>

        <div class="editor__preview-scroll">
          <ContentReader :item="previewItem" :compact="mode === 'split'" />
        </div>
      </section>

      <!-- Columna lateral -->
      <aside v-show="mode === 'edit'" class="editor__side">
        <AppPanel title="Publicación" icon="fa-regular fa-clock" tone="var(--iris)">
          <div class="editor__side-fields">
            <AppField label="Estado" icon="fa-solid fa-flag">
              <AppSelect v-model="form.status" :options="STATUS_OPTIONS" />
            </AppField>

            <Transition name="rise">
              <AppField
                v-if="form.status === 'scheduled'"
                label="Publicar el"
                icon="fa-regular fa-calendar"
                hint="Se publica automáticamente a esa hora."
                required
              >
                <AppDateTimePicker v-model="form.scheduledFor" />
              </AppField>
            </Transition>

            <AppField label="Sección" icon="fa-solid fa-layer-group">
              <AppSelect v-model="form.categoryId" :options="categoryOptions" placeholder="Sin sección" />
            </AppField>

            <AppField v-if="isArticle" label="Prioridad" icon="fa-solid fa-fire">
              <AppSelect v-model="form.priority" :options="PRIORITY_OPTIONS" />
            </AppField>

            <template v-else>
              <AppField label="Reportaje relacionado" icon="fa-solid fa-link">
                <AppSelect v-model="form.articleId" :options="articleOptions" placeholder="Sin relación" searchable />
              </AppField>

              <AppSwitch
                v-model="form.notifyOnPublish"
                label="Notificar al publicar"
                hint="Envía un aviso a la audiencia cuando salga."
              />
            </template>

            <AppField label="Color de la pieza" icon="fa-solid fa-palette">
              <div class="editor__palette">
                <button
                  v-for="color in ACCENT_PALETTE"
                  :key="color"
                  type="button"
                  :class="{ 'is-on': form.accentColor === color }"
                  :style="{ background: color }"
                  :title="color"
                  @click="form.accentColor = color"
                />
              </div>
            </AppField>

            <AppField
              label="Etiquetas"
              icon="fa-solid fa-hashtag"
              hint="Busca entre las existentes; solo crea una nueva si de verdad no está."
            >
              <AppTagSelect v-model="form.tags" />
            </AppField>

            <AppField v-if="isArticle" label="Observaciones internas" icon="fa-solid fa-lock">
              <textarea v-model="form.observations" rows="2" placeholder="Notas que no se publican" />
            </AppField>
          </div>
        </AppPanel>

        <AiPanel
          :body="plainBody"
          :title="form.title"
          @apply-summary="form.summary = $event"
          @apply-title="form.title = $event"
          @add-block="addBlock"
          @add-attachment="addAttachment"
        />

        <SpellPanel :body="plainBody" :report="saved?.spellcheck" />

        <SharePanel
          :kind="kind"
          :content-id="saved?._id || ''"
          :share="shareInfo"
          @updated="saved && (saved.share = $event)"
        />
      </aside>
    </div>

    <ConfirmDialog
      v-model="confirmLeave"
      title="¿Salir sin guardar?"
      message="Tienes cambios sin guardar en esta pieza."
      confirm-label="Salir igual"
      tone="danger"
      @confirm="router.push(basePath)"
    />
  </div>
</template>

<style scoped lang="scss">
.editor {
  @include col(var(--s-5));
}

.editor__layout {
  @include row(var(--s-5), flex-start);
  align-items: flex-start;

  @include tablet {
    flex-direction: column;
  }
}

.editor__main {
  @include col(var(--s-5));
  flex: 3 1 560px;
  min-width: 0;
  width: 100%;
}

.editor__layout--split .editor__main {
  flex: 1 1 480px;
}

.editor__preview-pane {
  @include col(0);
  flex: 1 1 440px;
  min-width: 0;
  width: 100%;
  max-height: calc(100vh - var(--topbar-h) - var(--s-8));
  position: sticky;
  top: calc(var(--topbar-h) + var(--s-4));
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  overflow: hidden;

  @include tablet {
    position: static;
    max-height: none;
  }
}

.editor__layout--preview .editor__preview-pane {
  flex: 1 1 100%;
  max-height: none;
  position: static;
}

.editor__preview-head {
  @include row(var(--s-3), center, space-between);
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--line);
  background: var(--surface-sunken);

  span {
    @include row(var(--s-2), center);
    @include eyebrow;

    i {
      color: var(--brand);
    }
  }
}

.editor__preview-scroll {
  @include row(0, flex-start, center);
  flex: 1;
  padding: var(--s-5);
  overflow-y: auto;
  @include scrollbar;
}

.editor__side {
  @include col(var(--s-4));
  flex: 1 1 320px;
  min-width: 0;
  width: 100%;
  position: sticky;
  top: calc(var(--topbar-h) + var(--s-4));

  @include tablet {
    position: static;
  }
}

.editor__head-fields,
.editor__side-fields {
  @include col(var(--s-4));
}

.editor__palette {
  @include wrap(var(--s-2));

  button {
    width: 28px;
    height: 28px;
    border-radius: var(--r-xs);
    border: 2px solid transparent;
    transition: transform var(--t-fast) var(--ease);

    &:hover {
      transform: scale(1.1);
    }

    &.is-on {
      border-color: var(--text-strong);
      transform: scale(1.12);
    }
  }
}


</style>
