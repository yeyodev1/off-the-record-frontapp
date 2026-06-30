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
    title: 'Módulos activos',
    value: activeModules.value,
    detail: 'Secciones con datos cargados',
    tone: 'secondary' as const,
  },
  {
    title: 'Módulos clave',
    value: criticalModules.value,
    detail: 'Usuarios, artículos y exclusivos',
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
    <section class="dashboard-hero glass-card">
      <div class="dashboard-hero__copy">
        <span class="eyebrow"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> Panel de control</span>
        <h2 class="section-title">Resumen operativo</h2>
        <p class="section-copy">
          Vista unificada del estado del sistema. Navega por módulos, mide volumen y entra en flujo editorial sin fricción.
        </p>

        <div class="dashboard-hero__meta">
          <span class="chip"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> {{ lastSyncLabel }}</span>
          <span class="chip"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> {{ moduleConfigs.length }} módulos</span>
        </div>
      </div>

      <div class="dashboard-hero__signal">
        <div class="signal-card signal-card--primary">
          <span>Flujo</span>
          <strong>Editorial live</strong>
          <p>Lectura rápida con brillo, contraste y ritmo visual.</p>
        </div>

        <div class="signal-grid">
          <article>
            <span>Total</span>
            <strong>{{ totalRecords }}</strong>
          </article>
          <article>
            <span>Activos</span>
            <strong>{{ activeModules }}</strong>
          </article>
        </div>
      </div>
    </section>

    <section class="dashboard-metrics">
      <StatCard
        v-for="(kpi, index) in kpis"
        :key="kpi.title"
        :title="kpi.title"
        :value="kpi.value"
        :detail="kpi.detail"
        :tone="kpi.tone"
        class="dashboard-metrics__card"
        :class="`dashboard-metrics__card--${index + 1}`"
      />
    </section>

    <section class="dashboard-grid">
      <section class="dashboard-panel surface-card">
        <div class="dashboard-panel__head">
          <div>
            <span class="section-label">Directorio</span>
            <h3 class="section-title">Módulos del sistema</h3>
          </div>
          <span class="dashboard-panel__badge">{{ activeModules }} activos</span>
        </div>

        <div class="module-list">
          <RouterLink v-for="module in moduleConfigs" :key="module.key" :to="`/${module.path}`" class="module-item">
            <div class="module-item__icon">
              <i class="fa-solid" :class="module.icon" aria-hidden="true"></i>
            </div>

            <div class="module-item__copy">
              <span>{{ module.title }}</span>
              <p>{{ module.description }}</p>
            </div>

            <div class="module-item__meta">
              <strong>{{ counts[module.key] ?? 0 }}</strong>
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </div>
          </RouterLink>
        </div>
      </section>

      <aside class="dashboard-panel dashboard-panel--aside surface-card">
        <div class="dashboard-panel__head">
          <div>
            <span class="section-label">Favoritos</span>
            <h3 class="section-title">Accesos rápidos</h3>
          </div>
        </div>

        <div class="quick-list">
          <RouterLink v-for="module in summaryModules" :key="module!.key" :to="`/${module!.path}`" class="quick-item">
            <i class="fa-solid" :class="module!.icon" aria-hidden="true"></i>
            <div class="quick-item__copy">
              <strong>{{ module!.title }}</strong>
              <span>Ir al módulo <i class="fa-solid fa-arrow-right"></i></span>
            </div>
          </RouterLink>
        </div>

        <div class="dashboard-note glass-card">
          <span class="section-label">Estado</span>
          <p>
            La experiencia ya responde a una narrativa más experimental: superficies, contrastes altos y jerarquías más teatrales.
          </p>
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
  min-width: 0;
}

.dashboard-hero {
  padding: 1.2rem;
  display: grid;
  gap: 1.2rem;
  color: $text-light;
  background:
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.2), transparent 28%),
    radial-gradient(circle at bottom left, rgba(32, 148, 210, 0.16), transparent 24%),
    linear-gradient(135deg, rgba(6, 12, 28, 0.98), rgba(12, 23, 54, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
  min-width: 0;
}

.dashboard-hero::before {
  content: '';
  position: absolute;
  inset: -20% auto auto -10%;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.14), transparent 70%);
  filter: blur(18px);
  opacity: 0.8;
  pointer-events: none;
}

