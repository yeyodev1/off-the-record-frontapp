<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { moduleConfigs } from '@/config/modules'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const showLogoutModal = ref(false)

const menuItems = computed(() => [
  { label: 'Dashboard', path: '/dashboard', accent: 'primary' as const, icon: 'fa-gauge-high' },
  ...moduleConfigs.map((module) => ({
    label: module.title,
    path: `/${module.path}`,
    accent: module.accent,
    icon: module.icon,
  })),
])

const pageTitle = computed(() => String(route.meta.title || 'Off The Record'))
const userRole = computed(() => {
  if (userStore.roleId === 1) return 'Administrador'
  if (userStore.roleId === 3) return 'Editor'
  if (userStore.roleId === 2) return 'Lector'
  return 'Sesión activa'
})

const userInitials = computed(() => {
  const source = `${userStore.name || 'OTR'} ${userStore.email || ''}`.trim()
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'OT'
})

function openLogoutModal() {
  showLogoutModal.value = true
}

function closeLogoutModal() {
  showLogoutModal.value = false
}

function confirmLogout() {
  userStore.clear()
  router.push('/login')
}
</script>

<template>
  <div class="shell">
    <aside class="shell__sidebar">
      <div class="brand">
        <i class="brand__icon fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
        <span class="brand__eyebrow">Off The Record</span>
        <strong class="brand__title">Admin Web</strong>
        <p>Editorial dashboard for the new stack</p>
      </div>

      <section class="profile-card">
        <div class="profile-card__avatar">{{ userInitials }}</div>
        <div class="profile-card__meta">
          <span class="profile-card__status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Activo</span>
          <strong>{{ userStore.name || 'Equipo editorial' }}</strong>
          <p>{{ userStore.email || 'session' }}</p>
        </div>
        <div class="profile-card__chips">
          <span><i class="fa-solid fa-user-shield" aria-hidden="true"></i> {{ userRole }}</span>
          <span><i class="fa-solid fa-layer-group" aria-hidden="true"></i> Web only</span>
        </div>
      </section>

      <nav class="menu">
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="menu__item"
          :class="[`menu__item--${item.accent}`]"
        >
          <i class="fa-solid menu__icon" :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <footer class="sidebar-footer">
        <p>Panel editorial en tiempo real</p>
        <button class="logout-link" type="button" @click="openLogoutModal">
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          Cerrar sesión
        </button>
      </footer>
    </aside>

    <main class="shell__main">
      <header class="topbar">
        <div>
          <span class="topbar__eyebrow">{{ route.meta.moduleKey ? 'Modulo' : 'Vista' }}</span>
          <h1>{{ pageTitle }}</h1>
        </div>

        <div class="topbar__actions">
          <div class="topbar-pill">
            <i class="fa-solid fa-bullhorn" aria-hidden="true"></i>
            <span>Editorial</span>
          </div>
        </div>
      </header>

      <section class="shell__scroll">
        <RouterView v-slot="{ Component, route: currentRoute }">
          <Transition name="page" mode="out-in" appear>
            <component :is="Component" :key="currentRoute.fullPath" />
          </Transition>
        </RouterView>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showLogoutModal" class="logout-modal" @click.self="closeLogoutModal">
          <div class="logout-modal__panel">
            <i class="fa-solid fa-triangle-exclamation logout-modal__icon" aria-hidden="true"></i>
            <h2>Cerrar sesión</h2>
            <p>¿Seguro que quieres salir del panel editorial?</p>
            <div class="logout-modal__actions">
              <button type="button" class="ghost-button" @click="closeLogoutModal">Cancelar</button>
              <button type="button" class="danger-button" @click="confirmLogout">
                <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                Salir
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.16), transparent 26%),
    radial-gradient(circle at bottom left, rgba(1, 13, 39, 0.25), transparent 24%),
    #010d27;
  overflow-x: hidden;
}

.shell__sidebar {
  padding: 1rem;
  background:
    linear-gradient(180deg, rgba(1, 13, 39, 0.98), rgba(1, 13, 39, 0.94)),
    radial-gradient(circle at top left, rgba(200, 57, 43, 0.18), transparent 36%);
  color: $text-light;
  display: grid;
  gap: 1rem;
  overflow: hidden;
  border-bottom: 1px solid rgba(254, 254, 254, 0.08);
}

.brand {
  padding: 1.05rem;
  border: 1px solid rgba(254, 254, 254, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.035);

  &__icon {
    color: $accent-red;
    font-size: 1.15rem;
    margin-bottom: 0.75rem;
  }

  &__eyebrow {
    display: block;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(254, 254, 254, 0.72);
  }

  &__title {
    display: block;
    margin-top: 0.35rem;
    font-size: 1.35rem;
    letter-spacing: -0.03em;
  }

  p {
    margin-top: 0.65rem;
    color: rgba(254, 254, 254, 0.62);
    font-size: 0.92rem;
  }
}

