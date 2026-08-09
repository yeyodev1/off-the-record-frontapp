<script setup lang="ts">
import { computed } from 'vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { MessagingSettings, NotificationChannel } from '@/types'

const props = defineProps<{ settings: MessagingSettings; canEdit: boolean }>()
const emit = defineEmits<{ (event: 'change', patch: Record<string, unknown>): void }>()

/** Cada regla, explicada por lo que de verdad la dispara en el backend. */
const RULES = [
  {
    key: 'onArticlePublish' as const,
    label: 'Al publicar un reportaje',
    icon: 'fa-solid fa-newspaper',
    detail:
      'Se dispara cuando el reportaje cruza a «publicado»: al guardarlo publicado, o cuando el planificador alcanza su fecha programada. Reeditar algo ya publicado no vuelve a avisar.',
  },
  {
    key: 'onUpdatePublish' as const,
    label: 'Al publicar una actualización',
    icon: 'fa-solid fa-bolt',
    detail: 'Igual que los reportajes, con el seguimiento colgando de su reportaje madre.',
  },
  {
    key: 'onDailyReport' as const,
    label: 'Cuando sale el reporte diario',
    icon: 'fa-solid fa-file-lines',
    detail:
      'El reporte lo redacta Gemini solo, pasada la hora configurada en REPORT_DAILY_HOUR. Con esto activado, además se avisa a la audiencia.',
  },
]

const CHANNELS: { value: NotificationChannel; label: string; icon: string }[] = [
  { value: 'app', label: 'Campana', icon: 'fa-regular fa-bell' },
  { value: 'telegram', label: 'Telegram', icon: 'fa-brands fa-telegram' },
  { value: 'signal', label: 'Signal', icon: 'fa-solid fa-comment-dots' },
]

const active = computed(() => props.settings.auto.channels || ['app'])

function toggleRule(key: (typeof RULES)[number]['key'], value: boolean) {
  emit('change', { auto: { ...props.settings.auto, [key]: value } })
}

function toggleChannel(channel: NotificationChannel) {
  const current = new Set(active.value)
  if (current.has(channel)) current.delete(channel)
  else current.add(channel)

  // La campana no se puede quitar: es el registro dentro de la app.
  current.add('app')
  emit('change', { auto: { ...props.settings.auto, channels: [...current] } })
}
</script>

<template>
  <section class="auto">
    <header class="auto__head">
      <div>
        <h2><i class="fa-solid fa-robot" aria-hidden="true" /> Notificaciones automáticas</h2>
        <p>Nadie las escribe: las dispara el sistema. El planificador revisa cada 60 segundos.</p>
      </div>
    </header>

    <div class="auto__rules">
      <article v-for="rule in RULES" :key="rule.key" class="auto__rule">
        <div class="auto__rule-main">
          <h3><i :class="rule.icon" aria-hidden="true" /> {{ rule.label }}</h3>
          <p>{{ rule.detail }}</p>
        </div>

        <AppSwitch
          :model-value="settings.auto[rule.key]"
          :disabled="!canEdit"
          @update:model-value="toggleRule(rule.key, $event)"
        />
      </article>
    </div>

    <footer class="auto__channels">
      <p class="auto__label">Por dónde salen las automáticas</p>
      <div class="auto__chips">
        <button
          v-for="channel in CHANNELS"
          :key="channel.value"
          :class="['auto__chip', { 'auto__chip--on': active.includes(channel.value) }]"
          type="button"
          :disabled="!canEdit || channel.value === 'app'"
          :title="channel.value === 'app' ? 'La campana siempre queda registrada' : ''"
          @click="toggleChannel(channel.value)"
        >
          <i :class="channel.icon" aria-hidden="true" />
          {{ channel.label }}
          <i v-if="active.includes(channel.value)" class="fa-solid fa-check" aria-hidden="true" />
        </button>
      </div>

      <p class="auto__note">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        Telegram y Signal solo salen si su integración está encendida y la persona tiene destino guardado en su ficha.
      </p>
    </footer>

    <div class="auto__flow">
      <p class="auto__label">Recorrido de una automática</p>
      <ol>
        <li><AppBadge color="var(--gold)">1</AppBadge> La pieza cruza a «publicado»</li>
        <li><AppBadge color="var(--gold)">2</AppBadge> Se encola una notificación con <code>trigger: publish</code></li>
        <li><AppBadge color="var(--gold)">3</AppBadge> El planificador resuelve la audiencia</li>
        <li><AppBadge color="var(--gold)">4</AppBadge> Se escribe por cada canal activo</li>
        <li><AppBadge color="var(--gold)">5</AppBadge> Se guarda el resultado: entregados y fallidos</li>
      </ol>
    </div>
  </section>
</template>

<style scoped lang="scss">
.auto {
  @include col(var(--s-5));
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
}

.auto__head {
  h2 {
    @include row(var(--s-2), center);
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--text-strong);

    i {
      font-size: 14px;
      color: var(--gold);
    }
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.auto__rules {
  @include col(var(--s-2));
}

.auto__rule {
  @include row(var(--s-4), center, space-between);
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
}

.auto__rule-main {
  @include col(4px);
  flex: 1;
  min-width: 0;

  h3 {
    @include row(var(--s-2), center);
    font-size: 14px;
    color: var(--text);

    i {
      font-size: 11px;
      color: var(--text-dim);
    }
  }

  p {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.auto__label {
  @include eyebrow;
  padding-bottom: var(--s-2);
}

.auto__channels {
  @include col(var(--s-2));
}

.auto__chips {
  @include wrap(var(--s-2));
}

.auto__chip {
  @include row(var(--s-2), center);
  padding: 7px 14px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--text-muted);
  transition:
    border-color var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover:not(:disabled) {
    border-color: var(--line-strong);
    color: var(--text);
  }

  &:disabled {
    cursor: default;
  }
}

.auto__chip--on {
  border-color: var(--brand-line);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.auto__note {
  @include row(var(--s-2), flex-start);
  font-size: 12px;
  color: var(--text-dim);

  i {
    margin-top: 2px;
  }
}

.auto__flow {
  padding-top: var(--s-2);
  border-top: 1px dashed var(--line);

  ol {
    @include col(var(--s-2));
    list-style: none;
  }

  li {
    @include row(var(--s-3), center);
    font-size: 13px;
    color: var(--text-muted);
  }

  code {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--gold);
  }
}
</style>
