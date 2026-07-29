<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import APIBase from '@/services/httpBase'
import { useUserStore } from '@/stores/user'

interface Article {
  _id: string
  title: string
  summary: string
  description: string
  photo: string
  publishedAt: string
}

class ReaderService extends APIBase {
  async list() {
    const response = await this.get<{ data: Article[] }>('/articles/public', {})
    return response.data.data
  }
}

const router = useRouter()
const userStore = useUserStore()
const articles = ref<Article[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    articles.value = await new ReaderService().list()
  } finally {
    loading.value = false
  }
})

function logout() {
  userStore.clear()
  router.replace('/login')
}
</script>

<template>
  <main class="reader">
    <header>
      <strong>OFF THE RECORD</strong>
      <button type="button" @click="logout">Cerrar sesión</button>
    </header>
    <section class="reader__intro">
      <p>Lecturas</p>
      <h1>Noticias publicadas</h1>
    </section>
    <section class="reader__feed" aria-live="polite">
      <p v-if="loading">Cargando noticias...</p>
      <p v-else-if="!articles.length">Aún no hay noticias publicadas.</p>
      <article v-for="article in articles" :key="article._id">
        <img v-if="article.photo" :src="article.photo" :alt="article.title" />
        <div>
          <time>{{ new Date(article.publishedAt).toLocaleDateString('es-ES') }}</time>
          <h2>{{ article.title }}</h2>
          <p>{{ article.summary || article.description }}</p>
        </div>
      </article>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.reader { min-height: 100svh; padding: 1.5rem; background: #f5f2ed; color: #101b32; }
header, .reader__intro, .reader__feed { width: min(100%, 900px); margin-inline: auto; }
header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid rgba(16, 27, 50, .15); letter-spacing: .1em; }
header button { border: 0; background: transparent; color: #101b32; cursor: pointer; }
.reader__intro { padding: 4rem 0 2.5rem; }.reader__intro p, time { color: #b4382b; font-size: .75rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
h1 { margin: .5rem 0; font-family: var(--font-display); font-size: clamp(2.6rem, 7vw, 5rem); letter-spacing: -.06em; }
.reader__feed { display: grid; }.reader__feed > p { padding: 1.5rem 0; color: rgba(16, 27, 50, .68); }
article { display: grid; gap: 1rem; padding: 1.5rem 0; border-top: 1px solid rgba(16, 27, 50, .14); } article img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
h2 { margin: .5rem 0; font-family: var(--font-display); font-size: clamp(1.7rem, 4vw, 2.8rem); letter-spacing: -.05em; } article p { color: rgba(16, 27, 50, .72); line-height: 1.65; }
@media (min-width: 720px) { .reader { padding: 2rem; } article { grid-template-columns: 300px 1fr; gap: 2rem; } }
</style>
