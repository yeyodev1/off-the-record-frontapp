<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { moduleConfigs } from '@/config/modules'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const menuItems = computed(() => [
  { label: 'Dashboard', path: '/dashboard', accent: 'blue' as const },
  ...moduleConfigs.map((module) => ({
    label: module.title,
    path: `/${module.path}`,
    accent: module.accent,
  })),
])

const pageTitle = computed(() => String(route.meta.title || 'Off The Record'))

function signOut() {
  userStore.clear()
  router.push('/login')
}
</script>

<template>
  <div class="shell">
    <aside class="shell__sidebar">
      <div class="brand">
        <span class="brand__eyebrow">Off The Record</span>
        <strong class="brand__title">Admin Web</strong>
        <p>Editorial dashboard for the new stack</p>
      </div>

      <nav class="menu">
        <RouterLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="menu__item"
          :class="[`menu__item--${item.accent}`]"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="shell__main">
      <header class="topbar">
        <div>
          <span class="topbar__eyebrow">{{ route.meta.moduleKey ? 'Modulo' : 'Vista' }}</span>
          <h1>{{ pageTitle }}</h1>
        </div>

        <div class="topbar__actions">
          <div class="user-chip">
            <strong>{{ userStore.name || 'Admin' }}</strong>
            <span>{{ userStore.email || 'session' }}</span>
          </div>
          <button class="ghost-button" type="button" @click="signOut">Salir</button>
        </div>
      </header>

      <section class="shell__content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  background: linear-gradient(135deg, rgba(1, 13, 39, 0.02), transparent 55%);
}

.shell__sidebar {
  padding: 2rem 1.5rem;
  background: linear-gradient(180deg, rgba(1, 13, 39, 0.98), rgba(8, 8, 8, 0.98));
  color: $text-light;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  border-right: 1px solid rgba(254, 254, 254, 0.08);
}

.brand {
  padding: 1.25rem;
  border: 1px solid rgba(254, 254, 254, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.03);

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
    font-size: 1.4rem;
  }

  p {
    margin-top: 0.65rem;
    color: rgba(254, 254, 254, 0.62);
    font-size: 0.95rem;
  }
}

.menu {
  display: grid;
  gap: 0.65rem;

  &__item {
    padding: 0.95rem 1rem;
    border-radius: 16px;
    border: 1px solid rgba(254, 254, 254, 0.08);
    background: rgba(255, 255, 255, 0.02);
    color: rgba(254, 254, 254, 0.88);
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;

    &:hover,
    &.router-link-active {
      transform: translateX(4px);
      background: rgba(255, 255, 255, 0.08);
    }

    &--blue.router-link-active {
      border-color: rgba(32, 148, 210, 0.5);
    }

    &--gold.router-link-active {
      border-color: rgba(201, 168, 76, 0.55);
    }

    &--red.router-link-active {
      border-color: rgba(200, 57, 43, 0.55);
    }
  }
}

.shell__main {
  min-width: 0;
  padding: 1.5rem;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;

  h1 {
    font-size: clamp(1.8rem, 3vw, 2.4rem);
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  &__eyebrow {
    display: block;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(1, 13, 39, 0.54);
    margin-bottom: 0.25rem;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
}

.user-chip {
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: grid;
  gap: 0.15rem;

  strong {
    font-size: 0.95rem;
  }

  span {
    color: rgba(1, 13, 39, 0.58);
    font-size: 0.86rem;
  }
}

.ghost-button {
  border: 1px solid rgba(1, 13, 39, 0.12);
  background: rgba(255, 255, 255, 0.65);
  color: $primary-dark;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  cursor: pointer;
}

.shell__content {
  min-width: 0;
}

@media (max-width: 1100px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .shell__sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(254, 254, 254, 0.08);
  }
}

@media (max-width: 720px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar__actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
