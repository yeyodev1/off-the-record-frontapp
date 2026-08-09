<script setup lang="ts">
import { ref } from 'vue'
import { contentApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/composables/useFormat'
import AppPanel from '@/components/ui/AppPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import type { ContentKind, ShareInfo } from '@/types'

const props = defineProps<{ kind: ContentKind; contentId: string; share?: ShareInfo | null }>()
const emit = defineEmits<{ (e: 'updated', value: ShareInfo): void }>()

const toasts = useToastStore()
const enabled = ref(props.share?.enabled ?? false)
const expiresInHours = ref(0)
const link = ref('')
const signalLink = ref('')
const saving = ref(false)

const EXPIRY_OPTIONS = [
  { value: 0, label: 'Sin caducidad' },
  { value: 24, label: '24 horas' },
  { value: 72, label: '3 días' },
  { value: 168, label: '7 días' },
  { value: 720, label: '30 días' },
]

async function apply(next: boolean) {
  if (!props.contentId) {
    toasts.info('Guarda primero', 'Necesitas guardar el contenido antes de generar el enlace.')
    enabled.value = false
    return
  }

  saving.value = true
  try {
    const { data, message } = await contentApi.share(props.kind, props.contentId, {
      enabled: next,
      expiresInHours: expiresInHours.value || undefined,
    })

    enabled.value = data.enabled
    link.value = data.url
    signalLink.value = data.signalUrl

    emit('updated', {
      enabled: data.enabled,
      token: data.token,
      expiresAt: data.expiresAt,
      visits: props.share?.visits || 0,
      lastVisitAt: props.share?.lastVisitAt || null,
      channel: 'signal',
    })

    toasts.success(message)
  } catch (error) {
    enabled.value = !next
    toasts.error('No se pudo actualizar el enlace', apiErrorMessage(error))
  } finally {
    saving.value = false
  }
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toasts.success(`${label} copiado`, 'Pégalo en Signal para enviarlo al cliente.')
  } catch {
    toasts.error('No se pudo copiar', 'Copia el enlace manualmente desde el campo.')
  }
}
</script>

<template>
  <AppPanel title="Enlace para Signal" detail="Distribución directa a clientes" icon="fa-solid fa-share-nodes" tone="var(--moss)">
    <div class="share">
      <AppSwitch
        :model-value="enabled"
        label="Enlace privado activo"
        hint="Genera una URL con token que puedes enviar por Signal."
        :disabled="saving"
        @update:model-value="apply"
      />

      <label class="share__expiry">
        <span>Caduca en</span>
        <AppSelect
          :model-value="expiresInHours"
          :options="EXPIRY_OPTIONS"
          :disabled="saving"
          size="sm"
          @update:model-value="expiresInHours = Number($event)"
        />
      </label>

      <template v-if="enabled && link">
        <div class="share__field">
          <input :value="link" readonly />
          <AppButton size="sm" variant="outline" icon="fa-regular fa-copy" @click="copy(link, 'Enlace')" />
        </div>

        <div class="share__actions">
          <a class="share__signal" :href="signalLink" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-signal-messenger" aria-hidden="true" /> Abrir en Signal
          </a>
          <AppButton size="sm" variant="ghost" icon="fa-solid fa-rotate" :loading="saving" @click="apply(true)">
            Regenerar
          </AppButton>
        </div>
      </template>

      <p v-if="share?.enabled" class="share__stats">
        <i class="fa-solid fa-eye" aria-hidden="true" />
        {{ share.visits }} visitas
        <template v-if="share.lastVisitAt"> · última {{ formatDateTime(share.lastVisitAt) }}</template>
        <template v-if="share.expiresAt"> · caduca {{ formatDateTime(share.expiresAt) }}</template>
      </p>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.share {
  @include col(var(--s-4));
}

.share__expiry {
  @include row(var(--s-3), center);
  font-size: 12px;
  color: var(--text-muted);

  > * {
    flex: 1;
  }
}

.share__field {
  @include row(var(--s-2), center);

  input {
    flex: 1;
    min-width: 0;
    padding: 9px 12px;
    border-radius: var(--r-sm);
    background: var(--surface-sunken);
    border: 1px solid var(--line);
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }
}

.share__actions {
  @include row(var(--s-2), center);
  flex-wrap: wrap;
}

.share__signal {
  @include row(var(--s-2), center);
  padding: 8px 16px;
  border-radius: var(--r-pill);
  background: var(--moss-soft);
  border: 1px solid rgba(87, 167, 115, 0.4);
  font-size: 13px;
  font-weight: 600;
  color: #7fce9c;

  &:hover {
    background: rgba(87, 167, 115, 0.24);
  }
}

.share__stats {
  @include row(var(--s-2), center);
  @include eyebrow;
  font-size: 10px;
}
</style>
