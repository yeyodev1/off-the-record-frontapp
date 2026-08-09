<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { useReaderFeedStore } from '@/stores/readerFeed'
import { useSound } from '@/composables/useSound'
import { notificationsApi } from '@/services/api'
import { formatRelative } from '@/composables/useFormat'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { AppNotification } from '@/types'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const toasts = useToastStore()
const feed = useReaderFeedStore()
// Se desestructura para que la plantilla desenvuelva el ref sin `.value`.
const { preference: soundPref, toggle: toggleSound } = useSound()

const notificationsOpen = ref(false)
const navOpen = ref(false)
const notifications = ref<AppNotification[]>([])
const searchEl = ref<HTMLInputElement | null>(null)

/** El cuadro de búsqueda es local; la URL manda sólo cuando se deja de teclear. */
const term = ref(String(route.query.q || ''))
let debounce: ReturnType<typeof setTimeout> | undefined

const unread = computed(
  () => notifications.value.filter((item) => !item.readBy.includes(session.user?._id || '')).length,
)

const LIBRARY = [
  { to: '/lector', label: 'Portada', icon: 'fa-solid fa-house', key: 'all' as const, exact: true },
  { to: '/lector/reportajes', label: 'Reportajes', icon: 'fa-solid fa-newspaper', key: 'article' as const },
  { to: '/lector/actualizaciones', label: 'Actualizaciones', icon: 'fa-solid fa-bolt', key: 'update' as const },
]

/** Navegar a la búsqueda sólo cuando hay algo escrito; volver atrás si se borra. */
function pushSearch(value: string) {
  const q = value.trim()

  if (!q) {
    if (route.name === 'reader-search') void router.replace('/lector')
    return
  }

  const target = { name: 'reader-search', query: { ...route.query, q } }
  if (route.name === 'reader-search') void router.replace(target)
  else void router.push(target)
}

// 220 ms: suficiente para no disparar una consulta por tecla, pero lo bastante
// corto para que se sienta inmediato mientras se escribe.
watch(term, (value) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => pushSearch(value), 220)
})

// Si la URL cambia por fuera (atrás, enlace compartido) el cuadro la sigue.
watch(
  () => route.query.q,
  (value) => {
    const text = String(value || '')
    if (text !== term.value) term.value = text
  },
)

watch(() => route.fullPath, () => (navOpen.value = false))

function clearSearch() {
  term.value = ''
  searchEl.value?.focus()
}

function focusSearch() {
  searchEl.value?.focus()
  searchEl.value?.select()
}

/** ⌘K / Ctrl+K enfoca el buscador; Escape lo limpia. */
function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    navOpen.value = false
    void nextTick(focusSearch)
    return
  }

  if (event.key === 'Escape' && document.activeElement === searchEl.value && term.value) {
    clearSearch()
  }
}

async function loadNotifications() {
  try {
    const { data } = await notificationsApi.mine()
    notifications.value = data
  } catch {
    /* la campana no debe romper la lectura */
  }
}

async function markRead(item: AppNotification) {
  if (item.readBy.includes(session.user?._id || '')) return
  try {
    await notificationsApi.markRead(item._id)
    item.readBy.push(session.user?._id || '')
  } catch {
    /* sin bloqueo */
  }
}

async function refreshAll() {
  feed.invalidate()
  await Promise.all([feed.ensureFacets(true), feed.ensureBrief(true)])
  toasts.info('Contenido actualizado')
  void router.replace({ query: { ...route.query, r: String(Date.now()) } })
}

const salirAbierto = ref(false)
const saliendo = ref(false)

function pedirSalir() {
  salirAbierto.value = true
}

async function signOut() {
  saliendo.value = true
  await session.signOut()
  toasts.info('Sesión cerrada')
  salirAbierto.value = false
  saliendo.value = false
  router.push('/entrar')
}

