<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAV_GROUPS, ROLE_LABELS } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { notificationsApi } from '@/services/api'
import { formatRelative } from '@/composables/useFormat'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { AppNotification } from '@/types'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const toasts = useToastStore()

const mobileNavOpen = ref(false)
const notificationsOpen = ref(false)
const userMenuOpen = ref(false)
const notifications = ref<AppNotification[]>([])

const groups = computed(() =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => (!item.adminOnly || session.isAdmin) && (!item.superOnly || session.isSuperadmin),
    ),
  })).filter((group) => group.items.length),
)

const unread = computed(
  () => notifications.value.filter((item) => !item.readBy.includes(session.user?._id || '')).length,
)

async function loadNotifications() {
  try {
    const { data } = await notificationsApi.mine()
    notifications.value = data
  } catch {
    /* silencioso: la campana no debe romper la navegación */
  }
}

async function openNotifications() {
  notificationsOpen.value = true
  await loadNotifications()
}

async function markRead(item: AppNotification) {
  if (item.readBy.includes(session.user?._id || '')) return
  try {
    await notificationsApi.markRead(item._id)
    item.readBy.push(session.user?._id || '')
  } catch {
    /* no bloquea la lectura */
  }
}

async function signOut() {
  await session.signOut()
  toasts.info('Sesión cerrada', 'Hasta la próxima.')
  router.push('/entrar')
}

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false
    userMenuOpen.value = false
  },
)

onMounted(loadNotifications)
</script>

<template>
  <div class="shell">
    <!-- Barra lateral (escritorio) -->
    <aside class="shell__side">
      <RouterLink class="shell__brand" to="/admin/panel">
        <img src="/otr.svg" alt="" width="34" height="34" />
        <span>
          <strong>Off The Record</strong>
          <em>Sala de redacción</em>
        </span>
      </RouterLink>

      <nav class="shell__nav">
        <div v-for="group in groups" :key="group.label" class="shell__group">
          <p class="shell__group-label">{{ group.label }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            class="shell__link" data-cuelume-hover="tick"
            :to="item.to"
            active-class="shell__link--active"
          >
            <i :class="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <RouterLink class="shell__reader-link" to="/lector">
        <i class="fa-solid fa-book-open-reader" aria-hidden="true" />
        <span>Vista de lector</span>
      </RouterLink>
    </aside>

    <!-- Contenido -->
    <div class="shell__main">
      <header class="shell__top">
        <button class="shell__burger" type="button" aria-label="Abrir menú" @click="mobileNavOpen = true">
          <i class="fa-solid fa-bars" aria-hidden="true" />
        </button>

        <p class="shell__crumb">
          <i class="fa-solid fa-location-dot" aria-hidden="true" />
          {{ route.meta.title || 'Panel' }}
        </p>

        <div class="shell__top-actions">
          <button class="shell__bell" type="button" aria-label="Notificaciones" @click="openNotifications">
            <i class="fa-regular fa-bell" aria-hidden="true" />
            <Transition name="pop">
              <span v-if="unread" class="shell__bell-dot">{{ unread }}</span>
            </Transition>
          </button>

          <div class="shell__user">
            <button class="shell__avatar" type="button" @click="userMenuOpen = !userMenuOpen">
              <span>{{ session.initials }}</span>
            </button>

            <Transition name="pop">
              <div v-if="userMenuOpen" class="shell__menu">
                <p class="shell__menu-name">{{ session.displayName }}</p>
                <p class="shell__menu-mail">{{ session.user?.email }}</p>
                <AppBadge :tone="session.isSuperadmin ? 'gold' : session.isAdmin ? 'brand' : 'ocean'">
                  {{ ROLE_LABELS[session.roleId] || 'Invitado' }}
                </AppBadge>
                <hr />
                <RouterLink class="shell__menu-item" to="/admin/ajustes">
                  <i class="fa-solid fa-sliders" aria-hidden="true" /> Configuración
                </RouterLink>
                <RouterLink class="shell__menu-item" to="/lector">
                  <i class="fa-solid fa-book-open-reader" aria-hidden="true" /> Vista de lector
                </RouterLink>
                <button class="shell__menu-item shell__menu-item--danger" type="button" @click="signOut">
                  <i class="fa-solid fa-right-from-bracket" aria-hidden="true" /> Cerrar sesión
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <main class="shell__content">
        <RouterView v-slot="{ Component }">
          <Transition name="route" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <!-- Menú móvil -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="mobileNavOpen" class="mnav" @click.self="mobileNavOpen = false">
          <Transition name="slide-right" appear>
            <nav class="mnav__panel">
              <div class="mnav__head">
                <img src="/otr.svg" alt="" width="30" height="30" />
                <strong>Off The Record</strong>
                <button type="button" aria-label="Cerrar" @click="mobileNavOpen = false">
                  <i class="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>

              <div v-for="group in groups" :key="group.label" class="shell__group">
                <p class="shell__group-label">{{ group.label }}</p>
                <RouterLink
                  v-for="item in group.items"
                  :key="item.to"
                  class="shell__link" data-cuelume-hover="tick"
                  :to="item.to"
                  active-class="shell__link--active"
                >
                  <i :class="item.icon" aria-hidden="true" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </div>
            </nav>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Panel de notificaciones -->
    <AppDrawer
      v-model="notificationsOpen"
      title="Notificaciones"
      subtitle="Avisos enviados a tu perfil"
      icon="fa-regular fa-bell"
    >
      <div v-if="notifications.length" class="notif">
        <article
          v-for="item in notifications"
          :key="item._id"
          :class="['notif__item', { 'notif__item--unread': !item.readBy.includes(session.user?._id || '') }]"
          @mouseenter="markRead(item)"
        >
          <header>
            <strong>{{ item.title }}</strong>
            <span>{{ formatRelative(item.sentAt) }}</span>
          </header>
          <p>{{ item.message }}</p>
          <a v-if="item.link" :href="item.link" target="_blank" rel="noreferrer">
            Abrir enlace <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          </a>
        </article>
      </div>

      <EmptyState v-else icon="fa-regular fa-bell-slash" title="Sin notificaciones" detail="Aquí verás los avisos del equipo." />
    </AppDrawer>
  </div>
</template>

<style scoped lang="scss">
.shell {
  @include row(0, stretch);
  min-height: 100vh;
}

/* --- Barra lateral --- */
.shell__side {
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

.shell__brand {
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

.shell__nav {
  @include col(var(--s-5));
  flex: 1;
  overflow-y: auto;
  @include scrollbar;
}

.shell__group {
  @include col(2px);
}

.shell__group-label {
  @include eyebrow;
  padding: 0 var(--s-3) var(--s-2);
}

.shell__link {
  @include row(var(--s-3), center);
  position: relative;
  padding: 10px var(--s-3);
  border-radius: var(--r-sm);
  font-size: 14px;
  color: var(--text-muted);
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  i {
    width: 18px;
    text-align: center;
    font-size: 13px;
  }

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.shell__link--active {
  background: var(--brand-soft);
  color: var(--brand-strong);
  font-weight: 600;

  &::before {
    content: '';
    position: absolute;
    inset-inline-start: calc(-1 * var(--s-4));
    top: 50%;
    width: 3px;
    height: 20px;
    border-radius: var(--r-pill);
    background: var(--brand);
    transform: translateY(-50%);
  }
}

.shell__reader-link {
  @include row(var(--s-3), center);
  padding: 10px var(--s-3);
  border-radius: var(--r-sm);
  border: 1px dashed var(--line-strong);
  font-size: 13px;
  color: var(--text-muted);

  &:hover {
    border-color: var(--brand-line);
    color: var(--text);
  }
}

/* --- Contenido --- */
.shell__main {
  @include col(0);
  flex: 1;
  min-width: 0;
}

.shell__top {
  @include row(var(--s-3), center, space-between);
  position: sticky;
  top: 0;
  z-index: 40;
  height: var(--topbar-h);
  padding: 0 var(--s-6);
  background: var(--glass);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--line);

  @include mobile {
    padding: 0 var(--s-4);
  }
}

.shell__burger {
  display: none;
  width: 38px;
  height: 38px;
  border-radius: var(--r-sm);
  color: var(--text-muted);

  @include tablet {
    @include row(0, center, center);
  }
}

.shell__crumb {
  @include row(var(--s-2), center);
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-muted);
  @include truncate;

  i {
    font-size: 11px;
    color: var(--brand);
  }
}

.shell__top-actions {
  @include row(var(--s-2), center);
}

.shell__bell {
  position: relative;
  @include row(0, center, center);
  width: 38px;
  height: 38px;
  border-radius: var(--r-sm);
  color: var(--text-muted);
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.shell__bell-dot {
  position: absolute;
  top: 4px;
  inset-inline-end: 4px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: var(--r-pill);
  background: var(--brand);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 17px;
  text-align: center;
}

.shell__user {
  position: relative;
}

.shell__avatar {
  @include row(0, center, center);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand), var(--iris));
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--line-strong);
}

