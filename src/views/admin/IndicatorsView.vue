<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { catalogApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { useSessionStore } from '@/stores/session'
import { ACCENT_PALETTE } from '@/config/navigation'
import { formatDateTime, formatIndicator, formatRelative } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import Sparkline from '@/components/charts/Sparkline.vue'
import type { Indicator, IndicatorPreset, IndicatorProvider } from '@/types'

const toasts = useToastStore()
const session = useSessionStore()

const indicators = ref<Indicator[]>([])
const loading = ref(true)
const formOpen = ref(false)
const saving = ref(false)
const editing = ref<Indicator | null>(null)
const formError = ref('')

const confirmOpen = ref(false)
const deleting = ref(false)
const target = ref<Indicator | null>(null)

const presets = ref<IndicatorPreset[]>([])
const syncing = ref('')

const form = reactive({
  name: '',
  code: '',
  value: 0,
  unit: '',
  format: 'number' as 'number' | 'currency' | 'percent',
  source: '',
  color: ACCENT_PALETTE[1],
  order: 0,
  active: true,
  feed: {
    provider: 'manual' as IndicatorProvider,
    symbol: '',
    url: '',
    path: '',
    multiplier: 1,
    refreshHours: 6,
  },
})

const PROVIDER_OPTIONS = [
  { value: 'manual', label: 'Manual', icon: 'fa-solid fa-pen', hint: 'Lo escribe una persona' },
  { value: 'bce', label: 'Banco Central del Ecuador', icon: 'fa-solid fa-landmark', hint: 'Riesgo país, tasas, balanza, remesas' },
  { value: 'sri', label: 'Servicio de Rentas Internas', icon: 'fa-solid fa-receipt', hint: 'Recaudación tributaria mensual' },
  { value: 'yahoo', label: 'Yahoo Finance', icon: 'fa-solid fa-chart-line', hint: 'Materias primas, divisas, índices' },
  { value: 'worldbank', label: 'Banco Mundial', icon: 'fa-solid fa-globe', hint: 'Macro de Ecuador (anual)' },
  { value: 'frankfurter', label: 'Tipos de cambio', icon: 'fa-solid fa-money-bill-transfer', hint: 'Divisas del BCE europeo' },
  { value: 'json', label: 'Endpoint propio', icon: 'fa-solid fa-code', hint: 'Cualquier URL que devuelva JSON' },
]

const REFRESH_OPTIONS = [
  { value: 1, label: 'Cada hora' },
  { value: 6, label: 'Cada 6 horas' },
  { value: 12, label: 'Cada 12 horas' },
  { value: 24, label: 'Una vez al día' },
  { value: 168, label: 'Una vez por semana' },
]

const presetOptions = computed(() => [
  { value: '', label: 'Elegir una fuente lista…' },
  ...presets.value.map((preset) => ({
    value: `${preset.provider}|${preset.symbol}`,
    label: preset.label,
    hint: preset.symbol,
  })),
])

const selectedPreset = ref('')

/** Aplica una fuente del catálogo y rellena el resto del formulario. */
function applyPreset(value: string) {
  selectedPreset.value = value
  if (!value) return

  const [provider, symbol] = value.split('|')
  const preset = presets.value.find((item) => item.provider === provider && item.symbol === symbol)
  if (!preset) return

  form.feed.provider = preset.provider
  form.feed.symbol = preset.symbol
  form.format = preset.format
  if (!form.name.trim()) form.name = preset.label.replace(/\s*\(.*\)$/, '')
}

async function syncOne(indicator: Indicator) {
  syncing.value = indicator._id
  try {
    const { data, message } = await catalogApi.syncIndicator(indicator._id)
    indicators.value = indicators.value.map((item) => (item._id === data._id ? data : item))
    toasts.success(message, `${data.name}: ${formatIndicator(data.value, data.format, data.unit)}`)
  } catch (error) {
    toasts.error('No se pudo sincronizar', apiErrorMessage(error))
  } finally {
    syncing.value = ''
  }
}

async function syncAll() {
  syncing.value = 'all'
  try {
    const { data, message } = await catalogApi.syncIndicators()
    indicators.value = data
    toasts.success('Sincronización completa', message)
  } catch (error) {
    toasts.error('No se pudo sincronizar', apiErrorMessage(error))
  } finally {
    syncing.value = ''
  }
}

function isAuto(indicator: Indicator) {
  return Boolean(indicator.feed?.provider && indicator.feed.provider !== 'manual')
}

const FORMAT_OPTIONS = [
  { value: 'number', label: 'Número', icon: 'fa-solid fa-hashtag' },
  { value: 'currency', label: 'Moneda', icon: 'fa-solid fa-dollar-sign' },
  { value: 'percent', label: 'Porcentaje', icon: 'fa-solid fa-percent' },
]

function delta(indicator: Indicator) {
  if (indicator.previousValue === null || indicator.previousValue === 0) return null
  return ((indicator.value - indicator.previousValue) / Math.abs(indicator.previousValue)) * 100
}

async function load() {
  loading.value = true
  try {
    const { data } = await catalogApi.indicators()
    indicators.value = data
  } catch (error) {
    toasts.error('No pudimos cargar los indicadores', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    name: '',
    code: '',
    value: 0,
    unit: '',
    format: 'number',
    source: '',
    color: ACCENT_PALETTE[1],
    order: indicators.value.length,
    active: true,
    feed: { provider: 'manual', symbol: '', url: '', path: '', multiplier: 1, refreshHours: 6 },
  })
  selectedPreset.value = ''
  formError.value = ''
  formOpen.value = true
}

function openEdit(indicator: Indicator) {
  editing.value = indicator
  Object.assign(form, {
    name: indicator.name,
    code: indicator.code,
    value: indicator.value,
    unit: indicator.unit,
    format: indicator.format,
    source: indicator.source,
    color: indicator.color,
    order: indicator.order,
    active: indicator.active,
    feed: {
      provider: indicator.feed?.provider || 'manual',
      symbol: indicator.feed?.symbol || '',
      url: indicator.feed?.url || '',
      path: indicator.feed?.path || '',
      multiplier: indicator.feed?.multiplier ?? 1,
      refreshHours: indicator.feed?.refreshHours ?? 6,
    },
  })
  selectedPreset.value = indicator.feed?.provider && indicator.feed.provider !== 'manual'
    ? `${indicator.feed.provider}|${indicator.feed.symbol}`
    : ''
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  if (!form.name.trim()) {
    formError.value = 'El nombre es obligatorio.'
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      const { data, message } = await catalogApi.updateIndicator(editing.value._id, form)
      indicators.value = indicators.value.map((item) => (item._id === data._id ? data : item))
      toasts.success(message, data.name)
    } else {
      const { data, message } = await catalogApi.createIndicator(form)
      indicators.value = [...indicators.value, data]
      toasts.success(message, data.name)
    }
    formOpen.value = false
  } catch (error) {
    formError.value = apiErrorMessage(error, 'No se pudo guardar el indicador.')
  } finally {
    saving.value = false
  }
}

