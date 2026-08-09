<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fileToDataUrl, uploadsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import RichEditor from './RichEditor.vue'
import InfographicView from '@/components/charts/InfographicView.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { ACCENT_PALETTE } from '@/config/navigation'
import { blockUid, emptyBlock } from '@/composables/useBlocks'
import type { Align, Attachment, AttachmentKind, BlockKind, ContentBlock, InfographicSpec } from '@/types'

const props = defineProps<{ modelValue: ContentBlock[]; attachments: Attachment[] }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: ContentBlock[]): void
  (e: 'add-attachment', value: Attachment): void
}>()

const toasts = useToastStore()
const uploadingAt = ref<number | null>(null)
const draggingAt = ref<number | null>(null)

const KINDS: { value: BlockKind; label: string; icon: string }[] = [
  { value: 'paragraph', label: 'Párrafo', icon: 'fa-solid fa-paragraph' },
  { value: 'heading', label: 'Título', icon: 'fa-solid fa-heading' },
  { value: 'intertitle', label: 'Intertítulo', icon: 'fa-solid fa-minus' },
  { value: 'list', label: 'Lista', icon: 'fa-solid fa-list-ul' },
  { value: 'quote', label: 'Cita', icon: 'fa-solid fa-quote-left' },
  { value: 'callout', label: 'Destacado', icon: 'fa-solid fa-lightbulb' },
  { value: 'divider', label: 'División por color', icon: 'fa-solid fa-grip-lines' },
  { value: 'media', label: 'Multimedia', icon: 'fa-solid fa-photo-film' },
  { value: 'infographic', label: 'Infografía', icon: 'fa-solid fa-chart-pie' },
]

const KIND_OPTIONS = KINDS.map((kind) => ({ value: kind.value, label: kind.label, icon: kind.icon }))

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Izquierda', icon: 'fa-solid fa-align-left' },
  { value: 'center', label: 'Centro', icon: 'fa-solid fa-align-center' },
  { value: 'right', label: 'Derecha', icon: 'fa-solid fa-align-right' },
  { value: 'justify', label: 'Justificado', icon: 'fa-solid fa-align-justify' },
]

const LINE_HEIGHT_OPTIONS = [
  { value: 1.3, label: '1.3' },
  { value: 1.5, label: '1.5' },
  { value: 1.7, label: '1.7' },
  { value: 2, label: '2.0' },
]

const assetOptions = computed(() => [
  { value: '', label: 'Sin adjunto' },
  ...props.attachments.map((asset) => ({
    value: asset.url,
    label: asset.name || asset.url,
    hint: asset.kind,
    icon:
      asset.kind === 'image'
        ? 'fa-regular fa-image'
        : asset.kind === 'video'
          ? 'fa-solid fa-film'
          : asset.kind === 'audio'
            ? 'fa-solid fa-headphones'
            : 'fa-regular fa-file-lines',
  })),
])

const menuFor = ref<number | null>(null)
const paletteFor = ref<string | null>(null)
const confirmOpen = ref(false)
const pendingRemoval = ref<number | null>(null)

const pendingBlock = computed(() =>
  pendingRemoval.value === null ? null : props.modelValue[pendingRemoval.value] || null,
)

/**
 * Los menús flotan en `body`. Dentro de la tarjeta quedaban recortados por los
 * bloques de abajo y no se alcanzaba a ver la lista completa.
 */
const menuPos = ref({ top: 0, left: 0, maxHeight: 360 })
const palettePos = ref({ top: 0, left: 0, maxHeight: 200 })

// Guardamos el disparador para poder recolocar el menú si la página se mueve.
let menuTrigger: HTMLElement | null = null
let paletteTrigger: HTMLElement | null = null

const GAP = 8
const MARGIN = 12

/**
 * Coloca el flotante junto a su disparador. Si abajo no cabe se voltea arriba,
 * y en cualquier caso limita la altura al espacio disponible en pantalla.
 */
