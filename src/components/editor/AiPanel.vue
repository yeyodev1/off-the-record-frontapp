<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { aiApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { emptyBlock } from '@/composables/useBlocks'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import InfographicView from '@/components/charts/InfographicView.vue'
import type { AiCapabilities, Attachment, ContentBlock, InfographicSpec } from '@/types'

const props = defineProps<{ body: string; title: string }>()

const emit = defineEmits<{
  (e: 'apply-summary', value: string): void
  (e: 'apply-title', value: string): void
  (e: 'add-block', value: ContentBlock): void
  (e: 'add-attachment', value: Attachment): void
}>()

const toasts = useToastStore()

const capabilities = ref<AiCapabilities | null>(null)
const busy = ref('')
const headlines = ref<{ title: string; angle: string; weight: number }[]>([])
const infographic = ref<InfographicSpec | null>(null)
const imageStyle = ref('fotoperiodismo editorial')
const videoJob = ref('')

const STYLE_OPTIONS = [
  { value: 'fotoperiodismo editorial', label: 'Fotoperiodismo editorial' },
  { value: 'ilustración conceptual', label: 'Ilustración conceptual' },
  { value: 'documental en blanco y negro', label: 'Documental b/n' },
  { value: 'render isométrico de datos', label: 'Render de datos' },
]

function assertBody() {
  if (props.body.trim().length >= 60) return true
  toasts.warning('Escribe un poco más', 'La IA necesita al menos un par de párrafos para trabajar.')
  return false
}

async function run<T>(key: string, task: () => Promise<T>, onDone: (value: T) => void) {
  busy.value = key
  try {
    onDone(await task())
  } catch (error) {
    toasts.error('La IA no pudo completar la tarea', apiErrorMessage(error))
  } finally {
    busy.value = ''
  }
}

async function makeSummary() {
  if (!assertBody()) return
  await run(
    'summary',
    () => aiApi.summary(props.body),
    ({ data }) => {
      emit('apply-summary', data.text)
      toasts.success('Sumario generado', 'Se aplicó al campo de sumario.')
    },
  )
}

async function makeIntertitles() {
  if (!assertBody()) return
  await run(
    'intertitles',
    () => aiApi.intertitles(props.body),
    ({ data }) => {
      data.forEach((entry) => {
        emit('add-block', { ...emptyBlock('intertitle'), html: `<p>${entry.text}</p>`, text: entry.text, color: entry.color })
      })
      toasts.success(`${data.length} intertítulos añadidos`, 'Reordénalos donde correspondan.')
    },
  )
}

async function makeHeadlines() {
  if (!assertBody()) return
  await run(
    'headlines',
    () => aiApi.headlines(props.body),
    ({ data }) => {
      headlines.value = data
    },
  )
}

async function makeInfographic() {
  if (!assertBody()) return
  await run(
    'infographic',
    () => aiApi.infographic(props.body),
    ({ data }) => {
      infographic.value = data
    },
  )
}

function insertInfographic() {
  if (!infographic.value) return
  emit('add-block', {
    ...emptyBlock('infographic'),
    caption: infographic.value.title,
    meta: infographic.value as unknown as Record<string, unknown>,
  })
  toasts.success('Infografía insertada', 'Aparece como bloque interactivo en el cuerpo.')
}

async function makeImage() {
  if (!assertBody()) return
  await run(
    'image',
    () => aiApi.image({ body: props.body, style: imageStyle.value }),
    ({ data }) => {
      const attachment: Attachment = {
        uid: `ai_${Math.random().toString(36).slice(2, 10)}`,
        kind: 'image',
        url: data.url,
        name: data.altText || 'Imagen generada por IA',
        mime: 'image/png',
        bytes: 0,
        caption: data.altText || '',
        provider: data.provider,
        publicId: '',
        source: 'ai',
      }
      emit('add-attachment', attachment)
      emit('add-block', {
        ...emptyBlock('media'),
        assetUrl: data.url,
        assetKind: 'image',
        caption: data.altText || '',
      })
      toasts.success('Imagen generada', 'Se añadió como adjunto y bloque multimedia.')
    },
  )
}

async function makeAudio() {
  if (!assertBody()) return
  await run(
    'audio',
    () => aiApi.audio(props.body, `Audio · ${props.title || 'reportaje'}`),
    ({ data }) => {
      emit('add-attachment', {
        uid: `ai_${Math.random().toString(36).slice(2, 10)}`,
        kind: 'audio',
        url: data.url,
        name: `Audio · ${props.title || 'reportaje'}`,
        mime: 'audio/mpeg',
        bytes: 0,
        caption: 'Versión narrada',
        provider: data.provider,
        publicId: '',
        source: 'ai',
      })
      emit('add-block', { ...emptyBlock('media'), assetUrl: data.url, assetKind: 'audio', caption: 'Versión narrada' })
      toasts.success('Audio generado', 'Versión narrada lista para publicar.')
    },
  )
}

function insertVideo(url: string) {
  emit('add-attachment', {
    uid: `ai_${Math.random().toString(36).slice(2, 10)}`,
    kind: 'video',
    url,
    name: `Video · ${props.title || 'reportaje'}`,
    mime: 'video/mp4',
    bytes: 0,
    caption: props.title,
    provider: 'gemini',
    publicId: '',
    source: 'ai',
  })
  emit('add-block', { ...emptyBlock('media'), assetUrl: url, assetKind: 'video', caption: props.title })
}

/**
 * Veo tarda varios minutos, así que el backend devuelve el trabajo en cola y
 * aquí lo sondeamos hasta que el render esté listo.
 */
async function pollVideo(operation: string) {
  const deadline = Date.now() + 10 * 60 * 1000

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 15000))

    try {
      const { data } = await aiApi.videoStatus(operation, props.title)
      if (data.status === 'ready' && data.url) {
        insertVideo(data.url)
        videoJob.value = ''
        toasts.success('Video listo', 'Se insertó como bloque multimedia.')
        return
      }
    } catch (error) {
      videoJob.value = ''
      toasts.error('El render de video falló', apiErrorMessage(error))
      return
    }
  }

  videoJob.value = ''
  toasts.warning('El video sigue procesándose', 'Vuelve a intentarlo en unos minutos.')
}

