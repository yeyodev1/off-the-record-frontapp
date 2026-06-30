<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { moduleConfigs } from '@/config/modules'
import { resourceService } from '@/services/resources'
import StatCard from '@/components/StatCard.vue'

const counts = ref<Record<string, number>>({})

const totalRecords = computed(() =>
  Object.values(counts.value).reduce((sum, value) => sum + (Number(value) || 0), 0),
)

const activeModules = computed(() =>
  moduleConfigs.filter((module) => (counts.value[module.key] ?? 0) > 0).length,
)

const criticalModules = computed(() =>
  ['users', 'articles', 'exclusives'].filter((key) => (counts.value[key] ?? 0) > 0).length,
)

const kpis = computed(() => [
  {
    title: 'Registros totales',
    value: totalRecords.value,
    detail: 'Suma de todos los módulos activos',
    tone: 'primary' as const,
  },
  {
    title: 'Modulos con actividad',
    value: activeModules.value,
    detail: 'Secciones con datos cargados',
    tone: 'secondary' as const,
  },
  {
    title: 'Modulos clave',
    value: criticalModules.value,
    detail: 'Usuarios, articulos y exclusivos',
    tone: 'error' as const,
  },
])

const summaryModules = computed(() => [
  moduleConfigs.find((module) => module.key === 'users'),
  moduleConfigs.find((module) => module.key === 'articles'),
  moduleConfigs.find((module) => module.key === 'exclusives'),
].filter(Boolean))

const lastSyncLabel = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
})

onMounted(async () => {
  await Promise.all(
    moduleConfigs.map(async (module) => {
      try {
        const response = await resourceService.count(module.apiPath)
        counts.value[module.key] = response.count
      } catch {
        counts.value[module.key] = 0
      }
    }),
  )
})
</script>

<template>
  <div class="dashboard">
    <section class="hero-card">
      <div class="hero-card__copy">
        <span class="hero-card__eyebrow"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> Dashboard</span>
        <h2>Resumen operativo del panel</h2>
        <p>
          Una vista clara para entender el estado del sistema, entrar a los módulos importantes y actuar sin perder tiempo.
        </p>

        <div class="hero-card__meta">
          <span><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Sincronizado {{ lastSyncLabel }}</span>
          <span><i class="fa-solid fa-layer-group" aria-hidden="true"></i> {{ moduleConfigs.length }} modulos</span>
        </div>
      </div>

      <div class="hero-card__panel">
        <div class="hero-card__panel-label">Acceso rapido</div>
        <div class="hero-card__panel-links">
          <RouterLink to="/users">Usuarios</RouterLink>
          <RouterLink to="/articles">Articulos</RouterLink>
          <RouterLink to="/exclusives">Exclusivos</RouterLink>
        </div>
      </div>
    </section>

    <section class="kpi-grid">
      <StatCard
        v-for="kpi in kpis"
        :key="kpi.title"
        :title="kpi.title"
        :value="kpi.value"
        :detail="kpi.detail"
        :tone="kpi.tone"
      />
    </section>

    <section class="workspace">
      <div class="workspace__main">
        <div class="section-head">
          <div>
            <span>Modulos</span>
            <h3>Acceso directo al contenido</h3>
          </div>
          <p>Entra al módulo que necesites con una lectura rápida del volumen de datos.</p>
        </div>

        <div class="module-list">
          <RouterLink v-for="module in moduleConfigs" :key="module.key" :to="`/${module.path}`" class="module-list__item">
            <div class="module-list__icon">
              <i class="fa-solid" :class="module.icon" aria-hidden="true"></i>
            </div>

            <div class="module-list__copy">
              <span>{{ module.title }}</span>
              <p>{{ module.description }}</p>
            </div>

            <div class="module-list__meta">
              <strong>{{ counts[module.key] ?? 0 }}</strong>
              <small>Registros</small>
            </div>
          </RouterLink>
        </div>
      </div>

      <aside class="workspace__aside">
        <div class="section-head section-head--compact">
          <div>
            <span>Bloques clave</span>
            <h3>Lo mas usado</h3>
          </div>
        </div>

        <div class="summary-list">
          <RouterLink v-for="module in summaryModules" :key="module!.key" :to="`/${module!.path}`" class="summary-list__item">
            <i class="fa-solid" :class="module!.icon" aria-hidden="true"></i>
            <div>
              <strong>{{ module!.title }}</strong>
              <p>{{ module!.presentation.headline }}</p>
            </div>
          </RouterLink>
        </div>
      </aside>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.dashboard {
  display: grid;
  gap: 1rem;
}