function place(trigger: HTMLElement, width: number, preferred: number, align: 'center' | 'end' = 'center') {
  const rect = trigger.getBoundingClientRect()

  const below = window.innerHeight - rect.bottom - GAP - MARGIN
  const above = rect.top - GAP - MARGIN
  const flip = below < Math.min(preferred, 220) && above > below

  const maxHeight = Math.max(160, Math.min(preferred, flip ? above : below))
  const top = flip ? rect.top - GAP - maxHeight : rect.bottom + GAP

  const rawLeft = align === 'end' ? rect.right - width : rect.left + rect.width / 2 - width / 2
  const left = Math.max(MARGIN, Math.min(rawLeft, window.innerWidth - width - MARGIN))

  return { top: Math.max(MARGIN, top), left, maxHeight }
}

function toggleInsertMenu(index: number, event: MouseEvent) {
  if (menuFor.value === index) {
    menuFor.value = null
    return
  }

  paletteFor.value = null
  menuTrigger = event.currentTarget as HTMLElement
  menuPos.value = place(menuTrigger, 230, 380)
  menuFor.value = index
}

function togglePalette(uid: string, event: MouseEvent) {
  if (paletteFor.value === uid) {
    paletteFor.value = null
    return
  }

  menuFor.value = null
  paletteTrigger = event.currentTarget as HTMLElement
  palettePos.value = place(paletteTrigger, 156, 200, 'end')
  paletteFor.value = uid
}

function closeFloating() {
  menuFor.value = null
  paletteFor.value = null
  menuTrigger = null
  paletteTrigger = null
}

/** Al mover la página el menú sigue a su botón; solo se cierra si este sale de vista. */
function reposition() {
  if (menuFor.value !== null && menuTrigger) {
    const rect = menuTrigger.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > window.innerHeight) closeFloating()
    else menuPos.value = place(menuTrigger, 230, 380)
  }

  if (paletteFor.value && paletteTrigger) {
    const rect = paletteTrigger.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > window.innerHeight) closeFloating()
    else palettePos.value = place(paletteTrigger, 156, 200, 'end')
  }
}

/**
 * El scroll dentro del propio menú no debe afectarlo: era lo que lo cerraba
 * justo cuando se intentaba llegar a las últimas opciones.
 */
function onScroll(event: Event) {
  const target = event.target as HTMLElement | null
  if (target && typeof target.closest === 'function' && target.closest('.block__floating')) return
  reposition()
}

function onDocumentDown(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.block__floating') || target.closest('[data-floating-trigger]')) return
  closeFloating()
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closeFloating()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentDown, true)
  document.addEventListener('keydown', onEscape)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', reposition)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentDown, true)
  document.removeEventListener('keydown', onEscape)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', reposition)
})

function commit(blocks: ContentBlock[]) {
  emit('update:modelValue', blocks)
}

function patch(index: number, changes: Partial<ContentBlock>) {
  const next = props.modelValue.map((block, position) => (position === index ? { ...block, ...changes } : block))
  commit(next)
}

function insert(kind: BlockKind, at: number) {
  const next = [...props.modelValue]
  next.splice(at, 0, emptyBlock(kind))
  commit(next)
  menuFor.value = null
}

function move(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= props.modelValue.length) return
  const next = [...props.modelValue]
  const [item] = next.splice(index, 1)
  if (!item) return
  next.splice(target, 0, item)
  commit(next)
}

function duplicate(index: number) {
  const source = props.modelValue[index]
  if (!source) return
  const next = [...props.modelValue]
  next.splice(index + 1, 0, { ...source, uid: blockUid() })
  commit(next)
}

/** ¿Perdería algo el redactor al borrar este bloque? */
function hasContent(block: ContentBlock) {
  if (block.kind === 'list') return block.items.some((item) => item.trim())
  if (block.kind === 'media') return Boolean(block.assetUrl)
  if (block.kind === 'infographic' || block.kind === 'chart') {
    return Boolean((block.meta as { series?: unknown[] })?.series?.length)
  }
  if (block.kind === 'divider') return Boolean(block.caption.trim())

  const text = (block.text || block.html.replace(/<[^>]+>/g, ' ')).replace(/&nbsp;/g, ' ').trim()
  return text.length > 0
}