onMounted(() => {
  void loadNotifications()
  void feed.ensureFacets()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(debounce)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="rshell">
    <!-- ------- Barra lateral (escritorio) ------- -->
    <aside class="rshell__side">
      <RouterLink class="rshell__brand" to="/lector">
        <img src="/otr.svg" alt="" width="32" height="32" />
        <span>
          <strong>Off The Record</strong>
          <em>Tus lecturas</em>
        </span>
      </RouterLink>

      <div class="rsearch">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input
          ref="searchEl"
          v-model="term"
          type="search"
          placeholder="Buscar…"
          aria-label="Buscar en tus lecturas"
        />
        <button v-if="term" type="button" aria-label="Limpiar búsqueda" @click="clearSearch">
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
        <kbd v-else>⌘K</kbd>
      </div>

      <nav class="rshell__nav">
        <div class="rnav__group">
          <p class="rnav__label">Biblioteca</p>
          <RouterLink
            v-for="option in LIBRARY"
            :key="option.to"
            class="rnav__link"
            active-class="rnav__link--on"
            data-cuelume-hover="tick"
            :exact-active-class="option.exact ? 'rnav__link--on' : ''"
            :to="option.to"
          >
            <i :class="option.icon" aria-hidden="true" />
            <span>{{ option.label }}</span>
            <em v-if="feed.counts[option.key]">{{ feed.counts[option.key] }}</em>
          </RouterLink>
        </div>

        <div v-if="feed.categories.length" class="rnav__group">
          <p class="rnav__label">Secciones</p>
          <RouterLink
            v-for="category in feed.categories"
            :key="category._id"
            class="rnav__link"
            active-class="rnav__link--on"
            data-cuelume-hover="tick"
            :to="`/lector/seccion/${category._id}`"
            :style="{ '--on': category.color }"
          >
            <span class="rnav__dot" :style="{ background: category.color }" />
            <span>{{ category.name }}</span>
            <em>{{ category.count }}</em>
          </RouterLink>
        </div>

        <div v-if="feed.tags.length" class="rnav__group">
          <p class="rnav__label">Etiquetas</p>
          <div class="rnav__tags">
            <RouterLink
              v-for="item in feed.tags"
              :key="item.slug"
              class="rtag"
              active-class="rtag--on"
              data-cuelume-hover="tick"
              :to="`/lector/etiqueta/${item.slug}`"
            >
              {{ item.name }}
              <em>{{ item.count }}</em>
            </RouterLink>
          </div>
        </div>
      </nav>

      <button class="rshell__refresh" type="button" @click="refreshAll">
        <i class="fa-solid fa-rotate" aria-hidden="true" />
        Actualizar
      </button>

      <RouterLink v-if="session.isEditorial" class="rshell__desk" to="/admin/panel">
        <i class="fa-solid fa-pen-nib" aria-hidden="true" />
        <span>Ir a Redacción</span>
      </RouterLink>
    </aside>

    <!-- ------- Columna principal ------- -->
    <div class="rshell__main">
      <header class="rshell__top">
        <button class="rshell__burger" type="button" aria-label="Abrir menú" @click="navOpen = true">
          <i class="fa-solid fa-bars" aria-hidden="true" />
        </button>

        <RouterLink class="rshell__top-brand" to="/lector">
          <img src="/otr.svg" alt="" width="26" height="26" />
          <strong>Off The Record</strong>
        </RouterLink>

        <div class="rshell__top-actions">
          <button class="rshell__icon" type="button" aria-label="Buscar" @click="navOpen = true">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
          </button>

          <button
            class="rshell__icon"
            type="button"
            :aria-label="soundPref.enabled ? 'Silenciar interfaz' : 'Activar sonido'"
            :title="soundPref.enabled ? 'Silenciar interfaz' : 'Activar sonido'"
            data-cuelume-toggle
            @click="toggleSound()"
          >
            <i
              :class="soundPref.enabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'"
              aria-hidden="true"
            />
          </button>

          <button class="rshell__icon" type="button" aria-label="Notificaciones" @click="notificationsOpen = true">
            <i class="fa-regular fa-bell" aria-hidden="true" />
            <Transition name="pop">
              <span v-if="unread" class="rshell__dot">{{ unread }}</span>
            </Transition>
          </button>

          <RouterLink class="rshell__me" to="/lector/ajustes" title="Configuración de tu cuenta">
            <span class="rshell__avatar">{{ session.displayName?.charAt(0) || '·' }}</span>
            <span class="rshell__me-text">
              <strong>{{ session.displayName }}</strong>
              <em>Configuración</em>
            </span>
          </RouterLink>

          <button class="rshell__icon rshell__icon--out" type="button" aria-label="Salir" @click="pedirSalir">
            <i class="fa-solid fa-right-from-bracket" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main class="rshell__content">
        <RouterView v-slot="{ Component }">
          <Transition name="route" mode="out-in">
            <!--
              La clave es la ruta SIN query. Con `fullPath` se remontaba la
              vista en cada cambio de query: al escribir en el buscador y al
              tocar un filtro de fechas. Los cambios de query los atiende el
              watcher de la vista, que sí pide al servidor.
            -->
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <!-- ------- Menú móvil ------- -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="navOpen" class="rmnav" @click.self="navOpen = false">
          <Transition name="slide-right" appear>
            <nav class="rmnav__panel">
              <header class="rmnav__head">
                <strong>Tus lecturas</strong>
                <button type="button" aria-label="Cerrar menú" @click="navOpen = false">
                  <i class="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </header>

              <div class="rsearch">
                <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <input v-model="term" type="search" placeholder="Buscar…" aria-label="Buscar en tus lecturas" />
                <button v-if="term" type="button" aria-label="Limpiar búsqueda" @click="term = ''">
                  <i class="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>

              <div class="rnav__group">
                <p class="rnav__label">Biblioteca</p>
                <RouterLink
                  v-for="option in LIBRARY"
                  :key="option.to"
                  class="rnav__link"
                  active-class="rnav__link--on"
            data-cuelume-hover="tick"
                  :exact-active-class="option.exact ? 'rnav__link--on' : ''"
                  :to="option.to"
                >
                  <i :class="option.icon" aria-hidden="true" />
                  <span>{{ option.label }}</span>
                  <em v-if="feed.counts[option.key]">{{ feed.counts[option.key] }}</em>
                </RouterLink>
              </div>

              <div v-if="feed.categories.length" class="rnav__group">
                <p class="rnav__label">Secciones</p>
                <RouterLink
                  v-for="category in feed.categories"
                  :key="category._id"
                  class="rnav__link"
                  active-class="rnav__link--on"
            data-cuelume-hover="tick"
                  :to="`/lector/seccion/${category._id}`"
                >
                  <span class="rnav__dot" :style="{ background: category.color }" />
                  <span>{{ category.name }}</span>
                  <em>{{ category.count }}</em>
                </RouterLink>
              </div>

              <div v-if="feed.tags.length" class="rnav__group">
                <p class="rnav__label">Etiquetas</p>
                <div class="rnav__tags">
                  <RouterLink
                    v-for="item in feed.tags"
                    :key="item.slug"
                    class="rtag"
                    active-class="rtag--on"
              data-cuelume-hover="tick"
                    :to="`/lector/etiqueta/${item.slug}`"
                  >
                    {{ item.name }}
                    <em>{{ item.count }}</em>
                  </RouterLink>
                </div>
              </div>

              <RouterLink v-if="session.isEditorial" class="rshell__desk" to="/admin/panel">
                <i class="fa-solid fa-pen-nib" aria-hidden="true" />
                <span>Ir a Redacción</span>
              </RouterLink>
            </nav>
          </Transition>
        </div>
      </Transition>
    </Teleport>


    <ConfirmDialog
      v-model="salirAbierto"
      title="¿Cerrar sesión?"
      message="Se cerrará tu sesión en este navegador. Tendrás que volver a entrar con tu correo y contraseña."
      confirm-label="Cerrar sesión"
      cancel-label="Seguir aquí"
      tone="danger"
      :loading="saliendo"
      @confirm="signOut"
    />

    <AppDrawer v-model="notificationsOpen" title="Notificaciones" icon="fa-regular fa-bell">
      <div v-if="notifications.length" class="rnotif">
        <article
          v-for="item in notifications"
          :key="item._id"
          :class="['rnotif__item', { 'rnotif__item--unread': !item.readBy.includes(session.user?._id || '') }]"
          @mouseenter="markRead(item)"
        >
          <header>
            <strong>{{ item.title }}</strong>
            <span>{{ formatRelative(item.sentAt) }}</span>
          </header>
          <p>{{ item.message }}</p>
        </article>
      </div>

      <EmptyState v-else icon="fa-regular fa-bell-slash" title="Sin avisos" detail="Aquí verás las alertas del equipo." />
    </AppDrawer>
  </div>
</template>

<style scoped lang="scss">
.rshell {
  @include row(0, stretch);
  min-height: 100vh;
}

/* ---------------- Barra lateral ---------------- */

.rshell__side {
  @include col(var(--s-5));
  position: sticky;
  top: 0;
  flex: 0 0 var(--sidebar-w);
  width: var(--sidebar-w);
  height: 100vh;
  padding: var(--s-5) var(--s-4);
  background: var(--glass-soft);
  backdrop-filter: blur(16px);
  border-inline-end: 1px solid var(--line);

  @include tablet {
    display: none;
  }
}

.rshell__brand {
  @include row(var(--s-3), center);
  padding: var(--s-2);

  span {
    @include col(0);
  }

  strong {
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--text-strong);
  }

  em {
    @include eyebrow;
    font-style: normal;
    font-size: 9px;
  }
}

/* ---------------- Buscador ---------------- */

.rsearch {
  @include row(var(--s-2), center);
  position: relative;
  padding: 0 var(--s-3);
  height: 38px;
  border-radius: var(--r-sm);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  transition:
    border-color var(--t-fast) var(--ease),
    background var(--t-fast) var(--ease);

  &:focus-within {
    border-color: var(--brand-line);
    background: var(--surface-raised);
  }

  > i {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--text-dim);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    background: none;
    color: var(--text);
    font-size: 13px;

    &::placeholder {
      color: var(--text-dim);
    }

    // Chrome dibuja su propia × en type="search"; usamos la nuestra.
    &::-webkit-search-cancel-button {
      appearance: none;
    }
  }

  button {
    flex-shrink: 0;
    color: var(--text-dim);
    font-size: 12px;

    &:hover {
      color: var(--text);
    }
  }

  kbd {
    flex-shrink: 0;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--line);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 10px;
  }
}