function askDelete(indicator: Indicator) {
  target.value = indicator
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!target.value) return
  deleting.value = true
  try {
    await catalogApi.deleteIndicator(target.value._id)
    indicators.value = indicators.value.filter((item) => item._id !== target.value?._id)
    toasts.success('Indicador eliminado')
    confirmOpen.value = false
  } catch (error) {
    toasts.error('No se pudo eliminar', apiErrorMessage(error))
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await load()
  try {
    const { data } = await catalogApi.indicatorPresets()
    presets.value = data
  } catch {
    /* el catálogo de fuentes es opcional */
  }
})
</script>

<template>
  <div class="inds">
    <PageHeader
      eyebrow="Resumen del día"
      title="Indicadores económicos"
      detail="Los conectados se actualizan solos según su cadencia; el resto se escribe a mano."
      icon="fa-solid fa-coins"
    >
      <template #actions>
        <AppButton
          variant="outline"
          icon="fa-solid fa-rotate"
          :loading="syncing === 'all'"
          @click="syncAll"
        >
          Sincronizar ahora
        </AppButton>
        <AppButton icon="fa-solid fa-plus" @click="openCreate">Nuevo indicador</AppButton>
      </template>
    </PageHeader>

    <AppSkeleton v-if="loading" :rows="3" height="110px" />

    <TransitionGroup v-else-if="indicators.length" name="list" tag="div" class="inds__list">
      <article
        v-for="indicator in indicators"
        :key="indicator._id"
        :class="['ind', { 'ind--off': !indicator.active }]"
        :style="{ '--ind': indicator.color }"
      >
        <header>
          <div>
            <strong>{{ indicator.name }}</strong>
            <span v-if="indicator.code">{{ indicator.code }}</span>
          </div>
          <div class="ind__actions">
            <AppButton
              v-if="isAuto(indicator)"
              size="sm"
              variant="ghost"
              icon="fa-solid fa-rotate"
              title="Actualizar desde la fuente"
              :loading="syncing === indicator._id"
              @click="syncOne(indicator)"
            />
            <AppButton size="sm" variant="ghost" icon="fa-solid fa-pen" title="Editar" @click="openEdit(indicator)" />
            <AppButton
              v-if="session.isAdmin"
              size="sm"
              variant="ghost"
              icon="fa-regular fa-trash-can"
              title="Eliminar"
              @click="askDelete(indicator)"
            />
          </div>
        </header>

        <p class="ind__value">{{ formatIndicator(indicator.value, indicator.format, indicator.unit) }}</p>

        <div class="ind__meta">
          <em v-if="delta(indicator) !== null" :class="(delta(indicator) as number) >= 0 ? 'is-up' : 'is-down'">
            <i :class="(delta(indicator) as number) >= 0 ? 'fa-solid fa-caret-up' : 'fa-solid fa-caret-down'" />
            {{ Math.abs(delta(indicator) as number).toFixed(2) }}%
          </em>
          <span v-if="indicator.source">{{ indicator.source }}</span>
          <span>{{ formatDateTime(indicator.measuredAt) }}</span>
        </div>

        <div class="ind__feed">
          <AppBadge v-if="isAuto(indicator)" :tone="indicator.lastSyncStatus === 'error' ? 'danger' : 'moss'" dot>
            {{ indicator.lastSyncStatus === 'error' ? 'fuente caída' : 'automático' }}
          </AppBadge>
          <AppBadge v-else tone="neutral" icon="fa-solid fa-pen">manual</AppBadge>

          <span v-if="isAuto(indicator) && indicator.lastSyncAt">
            {{ formatRelative(indicator.lastSyncAt) }}
          </span>
          <span v-if="isAuto(indicator)">· cada {{ indicator.feed?.refreshHours }} h</span>
        </div>

        <p v-if="indicator.lastSyncStatus === 'error'" class="ind__error" :title="indicator.lastSyncError">
          <i class="fa-solid fa-triangle-exclamation" /> {{ indicator.lastSyncError }}
        </p>

        <Sparkline :values="indicator.history.map((point) => point.value)" :color="indicator.color" :height="34" />
      </article>
    </TransitionGroup>

    <EmptyState v-else icon="fa-solid fa-coins" title="Sin indicadores" detail="Agrega los que acompañan el resumen diario.">
      <AppButton icon="fa-solid fa-plus" @click="openCreate">Nuevo indicador</AppButton>
    </EmptyState>

    <AppModal
      v-model="formOpen"
      size="md"
      :title="editing ? 'Editar indicador' : 'Nuevo indicador'"
      icon="fa-solid fa-coins"
    >
      <form class="iform" @submit.prevent="submit">
        <div class="iform__row">
          <AppField label="Nombre" required :error="formError">
            <input v-model="form.name" type="text" placeholder="Riesgo país" />
          </AppField>
          <AppField label="Código"><input v-model="form.code" type="text" placeholder="EMBI" /></AppField>
        </div>

        <div class="iform__row">
          <AppField label="Valor" required><input v-model.number="form.value" type="number" step="any" /></AppField>
          <AppField label="Unidad"><input v-model="form.unit" type="text" placeholder="pb / USD / %" /></AppField>
          <AppField label="Formato">
            <AppSelect v-model="form.format" :options="FORMAT_OPTIONS" />
          </AppField>
        </div>

        <AppField label="Atribución" hint="El nombre que se muestra bajo la cifra.">
          <input v-model="form.source" type="text" placeholder="Banco Central" />
        </AppField>

        <section class="iform__feed">
          <p class="iform__feed-title">
            <i class="fa-solid fa-bolt" aria-hidden="true" /> Actualización automática
          </p>

          <AppField label="Fuente lista" hint="Atajo: rellena proveedor, símbolo y formato de una vez.">
            <AppSelect :model-value="selectedPreset" :options="presetOptions" @update:model-value="applyPreset(String($event))" />
          </AppField>

          <AppField label="Proveedor">
            <AppSelect v-model="form.feed.provider" :options="PROVIDER_OPTIONS" />
          </AppField>

          <template v-if="form.feed.provider === 'json'">
            <AppField label="URL del endpoint" required>
              <input v-model="form.feed.url" type="url" placeholder="https://api.tu-fuente.ec/indicador" />
            </AppField>
            <AppField label="Ruta al número" hint="Por ejemplo: data.0.valor">
              <input v-model="form.feed.path" type="text" placeholder="data.0.valor" />
            </AppField>
          </template>

          <AppField
            v-else-if="form.feed.provider !== 'manual'"
            label="Símbolo"
            :hint="
              form.feed.provider === 'yahoo'
                ? 'Ticker de Yahoo Finance: CL=F, BZ=F, GC=F…'
                : form.feed.provider === 'bce'
                  ? 'Formato: conjunto|Indicador. Usa mejor el desplegable de arriba.'
                : form.feed.provider === 'worldbank'
                  ? 'Código del Banco Mundial: FP.CPI.TOTL.ZG'
                  : 'Par de divisas: USD/EUR'
            "
            required
          >
            <input v-model="form.feed.symbol" type="text" />
          </AppField>

          <div v-if="form.feed.provider !== 'manual'" class="iform__row">
            <AppField label="Cadencia">
              <AppSelect
                :model-value="form.feed.refreshHours"
                :options="REFRESH_OPTIONS"
                @update:model-value="form.feed.refreshHours = Number($event)"
              />
            </AppField>
            <AppField label="Multiplicador" hint="Para ajustar escala. Deja 1 si no hace falta.">
              <input v-model.number="form.feed.multiplier" type="number" step="any" />
            </AppField>
          </div>

          <p v-if="form.feed.provider === 'manual'" class="iform__feed-note">
            <i class="fa-solid fa-circle-info" aria-hidden="true" />
            Este indicador seguirá escribiéndose a mano. Elige un proveedor para que se actualice solo.
          </p>
        </section>

        <AppField label="Color">
          <div class="iform__palette">
            <button
              v-for="color in ACCENT_PALETTE"
              :key="color"
              type="button"
              :class="{ 'is-on': form.color === color }"
              :style="{ background: color }"
              @click="form.color = color"
            />
          </div>
        </AppField>

        <AppSwitch v-model="form.active" label="Visible en el resumen" />
      </form>

      <template #footer>
        <AppButton variant="ghost" @click="formOpen = false">Cancelar</AppButton>
        <AppButton :loading="saving" icon="fa-regular fa-floppy-disk" @click="submit">Guardar</AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-model="confirmOpen"
      :title="`¿Eliminar «${target?.name || ''}»?`"
      message="Se pierde también su histórico."
      confirm-label="Eliminar"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped lang="scss">