/** Resumen corto de lo que se va a borrar, para que la confirmación sea concreta. */
function summaryOf(block: ContentBlock) {
  if (block.kind === 'list') return block.items.filter(Boolean).slice(0, 3).join(' · ')
  if (block.kind === 'media') return block.caption || 'Archivo multimedia adjunto'
  if (block.kind === 'infographic' || block.kind === 'chart') return block.caption || 'Infografía generada'
  if (block.kind === 'divider') return block.caption

  const text = (block.text || block.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  return text.length > 140 ? `${text.slice(0, 140)}…` : text
}

function labelOf(block: ContentBlock) {
  return KINDS.find((kind) => kind.value === block.kind)?.label || 'Bloque'
}

function dropBlock(index: number) {
  const removed = props.modelValue[index]
  const previous = [...props.modelValue]

  commit(props.modelValue.filter((_, position) => position !== index))

  if (removed) {
    // Aunque haya confirmación, deshacer evita el arrepentimiento tardío.
    toasts.undoable(`${labelOf(removed)} eliminado`, summaryOf(removed) || 'Bloque vacío', () => commit(previous))
  }
}

/** Un bloque vacío se va sin preguntar; uno con contenido pide confirmación. */
function remove(index: number) {
  const block = props.modelValue[index]
  if (!block) return

  if (!hasContent(block)) {
    dropBlock(index)
    return
  }

  pendingRemoval.value = index
  confirmOpen.value = true
}

function confirmRemoval() {
  if (pendingRemoval.value !== null) dropBlock(pendingRemoval.value)
  confirmOpen.value = false
  pendingRemoval.value = null
}

function itemsOf(index: number) {
  return props.modelValue[index]?.items || []
}

function setItem(index: number, itemIndex: number, value: string) {
  const items = [...itemsOf(index)]
  items[itemIndex] = value
  patch(index, { items })
}

function addItem(index: number) {
  patch(index, { items: [...itemsOf(index), ''] })
}

function removeItem(index: number, itemIndex: number) {
  patch(index, { items: itemsOf(index).filter((_, position) => position !== itemIndex) })
}

/**
 * Subida directa desde el bloque: es donde el redactor está mirando, así que
 * no tiene sentido obligarlo a bajar al panel de adjuntos.
 */
async function uploadInto(index: number, files: FileList | null) {
  const file = files?.[0]
  draggingAt.value = null
  if (!file) return

  if (file.size > 30 * 1024 * 1024) {
    toasts.warning('Archivo muy grande', `${file.name} supera los 30 MB.`)
    return
  }

  uploadingAt.value = index
  try {
    const dataUrl = await fileToDataUrl(file)
    const { data } = await uploadsApi.upload(dataUrl, file.name)
    const kind = (data.kind as AttachmentKind) || 'image'

    emit('add-attachment', {
      uid: `up_${Math.random().toString(36).slice(2, 10)}`,
      kind,
      url: data.url,
      name: file.name,
      mime: file.type,
      bytes: file.size,
      caption: '',
      provider: 'cloudinary',
      publicId: data.upload?.publicId || '',
      source: 'upload',
    })

    patch(index, { assetUrl: data.url, assetKind: kind })
    toasts.success('Archivo subido', file.name)
  } catch (error) {
    toasts.error('No se pudo subir', apiErrorMessage(error))
  } finally {
    uploadingAt.value = null
  }
}

function specOf(block: ContentBlock) {
  return block.meta as unknown as InfographicSpec
}

</script>

<template>
  <div class="composer">
    <TransitionGroup name="list" tag="div" class="composer__list">
      <article v-for="(block, index) in modelValue" :key="block.uid" class="block">
        <!-- Atajo de borrado: aparece al pasar por encima de la tarjeta -->
        <button
          class="block__close"
          type="button"
          title="Eliminar bloque"
          aria-label="Eliminar bloque"
          @click="remove(index)"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>

        <!-- Cabecera del bloque -->
        <header class="block__head">
          <span class="block__kind">
            <i :class="KINDS.find((k) => k.value === block.kind)?.icon || 'fa-solid fa-paragraph'" aria-hidden="true" />
            <AppSelect
              class="block__kind-select"
              size="sm"
              :model-value="block.kind"
              :options="KIND_OPTIONS"
              @update:model-value="patch(index, { kind: $event as BlockKind })"
            />
          </span>

          <div class="block__tools">
            <!-- Color de sección -->
            <button
              class="block__tool"
              type="button"
              title="Color de la sección"
              data-floating-trigger
              @click="togglePalette(block.uid, $event)"
            >
              <span class="block__dot" :style="{ background: block.color || 'var(--text-dim)' }" />
            </button>

            <Teleport to="body">
              <Transition name="pop">
                <div
                  v-if="paletteFor === block.uid"
                  class="block__floating block__palette"
                  :style="{ top: `${palettePos.top}px`, left: `${palettePos.left}px`, maxHeight: `${palettePos.maxHeight}px` }"
                >
                  <button
                    v-for="color in ACCENT_PALETTE"
                    :key="color"
                    type="button"
                    :style="{ background: color }"
                    :title="color"
                    @click="patch(index, { color }), (paletteFor = null)"
                  />
                  <button
                    class="block__palette-clear"
                    type="button"
                    title="Sin color"
                    @click="patch(index, { color: '' }), (paletteFor = null)"
                  >
                    <i class="fa-solid fa-ban" />
                  </button>
                </div>
              </Transition>
            </Teleport>

            <!-- Sangría -->
            <button class="block__tool" type="button" title="Reducir sangría" @click="patch(index, { indent: Math.max(0, block.indent - 1) })">
              <i class="fa-solid fa-outdent" />
            </button>
            <button class="block__tool" type="button" title="Aumentar sangría" @click="patch(index, { indent: Math.min(5, block.indent + 1) })">
              <i class="fa-solid fa-indent" />
            </button>

            <!-- Alineación por bloque -->
            <AppSelect
              class="block__inline-select"
              size="sm"
              title="Alineación del bloque"
              :model-value="block.align"
              :options="ALIGN_OPTIONS"
              @update:model-value="patch(index, { align: $event as Align })"
            />

            <AppSelect
              class="block__inline-select block__inline-select--tight"
              size="sm"
              title="Interlineado del bloque"
              :model-value="block.lineHeight"
              :options="LINE_HEIGHT_OPTIONS"
              @update:model-value="patch(index, { lineHeight: Number($event) })"
            />

            <span class="block__sep" />

            <button class="block__tool" type="button" title="Subir" @click="move(index, -1)">
              <i class="fa-solid fa-arrow-up" />
            </button>
            <button class="block__tool" type="button" title="Bajar" @click="move(index, 1)">
              <i class="fa-solid fa-arrow-down" />
            </button>
            <button class="block__tool" type="button" title="Duplicar" @click="duplicate(index)">
              <i class="fa-regular fa-clone" />
            </button>
            <button
              class="block__tool block__tool--danger"
              type="button"
              title="Eliminar bloque"
              aria-label="Eliminar bloque"
              @click="remove(index)"
            >
              <i class="fa-regular fa-trash-can" />
            </button>
          </div>
        </header>

        <!-- Cuerpo -->
        <div
          class="block__body"
          :style="{
            paddingInlineStart: `${block.indent * 24}px`,
            textAlign: block.align,
            borderInlineStartColor: block.color || 'transparent',
          }"
        >
          <div v-if="block.kind === 'divider'" class="block__divider">
            <span :style="{ background: block.color || 'var(--line-strong)' }" />
            <input
              class="block__caption"
              :value="block.caption"
              placeholder="Etiqueta de la sección (opcional)"
              @input="patch(index, { caption: ($event.target as HTMLInputElement).value })"
            />
          </div>

          <div v-else-if="block.kind === 'list'" class="block__list">
            <div v-for="(item, itemIndex) in block.items" :key="itemIndex" class="block__list-row">
              <span class="block__bullet">{{ block.ordered ? `${itemIndex + 1}.` : '•' }}</span>
              <input
                :value="item"
                placeholder="Punto de la lista"
                @input="setItem(index, itemIndex, ($event.target as HTMLInputElement).value)"
              />
              <button type="button" title="Quitar" @click="removeItem(index, itemIndex)">
                <i class="fa-solid fa-xmark" />
              </button>
            </div>

            <div class="block__list-actions">
              <AppButton size="sm" variant="ghost" icon="fa-solid fa-plus" @click="addItem(index)">Agregar punto</AppButton>
              <AppButton
                size="sm"
                variant="ghost"
                :icon="block.ordered ? 'fa-solid fa-list-ol' : 'fa-solid fa-list-ul'"
                @click="patch(index, { ordered: !block.ordered })"
              >
                {{ block.ordered ? 'Numerada' : 'Con viñetas' }}
              </AppButton>
            </div>
          </div>

          <div v-else-if="block.kind === 'media'" class="block__media">
            <label
              v-if="!block.assetUrl"
              :class="['block__drop', { 'block__drop--over': draggingAt === index, 'block__drop--busy': uploadingAt === index }]"
              @dragover.prevent="draggingAt = index"
              @dragleave.prevent="draggingAt = null"
              @drop.prevent="uploadInto(index, $event.dataTransfer?.files || null)"
            >
              <input
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                @change="uploadInto(index, ($event.target as HTMLInputElement).files)"
              />
              <i :class="uploadingAt === index ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-cloud-arrow-up'" />
              <strong>{{ uploadingAt === index ? 'Subiendo…' : 'Arrastra una imagen o video corto' }}</strong>
              <span>o haz clic para buscarlo · máx. 30 MB</span>
            </label>

            <div v-if="block.assetUrl" class="block__media-preview">
              <img v-if="block.assetKind === 'image'" :src="block.assetUrl" :alt="block.caption" />
              <video v-else-if="block.assetKind === 'video'" :src="block.assetUrl" controls />
              <audio v-else-if="block.assetKind === 'audio'" :src="block.assetUrl" controls />
              <a v-else :href="block.assetUrl" target="_blank" rel="noreferrer">
                <i class="fa-regular fa-file-lines" /> {{ block.caption || 'Documento adjunto' }}
              </a>
            </div>

            <AppSelect
              :model-value="block.assetUrl"
              :options="assetOptions"
              placeholder="Selecciona un adjunto…"
              @update:model-value="
                patch(index, {
                  assetUrl: String($event),
                  assetKind: attachments.find((a) => a.url === $event)?.kind || 'image',
                })
              "
            />

            <input
              class="block__caption"
              :value="block.caption"
              placeholder="Pie de foto / descripción"
              @input="patch(index, { caption: ($event.target as HTMLInputElement).value })"
            />

            <div v-if="block.assetUrl" class="block__media-actions">
              <AppButton size="sm" variant="ghost" icon="fa-solid fa-xmark" @click="patch(index, { assetUrl: '' })">
                Quitar archivo
              </AppButton>
            </div>
          </div>

          <div v-else-if="block.kind === 'infographic' || block.kind === 'chart'" class="block__info">
            <InfographicView v-if="specOf(block)?.series?.length" :spec="specOf(block)" />
            <p v-else class="block__hint">
              Genera una infografía desde el panel de IA y se insertará automáticamente en este bloque.
            </p>
            <input
              class="block__caption"
              :value="block.caption"
              placeholder="Título del gráfico"
              @input="patch(index, { caption: ($event.target as HTMLInputElement).value })"
            />
          </div>

          <RichEditor
            v-else
            :model-value="block.html"
            :placeholder="block.kind === 'intertitle' ? 'Intertítulo…' : 'Escribe el contenido…'"
            :compact="block.kind !== 'paragraph'"
            min-height="110px"
            @update:model-value="patch(index, { html: $event })"
            @text="patch(index, { text: $event })"
          />
        </div>

        <!-- Insertar debajo -->
        <div class="block__insert">
          <button type="button" data-floating-trigger @click="toggleInsertMenu(index, $event)">
            <i class="fa-solid fa-plus" /> Insertar bloque
          </button>

          <Teleport to="body">
            <Transition name="pop">
              <div
                v-if="menuFor === index"
                class="block__floating block__menu"
                :style="{ top: `${menuPos.top}px`, left: `${menuPos.left}px`, maxHeight: `${menuPos.maxHeight}px` }"
              >
                <p class="block__menu-title">Insertar debajo</p>
                <button v-for="kind in KINDS" :key="kind.value" type="button" @click="insert(kind.value, index + 1)">
                  <i :class="kind.icon" /> {{ kind.label }}
                </button>
              </div>
            </Transition>
          </Teleport>
        </div>
      </article>
    </TransitionGroup>

    <ConfirmDialog
      v-model="confirmOpen"
      :title="pendingBlock ? `¿Eliminar este ${labelOf(pendingBlock).toLowerCase()}?` : '¿Eliminar bloque?'"
      :message="
        pendingBlock
          ? `Se perderá: «${summaryOf(pendingBlock)}». Podrás deshacerlo desde el aviso.`
          : 'Este bloque se eliminará del reportaje.'
      "
      confirm-label="Eliminar bloque"
      @confirm="confirmRemoval"
    />

    <div class="composer__empty-actions">
      <AppButton variant="outline" icon="fa-solid fa-plus" @click="insert('paragraph', modelValue.length)">
        Agregar párrafo
      </AppButton>
      <AppButton variant="ghost" icon="fa-solid fa-grip-lines" @click="insert('divider', modelValue.length)">
        División por color
      </AppButton>
      <AppButton variant="ghost" icon="fa-solid fa-photo-film" @click="insert('media', modelValue.length)">
        Multimedia
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.composer {
  @include col(var(--s-4));
}

