<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModuleEditorModal from '@/components/ModuleEditorModal.vue'
import { moduleConfigs } from '@/config/modules'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const uiStore = useUiStore()
const showLogoutModal = ref(false)

const menuSections = computed(() => [
  {
    title: 'Principal',
    icon: 'fa-gauge-high',
    items: [{ label: 'Dashboard', path: '/admin/dashboard', icon: 'fa-gauge-high' }],
  },
  {
    title: 'Editorial',
    icon: 'fa-newspaper',
    items: moduleConfigs
      .filter((module) => ['articles'].includes(module.key))
      .map((module) => ({ label: module.title, path: `/admin/${module.path}`, icon: module.icon })),
  },
  {
    title: 'Administración',
    icon: 'fa-sliders',
    items: moduleConfigs
      .filter((module) => userStore.roleId === 1 && ['users'].includes(module.key))
      .map((module) => ({ label: module.title, path: `/admin/${module.path}`, icon: module.icon })),
  },
  {
    title: 'Sitio público',
    icon: 'fa-arrow-up-right-from-square',
    items: [{ label: 'Ver noticias', path: '/', icon: 'fa-newspaper' }],
  },
])

const pageTitle = computed(() => String(route.meta.title || 'Off The Record'))
const pageSubtitle = computed(() => {
  if (route.meta.moduleKey) {
    return 'Consulta los registros y realiza las acciones disponibles en este módulo.'
  }

  return 'Centro operativo para redactar, programar y publicar noticias.'
})

const activeModule = computed(() =>
  route.meta.moduleKey ? moduleConfigs.find((module) => module.key === String(route.meta.moduleKey)) || null : null,
)

const userRole = computed(() => {
  if (userStore.roleId === 1) return 'Administrador'
  if (userStore.roleId === 3) return 'Editor'
  if (userStore.roleId === 2) return 'Lector'
  return 'Sesión activa'
})

const userInitials = computed(() => {
  const source = `${userStore.name || 'OTR'} ${userStore.email || ''}`.trim()
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'OT'
  )
})

const liveStatus = computed(() => (activeModule.value ? 'Gestión' : 'Inicio'))

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

function openCreateModal() {
  if (!activeModule.value) return
  if (activeModule.value.key === 'articles') {
    void router.push('/admin/articles/new')
    return
  }
  uiStore.openEditor(activeModule.value.key, 'create')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showLogoutModal.value) {
    closeLogoutModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="shell page-frame">
    <aside class="shell__sidebar">
      <div class="shell__sidebar-orbit shell__sidebar-orbit--one"></div>
      <div class="shell__sidebar-orbit shell__sidebar-orbit--two"></div>

      <div class="brand-panel">
        <div class="brand-panel__mark">
          <i class="fa-solid fa-microphone-lines" aria-hidden="true"></i>
        </div>

        <div class="brand-panel__copy">
          <span class="eyebrow">Off The Record</span>
          <strong>Admin Web</strong>
          <p>Administración editorial</p>
        </div>
      </div>

      <section class="sidebar-stamp">
        <span class="section-label">Sección actual</span>
        <h2 class="section-title">{{ pageTitle }}</h2>
        <p>Accesos directos para gestionar el contenido y los usuarios.</p>
      </section>

      <section class="profile-panel">
        <div class="profile-panel__avatar">{{ userInitials }}</div>

        <div class="profile-panel__meta">
          <span class="profile-panel__status">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            Activo
          </span>
          <strong>{{ userStore.name || 'Equipo editorial' }}</strong>
          <p>{{ userStore.email || 'session' }}</p>
        </div>

        <div class="profile-panel__chips">
          <span class="chip"><i class="fa-solid fa-user-shield" aria-hidden="true"></i>{{ userRole }}</span>
          <span class="chip"><i class="fa-solid fa-layer-group" aria-hidden="true"></i>{{ liveStatus }}</span>
        </div>
      </section>

      <nav class="menu" aria-label="Principal">
        <section v-for="section in menuSections" :key="section.title" class="menu-section">
          <div class="menu-section__header">
            <i class="fa-solid" :class="section.icon" aria-hidden="true"></i>
            <span>{{ section.title }}</span>
          </div>

          <RouterLink
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="menu__item"
            :class="{ 'menu__item--active': route.path === item.path }"
            :aria-current="route.path === item.path ? 'page' : undefined"
          >
            <i class="fa-solid menu__icon" :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </RouterLink>
        </section>
      </nav>

      <footer class="sidebar-footer">
        <p>Panel editorial en tiempo real</p>
        <button class="ghost-button logout-link" type="button" @click="openLogoutModal">
          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          Cerrar sesión
        </button>
      </footer>
    </aside>

    <main class="shell__main">
      <header v-if="route.meta.moduleKey !== 'articles'" class="topbar surface-card">
        <div class="topbar__copy">
          <span class="eyebrow">{{ route.meta.moduleKey ? 'Módulo' : 'Vista' }}</span>
          <h1 class="section-title">{{ pageTitle }}</h1>
          <p class="section-copy">{{ pageSubtitle }}</p>
        </div>

        <div class="topbar__actions">
          <div class="topbar__stats" aria-label="Estado del panel">
            <div class="topbar-stat">
              <span>Rol</span>
              <strong>{{ userRole }}</strong>
            </div>
            <div class="topbar-stat">
              <span>Vista</span>
              <strong>{{ route.meta.moduleKey ? 'Módulo' : 'Dashboard' }}</strong>
            </div>
          </div>

          <div class="topbar__buttons">
            <button v-if="activeModule" type="button" class="primary-button" @click="openCreateModal">
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
              Nuevo
            </button>
            <div class="topbar-pill">
              <i class="fa-solid fa-bullhorn" aria-hidden="true"></i>
              <span>Editorial</span>
            </div>
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

    <ModuleEditorModal />

    <Teleport to="body">
      <Transition name="modal">
          <div v-if="showLogoutModal" class="logout-modal" @click.self="closeLogoutModal">
            <div class="logout-modal__panel modal-surface">
            <div class="logout-modal__icon"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i></div>
            <span class="logout-modal__eyebrow">Sesión actual</span>
            <h2>¿Cerrar sesión?</h2>
            <p>Vas a salir del panel. Podrás volver a ingresar con tus credenciales cuando lo necesites.</p>
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
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
}