.shell__menu {
  @include col(var(--s-2));
  position: absolute;
  inset-block-start: calc(100% + 10px);
  inset-inline-end: 0;
  width: 246px;
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--ink-750);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
  z-index: 50;

  hr {
    border: none;
    border-top: 1px solid var(--line);
    margin: var(--s-1) 0;
  }
}

.shell__menu-name {
  font-weight: 600;
  font-size: 14px;
}

.shell__menu-mail {
  font-size: 12px;
  color: var(--text-dim);
  overflow-wrap: anywhere;
}

.shell__menu-item {
  @include row(var(--s-3), center);
  width: 100%;
  padding: 8px var(--s-2);
  border-radius: var(--r-xs);
  font-size: 13px;
  color: var(--text-muted);
  text-align: start;

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.shell__menu-item--danger:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.shell__content {
  @include col(var(--s-6));
  flex: 1;
  padding: var(--s-6);
  max-width: 1420px;
  width: 100%;
  margin-inline: auto;

  @include mobile {
    padding: var(--s-4);
    gap: var(--s-5);
  }
}

/* --- Menú móvil --- */
.mnav {
  position: fixed;
  inset: 0;
  z-index: 880;
  @include row(0, stretch, flex-start);
  background: rgba(3, 5, 10, 0.72);
  backdrop-filter: blur(8px);
}

.mnav__panel {
  @include col(var(--s-5));
  width: min(300px, 84vw);
  height: 100%;
  padding: var(--s-5) var(--s-4);
  background: var(--surface-raised);
  border-inline-end: 1px solid var(--line-strong);
  overflow-y: auto;
  animation: mnav-in var(--t-base) var(--ease);
}

@keyframes mnav-in {
  from {
    transform: translateX(-100%);
  }
}

.mnav__head {
  @include row(var(--s-3), center);

  strong {
    flex: 1;
    font-family: var(--font-display);
    font-size: 15px;
  }

  button {
    color: var(--text-muted);
    padding: 6px;
  }
}

/* --- Notificaciones --- */
.notif {
  @include col(var(--s-3));
}

.notif__item {
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
      flex-shrink: 0;
    }
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
  }

  a {
    @include row(var(--s-2), center);
    font-size: 12px;
    color: var(--brand-strong);
  }
}

.notif__item--unread {
  border-color: var(--brand-line);
  background: var(--brand-soft);
}
</style>
