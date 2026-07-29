<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resourceService } from '@/services/resources'
import { uploadService } from '@/services/uploads'

type Status = 'draft' | 'scheduled' | 'published'

const route = useRoute()
const router = useRouter()
const isEditing = computed(() => typeof route.params.id === 'string')
const loading = ref(isEditing.value)
const saving = ref(false)
const uploading = ref(false)
const error = ref('')
const form = reactive({ title: '', summary: '', description: '', photo: '', typeId: 1, status: 'draft' as Status, scheduledFor: '' })

const statusCopy: Record<Status, { label: string; hint: string; icon: string }> = {
  draft: { label: 'Borrador', hint: 'Solo visible para el equipo editorial.', icon: 'fa-file-pen' },
  scheduled: { label: 'Programada', hint: 'Se publicará automáticamente en la fecha indicada.', icon: 'fa-clock' },
  published: { label: 'Publicada', hint: 'Quedará disponible de inmediato para lectores.', icon: 'fa-circle-check' },
}

const readingTime = computed(() => Math.max(1, Math.ceil(`${form.summary} ${form.description}`.trim().split(/\s+/).filter(Boolean).length / 200)))
const previewDate = computed(() => form.status === 'scheduled' && form.scheduledFor ? new Date(form.scheduledFor).toLocaleString('es-ES') : 'Ahora')

function datetimeValue(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

async function loadArticle() {
  if (!isEditing.value) return
  try {
    const response = await resourceService.getOne<Record<string, unknown>>(`/articles/${route.params.id}`)
    const article = response.data
    form.title = String(article.title || '')
    form.summary = String(article.summary || '')
    form.description = String(article.description || '')
    form.photo = String(article.photo || '')
    form.typeId = Number(article.typeId || 1)
    form.status = ['draft', 'scheduled', 'published'].includes(String(article.status)) ? article.status as Status : 'draft'
    form.scheduledFor = datetimeValue(article.scheduledFor)
  } catch {
    error.value = 'No se pudo cargar el artículo.'
  } finally {
    loading.value = false
  }
}

async function saveArticle() {
  error.value = ''
  if (!form.title.trim()) {
    error.value = 'El título es obligatorio.'
    return
  }
  if (form.status === 'scheduled' && !form.scheduledFor) {
    error.value = 'Selecciona la fecha y hora de publicación.'
    return
  }

  saving.value = true
  const payload = { ...form, scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null }
  try {
    if (isEditing.value) await resourceService.update(`/articles/${route.params.id}`, payload)
    else await resourceService.create('/articles', payload)
    await router.push('/admin/articles')
  } catch (err: unknown) {
    error.value = typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : 'No se pudo guardar el artículo.'
  } finally {
    saving.value = false
  }
}

async function uploadCover(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'Selecciona una imagen válida.'
    return
  }
  if (file.size > 7 * 1024 * 1024) {
    error.value = 'La imagen no puede superar 7 MB.'
    return
  }

  error.value = ''
  uploading.value = true
  try {
    form.photo = await uploadService.uploadImage(file)
  } catch (err: unknown) {
    error.value = typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : 'No se pudo subir la imagen.'
  } finally {
    uploading.value = false
  }
}

onMounted(loadArticle)
</script>