.composer__list {
  @include col(var(--s-4));
  position: relative;
}

.block {
  position: relative;
  @include col(var(--s-3));
  padding: var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  transition: border-color var(--t-fast) var(--ease);

  &:hover {
    border-color: var(--line-strong);
  }

  &:hover .block__close,
  &:focus-within .block__close {
    opacity: 1;
    transform: scale(1);
  }
}

.block__close {
  position: absolute;
  inset-block-start: calc(-1 * var(--s-3));
  inset-inline-end: calc(-1 * var(--s-3));
  z-index: 3;
  @include row(0, center, center);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ink-700);
  border: 1px solid var(--line-strong);
  color: var(--text-muted);
  font-size: 12px;
  opacity: 0;
  transform: scale(0.8);
  transition:
    opacity var(--t-fast) var(--ease),
    transform var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    background: var(--danger);
    border-color: var(--danger);
    color: #fff;
  }

  &:focus-visible {
    opacity: 1;
    transform: scale(1);
  }

  @include mobile {
    opacity: 1;
    transform: scale(1);
  }
}

.block__head {
  @include row(var(--s-3), center, space-between);
  flex-wrap: wrap;
}

.block__kind {
  @include row(var(--s-2), center);
  color: var(--text-muted);
  font-size: 12px;

}