async function makeVideo() {
  if (!assertBody()) return
  await run(
    'video',
    () => aiApi.video(props.body.slice(0, 1200), props.title),
    ({ data }) => {
      if (data.url) {
        insertVideo(data.url)
        toasts.success('Video generado', 'Se insertó como bloque multimedia.')
        return
      }

      videoJob.value = data.jobId
      toasts.info('Video en proceso', 'Veo tarda unos minutos. Lo insertamos apenas esté listo.')
      void pollVideo(data.jobId)
    },
  )
}

onMounted(async () => {
  try {
    const { data } = await aiApi.capabilities()
    capabilities.value = data
  } catch {
    capabilities.value = {
      provider: 'none',
      reports: false,
      text: false,
      image: false,
      audio: false,
      video: false,
      infographic: false,
      storage: false,
    }
  }
})
</script>

<template>
  <AppPanel
    title="Agente IA"
    detail="Genera material a la par del registro del reportaje"
    icon="fa-solid fa-wand-magic-sparkles"
    tone="var(--iris)"
  >
    <template #actions>
      <AppBadge v-if="capabilities && !capabilities.text" tone="gold" icon="fa-solid fa-triangle-exclamation">
        Sin clave configurada
      </AppBadge>
    </template>

    <div class="ai">
      <div class="ai__actions">
        <AppButton
          size="sm"
          variant="soft"
          icon="fa-solid fa-align-left"
          :loading="busy === 'summary'"
          :disabled="!capabilities?.text"
          @click="makeSummary"
        >
          Sumario
        </AppButton>
        <AppButton
          size="sm"
          variant="soft"
          icon="fa-solid fa-minus"
          :loading="busy === 'intertitles'"
          :disabled="!capabilities?.text"
          @click="makeIntertitles"
        >
          Intertítulos
        </AppButton>
        <AppButton
          size="sm"
          variant="soft"
          icon="fa-solid fa-heading"
          :loading="busy === 'headlines'"
          :disabled="!capabilities?.text"
          @click="makeHeadlines"
        >
          Titulares
        </AppButton>
        <AppButton
          size="sm"
          variant="soft"
          icon="fa-solid fa-chart-pie"
          :loading="busy === 'infographic'"
          :disabled="!capabilities?.infographic"
          @click="makeInfographic"
        >
          Infografía
        </AppButton>
        <AppButton
          size="sm"
          variant="soft"
          icon="fa-regular fa-image"
          :loading="busy === 'image'"
          :disabled="!capabilities?.image"
          @click="makeImage"
        >
          Imagen
        </AppButton>
        <AppButton
          size="sm"
          variant="soft"
          icon="fa-solid fa-headphones"
          :loading="busy === 'audio'"
          :disabled="!capabilities?.audio"
          @click="makeAudio"
        >
          Audio
        </AppButton>
        <AppButton
          size="sm"
          variant="soft"
          icon="fa-solid fa-film"
          :loading="busy === 'video'"
          :disabled="!capabilities?.video"
          @click="makeVideo"
        >
          Video
        </AppButton>
      </div>

      <label class="ai__style">
        <span>Estilo visual</span>
        <AppSelect v-model="imageStyle" :options="STYLE_OPTIONS" size="sm" />
      </label>

      <!-- Titulares propuestos -->
      <Transition name="rise">
        <section v-if="headlines.length" class="ai__block">
          <p class="ai__block-title"><i class="fa-solid fa-heading" /> Titulares propuestos</p>
          <ul class="ai__headlines">
            <li v-for="headline in headlines" :key="headline.title">
              <button type="button" @click="emit('apply-title', headline.title)">
                <strong>{{ headline.title }}</strong>
                <span>{{ headline.angle }}</span>
              </button>
              <span class="ai__weight">{{ Math.round(headline.weight) }}</span>
            </li>
          </ul>
        </section>
      </Transition>

      <!-- Infografía propuesta -->
      <Transition name="rise">
        <section v-if="infographic" class="ai__block">
          <p class="ai__block-title"><i class="fa-solid fa-chart-pie" /> Infografía interactiva</p>
          <InfographicView :spec="infographic" />
          <AppButton size="sm" icon="fa-solid fa-arrow-down" @click="insertInfographic">Insertar en el cuerpo</AppButton>
        </section>
      </Transition>

      <Transition name="rise">
        <p v-if="videoJob" class="ai__rendering">
          <i class="fa-solid fa-circle-notch fa-spin" /> Renderizando video con Veo… se insertará solo al terminar.
        </p>
      </Transition>

      <p v-if="capabilities && !capabilities.storage" class="ai__warning">
        <i class="fa-solid fa-circle-info" /> Configura Cloudinary para almacenar las imágenes y audios generados.
      </p>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.ai {
  @include col(var(--s-4));
}