.dashboard-hero__copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.9rem;
  min-width: 0;

  .section-title {
    font-size: clamp(2.4rem, 8vw, 4.5rem);
    max-width: 10ch;
  }

  .section-copy {
    max-width: 56ch;
    font-size: 1.02rem;
    color: rgba(246, 241, 232, 0.76);
  }
}

.dashboard-hero__meta {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.dashboard-hero__signal {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.8rem;
  min-width: 0;
}

.signal-card,
.signal-grid article {
  border-radius: var(--radius-xl);
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px);
  min-width: 0;
}

.signal-card span,
.signal-grid span {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  color: rgba(246, 241, 232, 0.68);
}

.signal-card strong {
  display: block;
  margin-top: 0.35rem;
  font-family: var(--font-display);
  font-size: 1.4rem;
  letter-spacing: -0.04em;
}

.signal-card p {
  margin-top: 0.45rem;
  color: rgba(246, 241, 232, 0.72);
}

.signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  strong {
    display: block;
    margin-top: 0.25rem;
    font-family: var(--font-display);
    font-size: 2rem;
    letter-spacing: -0.05em;
  }
}

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
  min-width: 0;
}

.dashboard-metrics__card {
  min-height: 100%;
}

.dashboard-grid {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.dashboard-panel {
  padding: 1.1rem;
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.dashboard-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;

  .section-title {
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    color: $primary-dark;
  }
}

.dashboard-panel__badge {
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  background: rgba(200, 57, 43, 0.08);
  border: 1px solid rgba(200, 57, 43, 0.16);
  color: $accent-red;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}

.module-list {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
}

.module-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.95rem;
  align-items: center;
  padding: 1rem;
  border-radius: 22px;
  background: linear-gradient(145deg, #ffffff, #f8f7f4);
  border: 1px solid rgba(1, 13, 39, 0.06);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  min-width: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 30px rgba(1, 13, 39, 0.08);
    border-color: rgba(200, 57, 43, 0.12);
  }
}

.module-item__icon {
  width: 3.2rem;
  height: 3.2rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(1, 13, 39, 0.04);
  color: $accent-red;
  font-size: 1.1rem;
}

.module-item__copy {
  min-width: 0;

  span {
    display: block;
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: $primary-dark;
  }

  p {
    margin-top: 0.25rem;
    color: rgba(1, 13, 39, 0.62);
    font-size: 0.9rem;
  }
}

.module-item__meta {
  display: grid;
  justify-items: end;
  gap: 0.2rem;

  strong {
    font-family: var(--font-display);
    font-size: 1.5rem;
    color: $accent-red;
    letter-spacing: -0.04em;
  }

  i {
    color: rgba(1, 13, 39, 0.42);
  }
}

.dashboard-panel--aside {
  display: grid;
  gap: 1rem;
}

.quick-list {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem;
  border-radius: 22px;
  background: linear-gradient(135deg, #0c1736, #c8392b);
  color: white;
  transition: transform 180ms ease, box-shadow 180ms ease;
  min-width: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 34px rgba(200, 57, 43, 0.22);
  }

  i {
    font-size: 1.35rem;
  }
}

.quick-item__copy {
  display: grid;
  gap: 0.2rem;

  strong {
    font-family: var(--font-display);
    font-size: 1rem;
    letter-spacing: -0.03em;
  }

  span {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.78);
  }
}

.dashboard-note {
  padding: 1rem;
  display: grid;
  gap: 0.5rem;
  color: $text-light;
  background: linear-gradient(135deg, rgba(6, 12, 28, 0.96), rgba(12, 23, 54, 0.9));

  p {
    color: rgba(246, 241, 232, 0.78);
  }
}

@media (min-width: 780px) {
  .dashboard-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-hero {
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
    align-items: end;
    padding: 1.5rem;
  }
}

@media (min-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }
}

@media (min-width: 1600px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.74fr);
  }

  .dashboard-panel--aside {
    position: sticky;
    top: 0;
  }
}
</style>