.block__tools {
  @include row(2px, center);
  flex-wrap: wrap;
}

.block__tool {
  @include row(0, center, center);
  width: 28px;
  height: 28px;
  border-radius: var(--r-xs);
  font-size: 11px;
  color: var(--text-dim);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.block__tool--danger:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.block__dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
}

/* Los flotantes viven en body, por encima de todo el editor. */
.block__floating {
  position: fixed;
  z-index: 950;
  border-radius: var(--r-md);
  background: var(--ink-750);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
}

.block__palette {
  @include wrap(5px);
  width: 156px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--s-3);

  button {
    width: 24px;
    height: 24px;
    border-radius: var(--r-xs);
    border: 1px solid var(--line-strong);
    transition: transform var(--t-fast) var(--ease);

    &:hover {
      transform: scale(1.12);
    }
  }
}

.block__palette-clear {
  background: var(--surface-hover);
  color: var(--text-dim);
  font-size: 10px;
}

.block__kind-select {
  width: 190px;
}

.block__inline-select {
  width: 132px;
}

.block__inline-select--tight {
  width: 78px;
}

.block__sep {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--line);
}

.block__body {
  border-inline-start: 2px solid transparent;
  padding-inline-start: 0;
  transition: padding var(--t-base) var(--ease);
}

.block__divider {
  @include col(var(--s-2));

  span {
    display: block;
    height: 3px;
    border-radius: var(--r-pill);
  }
}