.profile-card {
  padding: 1rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(254, 254, 254, 0.08);
  display: grid;
  gap: 0.85rem;

  &__avatar {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, $primary-dark, $accent-red);
    color: $text-light;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  &__meta {
    display: grid;
    gap: 0.3rem;

    strong {
      font-size: 1rem;
      color: $text-light;
    }

    p {
      color: rgba(254, 254, 254, 0.66);
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(254, 254, 254, 0.76);

    i {
      color: $accent-red;
    }
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.65rem;
      border-radius: 999px;
      border: 1px solid rgba(254, 254, 254, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: rgba(254, 254, 254, 0.82);
      font-size: 0.76rem;
    }

    i {
      color: $accent-red;
    }
  }
}

.menu {
  display: grid;
  gap: 0.45rem;
  overflow-y: auto;
  padding-right: 0.2rem;

  &__item {
    padding: 0.82rem 0.95rem;
    border-radius: 16px;
    border: 1px solid rgba(254, 254, 254, 0.08);
    background: rgba(255, 255, 255, 0.02);
    color: rgba(254, 254, 254, 0.88);
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 48px;
    width: 100%;

    &:hover,
    &.router-link-active {
      transform: translateX(3px);
      background: rgba(255, 255, 255, 0.08);
    }

    .menu__icon {
      width: 1rem;
      color: $accent-red;
      flex: 0 0 auto;
    }

    &--primary.router-link-active {
      border-color: rgba(200, 57, 43, 0.6);
    }

    &--secondary.router-link-active {
      border-color: rgba(200, 57, 43, 0.6);
    }

    &--error.router-link-active {
      border-color: rgba(239, 68, 68, 0.7);
    }
  }
}

.sidebar-footer {
  display: grid;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(254, 254, 254, 0.08);

  p {
    color: rgba(254, 254, 254, 0.62);
    font-size: 0.88rem;
  }
}

.logout-link {
  border: 0;
  background: transparent;
  color: $text-light;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0;
  cursor: pointer;
  font-weight: 700;

  i {
    color: $accent-red;
  }
}

.shell__main {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(254, 254, 254, 0.98), rgba(254, 254, 254, 0.94)),
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.06), transparent 28%);
}

.topbar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(1, 13, 39, 0.08);

  h1 {
    font-size: clamp(1.8rem, 3vw, 2.4rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    color: $primary-dark;
  }

  &__eyebrow {
    display: block;
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(1, 13, 39, 0.56);
    margin-bottom: 0.25rem;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
}

.topbar-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(1, 13, 39, 0.1);
  background: rgba(1, 13, 39, 0.03);
  color: $primary-dark;

  i {
    color: $accent-red;
  }
}

.shell__scroll {
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(200, 57, 43, 0.65) rgba(1, 13, 39, 0.08);
}

.shell__scroll::-webkit-scrollbar {
  width: 10px;
}

.shell__scroll::-webkit-scrollbar-track {
  background: rgba(1, 13, 39, 0.06);
  border-radius: 999px;
}

.shell__scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, $primary-dark, $accent-red);
  border-radius: 999px;
}

.logout-modal {
  position: fixed;
  inset: 0;
  background: rgba(1, 13, 39, 0.72);
  backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  z-index: 80;
  padding: 1.25rem;
}

.logout-modal__panel {
  width: min(100%, 460px);
  border-radius: 28px;
  background: #fefefe;
  border: 1px solid rgba(1, 13, 39, 0.12);
  box-shadow: 0 40px 120px rgba(1, 13, 39, 0.32);
  padding: 1.5rem;
  display: grid;
  gap: 0.85rem;
  text-align: center;

  h2 {
    font-size: 1.6rem;
    letter-spacing: -0.04em;
    color: $primary-dark;
  }

  p {
    color: rgba(1, 13, 39, 0.72);
  }
}

.logout-modal__icon {
  color: $accent-red;
  font-size: 2rem;
}

.logout-modal__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.ghost-button,
.danger-button {
  border-radius: 14px;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(1, 13, 39, 0.12);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.ghost-button {
  background: rgba(1, 13, 39, 0.03);
  color: $primary-dark;
}

.danger-button {
  background: linear-gradient(135deg, $primary-dark, $accent-red);
  color: $text-light;
}

@media (min-width: 1100px) {
  .shell {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    height: 100vh;
    overflow: hidden;
  }

  .shell__sidebar {
    height: 100vh;
    padding: 1.5rem;
    border-right: 1px solid rgba(254, 254, 254, 0.08);
    border-bottom: 0;
  }

  .shell__main {
    height: 100vh;
  }

  .shell__scroll {
    padding: 1.5rem;
  }
}

@media (min-width: 720px) {
  .topbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .topbar__actions {
    width: auto;
  }
}
</style>