.shell__sidebar {
  position: relative;
  overflow: hidden;
  padding: 1rem;
  display: grid;
  gap: 1rem;
  color: $text-light;
  background:
    radial-gradient(circle at top left, rgba(200, 57, 43, 0.34), transparent 18%),
    radial-gradient(circle at 82% 10%, rgba(32, 148, 210, 0.18), transparent 16%),
    linear-gradient(180deg, rgba(5, 8, 22, 0.98), rgba(7, 16, 36, 0.96) 55%, rgba(5, 8, 22, 0.99));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 28px 80px rgba(1, 13, 39, 0.28);
  isolation: isolate;
}

.shell__sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.06), transparent 25%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: auto, 44px 44px, 44px 44px;
  opacity: 0.18;
  pointer-events: none;
}

.shell__sidebar::after {
  content: '';
  position: absolute;
  inset: auto 10% 14px 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.24), transparent);
  pointer-events: none;
}

.shell__sidebar-orbit {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(2px);
  opacity: 0.5;
}

.shell__sidebar-orbit--one {
  width: 180px;
  height: 180px;
  top: -60px;
  right: -52px;
  background: radial-gradient(circle, rgba(200, 57, 43, 0.2), transparent 68%);
}

.shell__sidebar-orbit--two {
  width: 140px;
  height: 140px;
  bottom: 18%;
  left: -48px;
  background: radial-gradient(circle, rgba(32, 148, 210, 0.16), transparent 70%);
}

.brand-panel {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.brand-panel__mark {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, $primary-dark, $accent-red);
  color: $text-light;
  flex: 0 0 auto;
  box-shadow: 0 18px 36px rgba(200, 57, 43, 0.18);
}

.brand-panel__copy {
  min-width: 0;

  strong {
    display: block;
    margin-top: 0.3rem;
    font-family: var(--font-display);
    font-size: 1.4rem;
    letter-spacing: -0.04em;
  }

  p {
    margin-top: 0.25rem;
    color: rgba(246, 241, 232, 0.68);
    font-size: 0.92rem;
  }
}

.profile-panel {
  position: relative;
  z-index: 1;
  padding: 1rem;
  display: grid;
  gap: 0.85rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.sidebar-stamp {
  position: relative;
  z-index: 1;
  padding: 1rem;
  display: grid;
  gap: 0.55rem;
  border-radius: var(--radius-xl);
  background:
    linear-gradient(135deg, rgba(200, 57, 43, 0.16), rgba(32, 148, 210, 0.08)),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);

  .section-title {
    font-size: 1.65rem;
    max-width: 10ch;
  }

  p {
    color: rgba(246, 241, 232, 0.72);
    line-height: 1.6;
  }
}

.profile-panel__avatar {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, $primary-dark, $accent-red);
  color: $text-light;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: 0 18px 36px rgba(200, 57, 43, 0.2);
}