<template>
  <div class="article-editor">
    <header class="article-editor__topbar">
      <button class="back-button" type="button" @click="router.push('/admin/articles')"><i class="fa-solid fa-arrow-left"></i> Artículos</button>
      <div class="editor-status"><i class="fa-solid" :class="statusCopy[form.status].icon"></i>{{ statusCopy[form.status].label }}</div>
    </header>

    <div v-if="loading" class="editor-skeleton" aria-label="Cargando editor">
      <span></span><span></span><span></span><span></span>
    </div>

    <form v-else class="editor-layout" @submit.prevent="saveArticle">
      <section class="editor-form surface-card">
        <div class="editor-heading">
          <p class="section-label">{{ isEditing ? 'Edición' : 'Nueva publicación' }}</p>
          <h1 class="section-title">{{ isEditing ? 'Refina la historia' : 'Escribe una historia' }}</h1>
          <p>Guarda cuando quieras, programa su salida o publícala ahora.</p>
        </div>

        <label class="field field--title"><span>Titular</span><input v-model="form.title" required placeholder="El titular que abre la conversación" /></label>
        <label class="field"><span>Resumen</span><textarea v-model="form.summary" rows="3" placeholder="La idea esencial para la portada"></textarea></label>
        <label class="field"><span>Historia</span><textarea v-model="form.description" rows="12" placeholder="Escribe el desarrollo de la noticia..."></textarea></label>
        <div class="cover-upload">
          <label class="field"><span>Imagen de portada (URL)</span><input v-model="form.photo" type="url" placeholder="https://..."></label>
          <label class="upload-button" :class="{ 'upload-button--loading': uploading }"><input type="file" accept="image/*" :disabled="uploading" @change="uploadCover"><i class="fa-solid" :class="uploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'"></i>{{ uploading ? 'Subiendo imagen...' : 'Subir a Cloudinary' }}</label>
        </div>

        <section class="publication-controls">
          <div><span class="field-label">Estado de publicación</span><p>{{ statusCopy[form.status].hint }}</p></div>
          <div class="status-options">
            <button v-for="option in (Object.keys(statusCopy) as Status[])" :key="option" type="button" :class="{ active: form.status === option }" @click="form.status = option"><i class="fa-solid" :class="statusCopy[option].icon"></i>{{ statusCopy[option].label }}</button>
          </div>
          <label v-if="form.status === 'scheduled'" class="field"><span>Fecha y hora</span><input v-model="form.scheduledFor" type="datetime-local" :min="new Date().toISOString().slice(0, 16)" /></label>
        </section>

        <p v-if="error" class="editor-error" role="alert"><i class="fa-solid fa-circle-exclamation"></i>{{ error }}</p>
        <footer class="editor-actions"><button class="ghost-button" type="button" @click="router.push('/admin/articles')">Cancelar</button><button class="primary-button" type="submit" :disabled="saving"><i v-if="saving" class="fa-solid fa-spinner fa-spin"></i><i v-else class="fa-solid fa-floppy-disk"></i>{{ saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar artículo' }}</button></footer>
      </section>

      <aside class="preview-panel">
        <div class="preview-panel__head"><span>Previsualización</span><span>{{ readingTime }} min de lectura</span></div>
        <article class="article-preview">
          <img v-if="form.photo" :src="form.photo" alt="Previsualización de portada" />
          <div v-else class="article-preview__image"><i class="fa-regular fa-image"></i></div>
          <div class="article-preview__body"><span>{{ previewDate }}</span><h2>{{ form.title || 'El titular aparecerá aquí' }}</h2><p>{{ form.summary || 'El resumen le dará contexto a tus lectores.' }}</p><div class="article-preview__rule"></div><p class="article-preview__story">{{ form.description || 'La historia completa se verá aquí mientras escribes.' }}</p></div>
        </article>
      </aside>
    </form>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;
.article-editor { display: grid; gap: 1rem; animation: editor-in .45s ease both; }.article-editor__topbar { display: flex; align-items: center; justify-content: space-between; }.back-button { border: 0; background: transparent; color: $text-light; cursor: pointer; font-weight: 700; }.back-button i, .editor-status i { margin-right: .5rem; }.editor-status { padding: .45rem .7rem; border: 1px solid rgba(255,255,255,.14); border-radius: 999px; color: $text-light; font-size: .78rem; }
.editor-layout { display: grid; gap: 1rem; align-items: start; }.editor-form { padding: clamp(1.25rem, 3vw, 2rem); display: grid; gap: 1.25rem; }.editor-heading p:not(.section-label) { margin-top: .5rem; color: rgba(1,13,39,.65); }.editor-heading .section-title { color: $primary-dark; font-size: clamp(2rem, 5vw, 3.6rem); }.field { display: grid; gap: .45rem; }.field span, .field-label { color: rgba(1,13,39,.72); font-size: .75rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }.field input, .field textarea { width: 100%; border: 1px solid rgba(1,13,39,.12); border-radius: 14px; padding: .9rem 1rem; color: $primary-dark; background: rgba(1,13,39,.025); font: inherit; outline: none; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }.field textarea { resize: vertical; line-height: 1.6; }.field input:focus, .field textarea:focus { background: #fff; border-color: $accent-red; box-shadow: 0 0 0 4px rgba(200,57,43,.1); }.field--title input { font-family: var(--font-display); font-size: clamp(1.4rem, 4vw, 2.2rem); letter-spacing: -.04em; }
.publication-controls { display: grid; gap: .85rem; padding: 1rem; border-radius: 18px; background: rgba(1,13,39,.035); }.publication-controls p { margin-top: .25rem; color: rgba(1,13,39,.62); font-size: .9rem; }.status-options { display: grid; gap: .55rem; grid-template-columns: repeat(3, minmax(0,1fr)); }.status-options button { min-height: 76px; border: 1px solid rgba(1,13,39,.12); border-radius: 14px; background: #fff; color: $primary-dark; cursor: pointer; font-weight: 700; transition: transform .18s ease, background .18s ease, color .18s ease; }.status-options button i { display: block; margin-bottom: .35rem; color: $accent-red; }.status-options button:hover { transform: translateY(-2px); }.status-options button.active { color: #fff; background: $primary-dark; border-color: $primary-dark; }.status-options button.active i { color: #efb5a8; }.editor-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .7rem; }.editor-actions .ghost-button { color: $primary-dark; border-color: rgba(1,13,39,.14); background: rgba(1,13,39,.05); }.editor-error { padding: .8rem; border-radius: 12px; color: #b42318; background: #fef3f2; }.editor-error i { margin-right: .5rem; }
.cover-upload { display: grid; gap: 0.7rem; }.upload-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 46px; border: 1px dashed rgba(200,57,43,.45); border-radius: 14px; color: $accent-red; background: rgba(200,57,43,.06); cursor: pointer; font-weight: 700; transition: background .18s ease, border-color .18s ease; }.upload-button:hover { background: rgba(200,57,43,.12); border-color: $accent-red; }.upload-button input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }.upload-button--loading { color: rgba(1,13,39,.58); cursor: wait; }
.preview-panel { position: sticky; top: 0; display: grid; gap: .7rem; }.preview-panel__head { display: flex; justify-content: space-between; color: rgba(246,241,232,.74); font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; }.article-preview { overflow: hidden; border-radius: 22px; background: #f5f2ed; box-shadow: 0 24px 70px rgba(0,0,0,.24); }.article-preview img, .article-preview__image { width: 100%; aspect-ratio: 16/9; object-fit: cover; }.article-preview__image { display: grid; place-items: center; background: linear-gradient(135deg,#1c2948,#8f2b27); color: rgba(255,255,255,.74); font-size: 2rem; }.article-preview__body { padding: 1.4rem; color: $primary-dark; }.article-preview__body > span { color: $accent-red; font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }.article-preview h2 { margin: .6rem 0; font-family: var(--font-display); font-size: clamp(2rem,4vw,3.2rem); line-height: .95; letter-spacing: -.06em; }.article-preview p { color: rgba(1,13,39,.72); line-height: 1.6; }.article-preview__rule { width: 54px; height: 2px; margin: 1.2rem 0; background: $accent-red; }.article-preview__story { white-space: pre-line; }
.editor-skeleton { display: grid; gap: 1rem; }.editor-skeleton span { height: 110px; border-radius: 20px; background: linear-gradient(90deg,rgba(255,255,255,.07),rgba(255,255,255,.17),rgba(255,255,255,.07)); background-size: 200% 100%; animation: shimmer 1.3s infinite; }.editor-skeleton span:nth-child(2) { height: 180px; }.editor-skeleton span:nth-child(3) { height: 260px; }@keyframes shimmer { to { background-position: -200% 0; } }@keyframes editor-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (min-width: 1050px) { .editor-layout { grid-template-columns: minmax(0,1.2fr) minmax(360px,.8fr); } }.editor-actions .primary-button i { margin-right: .4rem; }@media (max-width: 560px) { .status-options { grid-template-columns: 1fr; }.editor-actions > * { flex: 1; } }
</style>
