<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { aiApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { SpellReport } from '@/types'

const props = defineProps<{ body: string; report?: SpellReport | null }>()

const toasts = useToastStore()
const local = ref<SpellReport | null>(null)
const checking = ref(false)

const active = computed(() => local.value || props.report || null)

const grouped = computed(() => {
  const issues = active.value?.issues || []
  return {
    error: issues.filter((issue) => issue.severity === 'error'),
    warning: issues.filter((issue) => issue.severity === 'warning'),
    style: issues.filter((issue) => issue.severity === 'style'),
  }
})

const tone = computed(() => {
  const score = active.value?.score ?? 100
  if (score >= 92) return 'moss'
  if (score >= 75) return 'gold'
  return 'danger'
})

async function check() {
  if (!props.body.trim()) {
    toasts.info('Nada que revisar', 'Escribe contenido antes de pasar el corrector.')
    return
  }

  checking.value = true
  try {
    const { data } = await aiApi.spellcheck(props.body)
    local.value = data
    if (!data.issues.length) toasts.success('Sin errores detectados', 'El texto pasó la revisión ortográfica.')
    else toasts.warning(`${data.issues.length} avisos ortográficos`, 'Revísalos en el panel lateral.')
  } catch (error) {
    toasts.error('No se pudo revisar', apiErrorMessage(error))
  } finally {
    checking.value = false
  }
}

watch(
  () => props.body,
  () => {
    local.value = null
  },
)
</script>

<template>
  <AppPanel title="Ortografía" detail="Corrector en español" icon="fa-solid fa-spell-check" tone="var(--gold)">
    <template #actions>
      <AppBadge v-if="active" :tone="tone as never">{{ active.score }}/100</AppBadge>
      <AppButton size="sm" variant="outline" icon="fa-solid fa-rotate" :loading="checking" @click="check">
        Revisar
      </AppButton>
    </template>

    <div v-if="active?.issues?.length" class="spell">
      <div class="spell__counts">
        <span class="is-error"><i class="fa-solid fa-circle-exclamation" /> {{ grouped.error.length }} errores</span>
        <span class="is-warn"><i class="fa-solid fa-triangle-exclamation" /> {{ grouped.warning.length }} avisos</span>
        <span class="is-style"><i class="fa-solid fa-pen-fancy" /> {{ grouped.style.length }} estilo</span>
      </div>

      <ul class="spell__list">
        <li v-for="(issue, index) in active.issues.slice(0, 40)" :key="index" :class="`is-${issue.severity}`">
          <p class="spell__message">{{ issue.message }}</p>
          <p class="spell__excerpt">{{ issue.excerpt }}</p>
          <p v-if="issue.suggestion" class="spell__fix">
            <i class="fa-solid fa-arrow-right-long" /> {{ issue.suggestion }}
          </p>
        </li>
      </ul>

      <p v-if="active.issues.length > 40" class="spell__more">
        y {{ active.issues.length - 40 }} avisos más…
      </p>
    </div>

    <EmptyState
      v-else
      icon="fa-solid fa-circle-check"
      :title="active ? 'Sin errores detectados' : 'Aún no revisado'"
      :detail="active ? 'El texto pasó la revisión.' : 'Pulsa «Revisar» para pasar el corrector.'"
    />
  </AppPanel>
</template>

<style scoped lang="scss">
.spell {
  @include col(var(--s-3));
}

.spell__counts {
  @include wrap(var(--s-3));
  font-family: var(--font-mono);
  font-size: 11px;

  .is-error {
    color: var(--danger);
  }
  .is-warn {
    color: var(--gold);
  }
  .is-style {
    color: var(--text-dim);
  }
}

.spell__list {
  @include col(var(--s-2));
  list-style: none;
  max-height: 340px;
  overflow-y: auto;
  @include scrollbar;

  li {
    @include col(3px);
    padding: var(--s-3);
    border-radius: var(--r-sm);
    background: var(--surface-sunken);
    border-inline-start: 3px solid var(--line-strong);
  }

  .is-error {
    border-inline-start-color: var(--danger);
  }
  .is-warning {
    border-inline-start-color: var(--gold);
  }
  .is-style {
    border-inline-start-color: var(--ocean);
  }
}

.spell__message {
  font-size: 13px;
  font-weight: 600;
}

.spell__excerpt {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  overflow-wrap: anywhere;
}

.spell__fix {
  font-size: 12px;
  color: var(--moss);
}

.spell__more {
  @include eyebrow;
  font-size: 10px;
  text-align: center;
}
</style>