.inds {
  @include col(var(--s-5));
}

.inds__list {
  @include wrap(var(--s-4));
  position: relative;
}

.ind {
  @include col(var(--s-2));
  flex: 1 1 240px;
  padding: var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
  transition: border-color var(--t-fast) var(--ease);

  &:hover {
    border-color: color-mix(in srgb, var(--ind) 45%, transparent);
  }

  header {
    @include row(var(--s-2), flex-start, space-between);

    div {
      @include col(1px);
      min-width: 0;
    }

    strong {
      font-size: 14px;
    }

    span {
      @include eyebrow;
      font-size: 9px;
    }
  }
}

.ind--off {
  opacity: 0.55;
}

.ind__actions {
  @include row(0, center);
  flex-shrink: 0;
}

.ind__value {
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--ind);
}

.ind__meta {
  @include wrap(var(--s-3));
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);

  em {
    font-style: normal;
  }

  .is-up {
    color: var(--moss);
  }
  .is-down {
    color: var(--danger);
  }
}

.ind__feed {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
}

.ind__error {
  @include row(var(--s-2), flex-start);
  font-size: 11px;
  color: var(--danger);
  overflow-wrap: anywhere;
}

.iform {
  @include col(var(--s-4));
}

.iform__feed {
  @include col(var(--s-3));
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--surface-sunken);
  border: 1px solid var(--line);
}

.iform__feed-title {
  @include row(var(--s-2), center);
  @include eyebrow;

  i {
    color: var(--gold);
  }
}

.iform__feed-note {
  @include row(var(--s-2), flex-start);
  font-size: 12px;
  color: var(--text-dim);

  i {
    margin-top: 2px;
  }
}

.iform__row {
  @include wrap(var(--s-3));

  > * {
    flex: 1 1 150px;
  }
}

.iform__palette {
  @include wrap(var(--s-2));

  button {
    width: 32px;
    height: 32px;
    border-radius: var(--r-xs);
    border: 2px solid transparent;

    &.is-on {
      border-color: var(--text-strong);
    }
  }
}
</style>