/* ---------------- Navegación ---------------- */

.rshell__nav {
  @include col(var(--s-5));
  flex: 1;
  overflow-y: auto;
  @include scrollbar;
}

.rnav__group {
  @include col(2px);
}

.rnav__label {
  @include eyebrow;
  padding: 0 var(--s-3) var(--s-2);
}

.rnav__link {
  @include row(var(--s-3), center);
  width: 100%;
  padding: 9px var(--s-3);
  border-radius: var(--r-sm);
  font-size: 14px;
  color: var(--text-muted);
  text-align: start;
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  > i {
    width: 16px;
    flex-shrink: 0;
    font-size: 12px;
  }

  span:not(.rnav__dot) {
    flex: 1;
    min-width: 0;
    @include truncate(1);
  }

  em {
    flex-shrink: 0;
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
  }

  &:hover {
    background: var(--surface-sunken);
    color: var(--text);
  }
}

.rnav__link--on {
  background: var(--brand-soft);
  color: var(--on, var(--brand-strong));

  em {
    color: inherit;
  }
}

.rnav__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rnav__tags {
  @include wrap(6px);
  padding: 0 var(--s-2);
}

.rtag {
  @include row(6px, center);
  padding: 4px 10px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  font-size: 11px;
  color: var(--text-muted);
  transition:
    border-color var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  em {
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-dim);
  }

  &:hover {
    border-color: var(--line-strong);
    color: var(--text);
  }
}