.hero-card {
  border-radius: 28px;
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
  background:
    linear-gradient(140deg, rgba(1, 13, 39, 0.98), rgba(1, 13, 39, 0.94)),
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.2), transparent 34%),
    radial-gradient(circle at bottom left, rgba(200, 57, 43, 0.14), transparent 28%);
  color: $text-light;
  box-shadow: 0 28px 80px rgba(1, 13, 39, 0.18);

  h2 {
    font-size: clamp(1.9rem, 7vw, 3.4rem);
    letter-spacing: -0.06em;
  }

  p {
    max-width: 60ch;
    margin-top: 0.7rem;
    color: rgba(254, 254, 254, 0.74);
  }
}

.hero-card__copy {
  display: grid;
  gap: 0.85rem;
}

.hero-card__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: fit-content;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(254, 254, 254, 0.14);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  color: rgba(254, 254, 254, 0.84);

  i {
    color: $accent-red;
  }
}

.hero-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(254, 254, 254, 0.14);
    background: rgba(255, 255, 255, 0.05);
    color: rgba(254, 254, 254, 0.84);
    font-size: 0.78rem;
  }

  i {
    color: $accent-red;
  }
}

.hero-card__panel {
  padding: 1rem;
  border-radius: 24px;
  border: 1px solid rgba(254, 254, 254, 0.08);
  background: rgba(255, 255, 255, 0.05);
  display: grid;
  gap: 0.85rem;
  align-content: start;
}

.hero-card__panel-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  color: rgba(254, 254, 254, 0.68);
}

.hero-card__panel-links {
  display: grid;
  gap: 0.65rem;

  a {
    padding: 0.85rem 0.95rem;
    border-radius: 16px;
    border: 1px solid rgba(254, 254, 254, 0.1);
    background: rgba(1, 13, 39, 0.28);
    font-weight: 700;
  }
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}

.workspace {
  display: grid;
  gap: 1rem;
}

.workspace__main,
.workspace__aside {
  border-radius: 28px;
  border: 1px solid rgba(1, 13, 39, 0.08);
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 1rem;
}

.workspace__main {
  display: grid;
  gap: 1rem;
}

.section-head {
  display: grid;
  gap: 0.35rem;

  span {
    display: inline-block;
    color: $accent-red;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.7rem;
  }

  h3 {
    font-size: 1.45rem;
    color: $primary-dark;
    letter-spacing: -0.04em;
  }

  p {
    color: rgba(1, 13, 39, 0.68);
    max-width: 58ch;
  }
}

.section-head--compact {
  margin-bottom: 0.75rem;
}

.module-list {
  display: grid;
  gap: 0.75rem;
}

.module-list__item,
.summary-list__item {
  border-radius: 22px;
  border: 1px solid rgba(1, 13, 39, 0.08);
  background: linear-gradient(180deg, #fff, #fbfbfb);
  box-shadow: var(--shadow);
}

.module-list__item {
  padding: 1rem;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
}

.module-list__icon {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(1, 13, 39, 0.04);

  i {
    color: $accent-red;
  }
}

.module-list__copy {
  min-width: 0;

  span {
    display: block;
    font-weight: 800;
    color: $primary-dark;
    margin-bottom: 0.15rem;
  }

  p {
    color: rgba(1, 13, 39, 0.66);
    font-size: 0.9rem;
  }
}

.module-list__meta {
  text-align: right;

  strong {
    display: block;
    font-size: 1.35rem;
    color: $accent-red;
    line-height: 1;
  }

  small {
    color: rgba(1, 13, 39, 0.56);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.68rem;
  }
}

.summary-list {
  display: grid;
  gap: 0.75rem;
}

.summary-list__item {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;

  i {
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: rgba(200, 57, 43, 0.08);
    color: $accent-red;
    flex: 0 0 auto;
  }

  div {
    min-width: 0;
  }

  strong {
    display: block;
    color: $primary-dark;
    font-weight: 800;
  }

  p {
    color: rgba(1, 13, 39, 0.66);
    font-size: 0.9rem;
  }
}

@media (min-width: 720px) {
  .hero-card {
    grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
    align-items: end;
  }

  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .workspace {
    grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.8fr);
    align-items: start;
  }
}
</style>
