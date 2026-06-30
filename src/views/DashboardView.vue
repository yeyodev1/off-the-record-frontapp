<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { moduleConfigs } from '@/config/modules'
import { resourceService } from '@/services/resources'
import StatCard from '@/components/StatCard.vue'

const counts = ref<Record<string, number>>({})

const stats = computed(() => [
  { title: 'Usuarios', key: 'users', detail: 'Cuentas activas y permisos', tone: 'blue' as const },
  { title: 'Articulos', key: 'articles', detail: 'Piezas publicadas y en borrador', tone: 'red' as const },
  { title: 'Exclusivos', key: 'exclusives', detail: 'Contenido premium', tone: 'gold' as const },
  { title: 'Notificaciones', key: 'notifications', detail: 'Mensajes distribuidos', tone: 'blue' as const },
])

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
      <div>
        <span class="hero-card__eyebrow">Editorial control room</span>
        <h2>Panel nuevo para Off The Record</h2>
        <p>
          Base lista para migrar el sistema viejo sin heredar su complejidad visual ni sus flujos rotos.
        </p>
      </div>

      <div class="hero-card__metrics">
        <div>
          <strong>Web only</strong>
          <span>Mobile fuera del alcance actual</span>
        </div>
        <div>
          <strong>Design system</strong>
          <span>Inspirado en la identidad de boscanymoni.com</span>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <StatCard
        v-for="stat in stats"
        :key="stat.key"
        :title="stat.title"
        :value="counts[stat.key] ?? 0"
        :detail="stat.detail"
        :tone="stat.tone"
      />
    </section>

    <section class="module-grid">
      <RouterLink v-for="module in moduleConfigs" :key="module.key" :to="`/${module.path}`" class="module-card">
        <span>{{ module.title }}</span>
        <strong>{{ counts[module.key] ?? 0 }}</strong>
        <p>{{ module.description }}</p>
      </RouterLink>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.dashboard {
  display: grid;
  gap: 1.25rem;
}

.hero-card,
.module-card {
  border-radius: 28px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.hero-card {
  padding: clamp(1.5rem, 3vw, 2rem);
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  background:
    linear-gradient(140deg, rgba(1, 13, 39, 0.98), rgba(8, 8, 8, 0.95)),
    radial-gradient(circle at top right, rgba(32, 148, 210, 0.2), transparent 34%);
  color: $text-light;

  h2 {
    font-size: clamp(2rem, 4vw, 3.4rem);
    letter-spacing: -0.06em;
  }

  p {
    max-width: 60ch;
    margin-top: 0.7rem;
    color: rgba(254, 254, 254, 0.74);
  }
}

.hero-card__eyebrow {
  display: inline-flex;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(254, 254, 254, 0.14);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  color: rgba(254, 254, 254, 0.84);
}

.hero-card__metrics {
  display: grid;
  gap: 0.75rem;
  min-width: 280px;

  div {
    padding: 0.85rem 1rem;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  strong {
    display: block;
    margin-bottom: 0.15rem;
  }

  span {
    color: rgba(254, 254, 254, 0.68);
    font-size: 0.92rem;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.module-card {
  padding: 1.25rem;
  display: grid;
  gap: 0.3rem;
  min-height: 160px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-2px);
  }

  span {
    font-size: 0.76rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(1, 13, 39, 0.58);
  }

  strong {
    font-size: 2.1rem;
    letter-spacing: -0.05em;
    color: $primary-dark;
  }

  p {
    color: rgba(1, 13, 39, 0.64);
  }
}

@media (max-width: 1100px) {
  .stats-grid,
  .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .stats-grid,
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
