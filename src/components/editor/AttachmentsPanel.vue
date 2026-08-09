<script setup lang="ts">
import { ref } from 'vue'
import { fileToDataUrl, uploadsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { formatBytes } from '@/composables/useFormat'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { Attachment, AttachmentKind } from '@/types'

const props = defineProps<{ modelValue: Attachment[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: Attachment[]): void }>()

const toasts = useToastStore()
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const dragging = ref(false)

const ICONS: Record<AttachmentKind, string> = {
  image: 'fa-regular fa-image',
  video: 'fa-solid fa-film',
  audio: 'fa-solid fa-headphones',
  document: 'fa-regular fa-file-lines',
}

function kindOf(mime: string): AttachmentKind {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

async function handleFiles(files: FileList | null) {
  if (!files?.length) return

  uploading.value = true
  const added: Attachment[] = []

  for (const file of Array.from(files)) {
    if (file.size > 30 * 1024 * 1024) {
      toasts.warning('Archivo muy grande', `${file.name} supera los 30 MB.`)
      continue
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      const { data } = await uploadsApi.upload(dataUrl, file.name)

      added.push({
        uid: `a_${Math.random().toString(36).slice(2, 10)}`,
        kind: (data.kind as AttachmentKind) || kindOf(file.type),
        url: data.url,
        name: file.name,
        mime: file.type,
        bytes: file.size,
        caption: '',
        provider: 'cloudinary',
        publicId: data.upload?.publicId || '',
        source: 'upload',
      })
    } catch (error) {
      toasts.error(`No se pudo subir ${file.name}`, apiErrorMessage(error))
    }
  }

  if (added.length) {
    emit('update:modelValue', [...props.modelValue, ...added])
    toasts.success(`${added.length} archivo(s) adjunto(s)`, 'Ya puedes insertarlos en un bloque multimedia.')
  }

  uploading.value = false
  if (input.value) input.value.value = ''
}

function remove(uid: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((item) => item.uid !== uid),
  )
}

function setCaption(uid: string, caption: string) {
  emit(
    'update:modelValue',
    props.modelValue.map((item) => (item.uid === uid ? { ...item, caption } : item)),
  )
}

function onDrop(event: DragEvent) {
  dragging.value = false
  void handleFiles(event.dataTransfer?.files || null)
}
</script>

<template>
  <AppPanel title="Adjuntos" detail="Documentos, fotos, audios y videos" icon="fa-solid fa-paperclip" tone="var(--ocean)">
    <template #actions>
      <AppButton size="sm" variant="outline" icon="fa-solid fa-upload" :loading="uploading" @click="input?.click()">
        Subir
      </AppButton>
    </template>

    <div
      :class="['drop', { 'drop--active': dragging }]"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="input"
        class="drop__input"
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        @change="handleFiles(($event.target as HTMLInputElement).files)"
      />

      <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
      <p>Arrastra archivos aquí o <button type="button" @click="input?.click()">búscalos</button></p>
      <span>Imágenes, video, audio y documentos · máx. 30 MB c/u</span>
    </div>

    <TransitionGroup v-if="modelValue.length" name="list" tag="div" class="assets">
      <article v-for="asset in modelValue" :key="asset.uid" class="asset">
        <span class="asset__thumb">
          <img v-if="asset.kind === 'image'" :src="asset.url" :alt="asset.name" />
          <i v-else :class="ICONS[asset.kind]" aria-hidden="true" />
        </span>

        <div class="asset__main">
          <a :href="asset.url" target="_blank" rel="noreferrer">{{ asset.name }}</a>
          <input
            :value="asset.caption"
            placeholder="Pie de foto / descripción"
            @input="setCaption(asset.uid, ($event.target as HTMLInputElement).value)"
          />
          <span>{{ asset.kind }} · {{ formatBytes(asset.bytes) }}</span>
        </div>

        <button class="asset__remove" type="button" title="Quitar" @click="remove(asset.uid)">
          <i class="fa-regular fa-trash-can" aria-hidden="true" />
        </button>
      </article>
    </TransitionGroup>

    <EmptyState v-else icon="fa-solid fa-paperclip" title="Sin adjuntos" detail="Sube el material de respaldo del reportaje." />
  </AppPanel>
</template>

<style scoped lang="scss">
.drop {
  @include col(var(--s-2), center);
  justify-content: center;
  padding: var(--s-6);
  margin-bottom: var(--s-4);
  border-radius: var(--r-md);
  border: 1px dashed var(--line-strong);
  text-align: center;
  transition:
    border-color var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease);

  i {
    font-size: 22px;
    color: var(--text-dim);
  }

  p {
    font-size: 13px;
    color: var(--text-muted);

    button {
      color: var(--brand-strong);
      text-decoration: underline;
    }
  }

  span {
    @include eyebrow;
    font-size: 9px;
  }
}

.drop--active {
  border-color: var(--brand-line);
  background: var(--brand-soft);
}

.drop__input {
  display: none;
}

.assets {
  @include col(var(--s-2));
  position: relative;
}

.asset {
  @include row(var(--s-3), center);
  padding: var(--s-2);
  border-radius: var(--r-sm);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
}

.asset__thumb {
  @include row(0, center, center);
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--r-xs);
  background: var(--ink-700);
  color: var(--text-dim);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.asset__main {
  @include col(3px);
  flex: 1;
  min-width: 0;

  a {
    font-size: 13px;
    color: var(--text);
    @include truncate;

    &:hover {
      color: var(--brand-strong);
    }
  }

  input {
    width: 100%;
    padding: 4px 8px;
    border-radius: var(--r-xs);
    background: var(--ink-800);
    border: 1px solid var(--line);
    font-size: 12px;

    &:focus {
      outline: none;
      border-color: var(--brand-line);
    }
  }

  span {
    @include eyebrow;
    font-size: 9px;
  }
}

.asset__remove {
  flex-shrink: 0;
  padding: 6px;
  color: var(--text-dim);

  &:hover {
    color: var(--danger);
  }
}
</style>