.profile-panel__meta {
  display: grid;
  gap: 0.3rem;

  strong {
    font-size: 1rem;
    color: $text-light;
  }

  p {
    color: rgba(246, 241, 232, 0.66);
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.profile-panel__status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(246, 241, 232, 0.78);

  i {
    color: $accent-red;
  }
}

.profile-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.menu {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.9rem;
  padding-right: 0.2rem;
}

.menu-section {
  display: grid;
  gap: 0.5rem;
  padding: 0.85rem;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
    rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.menu-section__header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: rgba(246, 241, 232, 0.68);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.68rem;

  i {
    color: $accent-red;
  }
}

.menu__item {
  padding: 0.9rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(246, 241, 232, 0.9);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  width: 100%;

  &:hover,
  &.router-link-active,
  &--active {
    transform: translateX(4px);
    background: linear-gradient(135deg, rgba(200, 57, 43, 0.24), rgba(32, 148, 210, 0.14));
    border-color: rgba(200, 57, 43, 0.42);
    box-shadow:
      0 16px 30px rgba(200, 57, 43, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
}

.menu__icon {
  width: 1rem;
  color: $accent-red;
  flex: 0 0 auto;
}

.sidebar-footer {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  p {
    color: rgba(246, 241, 232, 0.62);
    font-size: 0.88rem;
  }
}

.logout-link {
  width: 100%;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: $text-light;
  border-color: rgba(255, 255, 255, 0.12);
}

.shell__main {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
}

.topbar {
  padding: 1.2rem;
  display: grid;
  gap: 1rem;
  background:
    radial-gradient(circle at 100% 0%, rgba(200, 57, 43, 0.22), transparent 34%),
    radial-gradient(circle at 66% 100%, rgba(32, 148, 210, 0.16), transparent 38%),
    linear-gradient(135deg, #0b1429, #101f3d);
  border-color: rgba(255, 255, 255, 0.12);
}

.topbar__copy {
  display: grid;
  gap: 0.5rem;

  .section-title {
    font-size: clamp(2rem, 4vw, 3.2rem);
    color: $text-light;
  }

  .section-copy {
    max-width: 62ch;
    color: rgba(246, 241, 232, 0.72);
  }
}

.topbar__actions {
  display: grid;
  gap: 0.85rem;
}

.topbar__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.topbar-stat {
  padding: 0.85rem 0.95rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  display: grid;
  gap: 0.15rem;

  span {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: rgba(246, 241, 232, 0.62);
  }

  strong {
    color: $text-light;
    font-size: 0.94rem;
  }
}

.topbar__buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.topbar-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.78rem 0.95rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: $text-light;

  i {
    color: $accent-red;
  }
}

.shell__scroll {
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 0.25rem;
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
  background: rgba(1, 13, 39, 0.76);
  backdrop-filter: blur(14px);
  display: grid;
  place-items: center;
  z-index: 80;
  padding: 1.25rem;
}

.logout-modal__panel {
  width: min(100%, 460px);
  padding: 1.5rem;
  display: grid;
  gap: 0.85rem;
  text-align: left;
  border: 1px solid rgba(1, 13, 39, 0.12);

  h2 {
    font-family: var(--font-display);
    font-size: 1.7rem;
    letter-spacing: -0.05em;
    color: $primary-dark;
  }

  p {
    color: rgba(1, 13, 39, 0.72);
  }
}

.logout-modal__icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: $accent-red;
  background: rgba(200, 57, 43, 0.1);
  font-size: 1.35rem;
}

.logout-modal__eyebrow {
  color: $accent-red;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.logout-modal__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.logout-modal__actions .ghost-button {
  background: rgba(1, 13, 39, 0.06);
  border-color: rgba(1, 13, 39, 0.14);
  color: $primary-dark;
}

@media (min-width: 900px) {
  .shell {
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 1.25rem;
    padding: 1.25rem;
    align-items: start;
  }

  .shell__sidebar {
    position: sticky;
    top: 1.25rem;
    align-self: start;
    height: calc(100vh - 2.5rem);
    overflow-y: auto;
    padding: 1.15rem;
  }

  .shell__sidebar::-webkit-scrollbar {
    width: 8px;
  }

  .shell__sidebar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 999px;
  }

  .shell__sidebar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(200, 57, 43, 0.8));
    border-radius: 999px;
  }

  .topbar {
    padding: 1.4rem 1.5rem;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .topbar__actions {
    justify-items: end;
  }

  .topbar__stats {
    grid-template-columns: repeat(2, max-content);
    justify-content: end;
  }
}

@media (min-width: 1280px) {
  .shell {
    grid-template-columns: 360px minmax(0, 1fr);
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .shell__sidebar {
    padding: 1.35rem;
  }

  .topbar {
    padding: 1.6rem;
  }
}
</style>