.rtag--on {
  border-color: var(--brand-line);
  background: var(--brand-soft);
  color: var(--brand-strong);

  em {
    color: inherit;
  }
}

.rshell__refresh {
  @include row(var(--s-2), center, center);
  padding: 9px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--text-muted);

  &:hover {
    border-color: var(--brand-line);
    color: var(--text);
  }
}

.rshell__desk {
  @include row(var(--s-3), center);
  padding: 10px var(--s-3);
  border-radius: var(--r-sm);
  border: 1px dashed var(--line-strong);
  font-size: 13px;
  color: var(--text-muted);

  &:hover {
    border-style: solid;
    border-color: var(--brand-line);
    color: var(--text);
  }
}

/* ---------------- Columna principal ---------------- */

.rshell__main {
  @include col(0);
  flex: 1;
  min-width: 0;
}

.rshell__top {
  @include row(var(--s-3), center, space-between);
  position: sticky;
  top: 0;
  z-index: 30;
  padding: var(--s-3) var(--s-6);
  background: var(--glass);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);

  @include mobile {
    padding: var(--s-3) var(--s-4);
  }
}

.rshell__burger {
  display: none;
  color: var(--text-muted);

  @include tablet {
    display: block;
  }
}

.rshell__top-brand {
  display: none;

  strong {
    font-family: var(--font-display);
    font-size: 14px;
  }

  @include tablet {
    @include row(var(--s-2), center);
  }

  @include mobile {
    strong {
      display: none;
    }
  }
}