.ai__actions {
  @include wrap(var(--s-2));
}

.ai__style {
  @include row(var(--s-3), center);
  font-size: 12px;
  color: var(--text-muted);

  > * {
    flex: 1;
  }
}

.ai__block {
  @include col(var(--s-3));
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
}

.ai__block-title {
  @include row(var(--s-2), center);
  @include eyebrow;

  i {
    color: var(--iris);
  }
}

.ai__headlines {
  @include col(var(--s-2));
  list-style: none;

  li {
    @include row(var(--s-3), center);
  }

  button {
    @include col(2px);
    flex: 1;
    padding: var(--s-3);
    border-radius: var(--r-sm);
    border: 1px solid var(--line);
    text-align: start;
    transition:
      border-color var(--t-fast) var(--ease),
      background var(--t-fast) var(--ease);

    strong {
      font-size: 14px;
    }

    span {
      @include eyebrow;
      font-size: 9px;
    }

    &:hover {
      border-color: var(--brand-line);
      background: var(--brand-soft);
    }
  }
}

.ai__weight {
  flex-shrink: 0;
  width: 34px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--gold);
}

.ai__rendering {
  @include row(var(--s-2), center);
  padding: var(--s-3);
  border-radius: var(--r-sm);
  background: var(--iris-soft);
  border: 1px solid rgba(123, 108, 246, 0.35);
  font-size: 12px;
  color: #a99bff;
}

.ai__warning {
  @include row(var(--s-2), flex-start);
  font-size: 12px;
  color: var(--gold);
}
</style>