.block__caption,
.block__list-row input {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 9px 12px;
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--brand-line);
  }
}

.block__list {
  @include col(var(--s-2));
}

.block__list-row {
  @include row(var(--s-2), center);

  button {
    color: var(--text-dim);
    padding: 6px;

    &:hover {
      color: var(--danger);
    }
  }
}

.block__bullet {
  flex-shrink: 0;
  width: 22px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
}

.block__list-actions {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
}

.block__media {
  @include col(var(--s-3));
}

.block__drop {
  @include col(var(--s-2), center);
  justify-content: center;
  padding: var(--s-6) var(--s-4);
  border-radius: var(--r-md);
  border: 1px dashed var(--line-strong);
  text-align: center;
  cursor: pointer;
  transition:
    border-color var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease);

  input {
    display: none;
  }

  i {
    font-size: 20px;
    color: var(--text-dim);
  }

  strong {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
  }

  span {
    @include eyebrow;
    font-size: 9px;
  }

  &:hover {
    border-color: var(--brand-line);
  }
}

.block__drop--over {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.block__drop--busy {
  border-color: var(--iris);
  background: var(--iris-soft);
  pointer-events: none;
}

.block__media-actions {
  @include row(var(--s-2), center);
}

.block__media-preview {
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--surface-sunken);

  img,
  video {
    width: 100%;
    max-height: 320px;
    object-fit: cover;
    display: block;
  }

  audio {
    width: 100%;
    padding: var(--s-3);
  }

  a {
    @include row(var(--s-2), center);
    padding: var(--s-4);
    color: var(--brand-strong);
    font-size: 13px;
  }
}