.rshell__top-actions {
  @include row(var(--s-2), center);
  margin-inline-start: auto;
}

.rshell__icon {
  position: relative;
  @include row(0, center, center);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--line);
  color: var(--text-muted);
  transition:
    border-color var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    border-color: var(--brand-line);
    color: var(--text);
  }
}

.rshell__icon--out:hover {
  border-color: color-mix(in srgb, var(--danger) 50%, transparent);
  color: var(--danger);
}

.rshell__dot {
  position: absolute;
  top: -3px;
  inset-inline-end: -3px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: var(--r-pill);
  background: var(--brand);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 17px;
}

.rshell__me {
  @include row(var(--s-2), center);
  padding: 4px var(--s-2);
  border-radius: var(--r-pill);
  transition: background var(--t-fast) var(--ease);

  &:hover {
    background: var(--surface-sunken);

    .rshell__me-text em {
      color: var(--brand-strong);
    }
  }

  @include mobile {
    display: none;
  }
}

.rshell__avatar {
  @include row(0, center, center);
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  color: var(--brand-strong);
  font-family: var(--font-display);
  font-size: 14px;
  text-transform: uppercase;
}

.rshell__me-text {
  @include col(0);

  strong {
    font-size: 12px;
    color: var(--text);
  }

  em {
    @include eyebrow;
    font-style: normal;
    font-size: 9px;
  }
}

.rshell__content {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin-inline: auto;
  padding: var(--s-6);

  @include mobile {
    padding: var(--s-5) var(--s-4);
  }
}

/* ---------------- Menú móvil ---------------- */

.rmnav {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(1, 8, 26, 0.62);
  backdrop-filter: blur(3px);
}

.rmnav__panel {
  @include col(var(--s-5));
  width: min(300px, 84vw);
  height: 100%;
  padding: var(--s-5) var(--s-4);
  overflow-y: auto;
  @include scrollbar;
  background: var(--surface);
  border-inline-end: 1px solid var(--line);
}

.rmnav__head {
  @include row(var(--s-3), center, space-between);

  strong {
    font-family: var(--font-display);
    font-size: 15px;
  }

  button {
    color: var(--text-muted);
  }
}

/* ---------------- Notificaciones ---------------- */

.rnotif {
  @include col(var(--s-3));
}

.rnotif__item {
  @include col(var(--s-2));
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);

  header {
    @include row(var(--s-3), baseline, space-between);

    strong {
      font-size: 14px;
    }

    span {
      @include eyebrow;
      font-size: 10px;
    }
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.rnotif__item--unread {
  border-color: var(--brand-line);
  background: var(--brand-soft);
}
</style>