.block__info {
  @include col(var(--s-3));
}

.block__hint {
  padding: var(--s-4);
  border-radius: var(--r-md);
  border: 1px dashed var(--line-strong);
  font-size: 13px;
  color: var(--text-dim);
}

.block__insert {
  position: relative;
  @include row(0, center, center);

  > button {
    @include row(var(--s-2), center);
    padding: 5px 14px;
    border-radius: var(--r-pill);
    border: 1px dashed var(--line-strong);
    font-size: 11px;
    color: var(--text-dim);
    transition:
      color var(--t-fast) var(--ease),
      border-color var(--t-fast) var(--ease);

    &:hover {
      color: var(--brand-strong);
      border-color: var(--brand-line);
    }
  }
}

.block__menu {
  @include col(2px);
  width: 230px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--s-2);
  @include scrollbar;

  button {
    @include row(var(--s-3), center);
    padding: 8px var(--s-3);
    border-radius: var(--r-xs);
    font-size: 13px;
    color: var(--text-muted);
    text-align: start;

    i {
      width: 16px;
      font-size: 11px;
    }

    &:hover {
      background: var(--surface-hover);
      color: var(--text);
    }
  }
}

.block__menu-title {
  @include eyebrow;
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--s-2) var(--s-3) var(--s-1);
  background: var(--ink-750);
}

.composer__empty-actions {
  @include row(var(--s-2), center, center);
  flex-wrap: wrap;
}
</style>
