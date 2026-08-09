<script setup lang="ts">
import { reactive, ref } from 'vue'
import { settingsApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useToastStore } from '@/stores/toast'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import type { ChannelStatus, MessagingSettings } from '@/types'

const props = defineProps<{
  settings: MessagingSettings
  status: { telegram: ChannelStatus; signal: ChannelStatus } | null
  canEdit: boolean
}>()

const emit = defineEmits<{
  (event: 'saved', settings: MessagingSettings): void
  (event: 'refresh'): void
}>()

const toasts = useToastStore()

const saving = ref('')
const testing = ref('')
const testTarget = reactive({ telegram: '', signal: '' })

// El token nunca llega del backend: vacío significa "deja el que ya hay".
const form = reactive({
  telegram: {
    enabled: props.settings.telegram.enabled,
    botToken: '',
    broadcastChatId: props.settings.telegram.broadcastChatId,
  },
  signal: {
    enabled: props.settings.signal.enabled,
    apiUrl: props.settings.signal.apiUrl,
    number: props.settings.signal.number,
    groupId: props.settings.signal.groupId,
  },
})

async function save(channel: 'telegram' | 'signal') {
  saving.value = channel
  try {
    const { data, message } = await settingsApi.save({ [channel]: form[channel] })
    if (channel === 'telegram') form.telegram.botToken = ''
    toasts.success(message, channel === 'telegram' ? 'Telegram' : 'Signal')
    emit('saved', data)
    emit('refresh')
  } catch (error) {
    toasts.error('No se pudo guardar', apiErrorMessage(error))
  } finally {
    saving.value = ''
  }
}

async function test(channel: 'telegram' | 'signal') {
  testing.value = channel
  try {
    const { message } = await settingsApi.test(channel, testTarget[channel] || undefined)
    toasts.success('Mensaje enviado', message)
  } catch (error) {
    toasts.error('No llegó', apiErrorMessage(error))
  } finally {
    testing.value = ''
  }
}

function badgeFor(state?: ChannelStatus) {
  if (!state || !state.configured) return { tone: 'off', label: 'Sin configurar' }
  if (!state.reachable) return { tone: 'bad', label: 'No responde' }
  return { tone: 'ok', label: 'Conectado' }
}
</script>

<template>
  <section class="chan">
    <!-- ---------------- Telegram ---------------- -->
    <article class="chan__card">
      <header class="chan__head">
        <h3><i class="fa-brands fa-telegram" aria-hidden="true" /> Telegram</h3>
        <span :class="['chan__state', `chan__state--${badgeFor(status?.telegram).tone}`]">
          {{ badgeFor(status?.telegram).label }}
        </span>
      </header>

      <p v-if="status?.telegram?.detail" class="chan__detail">{{ status.telegram.detail }}</p>

      <p class="chan__how">
        API oficial de bots. Habla con <strong>@BotFather</strong> en Telegram, crea el bot y pega su token.
        Cada persona debe escribirle <code>/start</code> al bot una vez; el <em>chat id</em> que devuelve se guarda
        en su ficha de usuario.
      </p>

      <AppSwitch v-model="form.telegram.enabled" :disabled="!canEdit" label="Integración activa" />

      <AppField label="Token del bot" :hint="settings.telegram.tokenSet ? `Guardado ${settings.telegram.tokenHint} · escribe uno nuevo para reemplazarlo` : 'Lo entrega @BotFather'">
        <input
          v-model="form.telegram.botToken"
          type="password"
          autocomplete="off"
          :placeholder="settings.telegram.tokenSet ? '•••••••• (sin cambios)' : '123456:ABC-DEF…'"
          :disabled="!canEdit"
        />
      </AppField>

      <AppField label="Canal de difusión" hint="Opcional: un grupo o canal que además recibe todo">
        <input v-model="form.telegram.broadcastChatId" type="text" placeholder="-1001234567890" :disabled="!canEdit" />
      </AppField>

      <footer class="chan__foot">
        <AppButton size="sm" :loading="saving === 'telegram'" :disabled="!canEdit" @click="save('telegram')">
          Guardar
        </AppButton>

        <div class="chan__test">
          <input v-model="testTarget.telegram" type="text" placeholder="Chat de prueba (o el tuyo)" />
          <AppButton
            variant="ghost"
            size="sm"
            icon="fa-solid fa-paper-plane"
            :loading="testing === 'telegram'"
            :disabled="!canEdit"
            @click="test('telegram')"
          >
            Probar
          </AppButton>
        </div>
      </footer>
    </article>

    <!-- ---------------- Signal ---------------- -->
    <article class="chan__card">
      <header class="chan__head">
        <h3><i class="fa-solid fa-comment-dots" aria-hidden="true" /> Signal</h3>
        <span :class="['chan__state', `chan__state--${badgeFor(status?.signal).tone}`]">
          {{ badgeFor(status?.signal).label }}
        </span>
      </header>

      <p v-if="status?.signal?.detail" class="chan__detail">{{ status.signal.detail }}</p>

      <div class="chan__warn">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        <p>
          <strong>Signal no tiene API pública de envío.</strong>
          Lo que publica <code>signal.org/docs</code> son las especificaciones del protocolo, no un servicio al que
          se le pueda pedir «manda este mensaje». La única vía real es un puente propio:
          <code>signal-cli</code> expuesto por <code>signal-cli-rest-api</code>, con un número dedicado y registrado.
          Ese número recibe el SMS de verificación una vez y queda vinculado.
        </p>
      </div>

      <AppSwitch v-model="form.signal.enabled" :disabled="!canEdit" label="Integración activa" />

      <AppField label="URL del puente" hint="Donde corre signal-cli-rest-api, por ejemplo http://localhost:8080">
        <input v-model="form.signal.apiUrl" type="url" placeholder="http://localhost:8080" :disabled="!canEdit" />
      </AppField>

      <AppField label="Número emisor" hint="Ya registrado en el puente, con código de país">
        <input v-model="form.signal.number" type="text" placeholder="+593990000000" :disabled="!canEdit" />
      </AppField>

      <AppField label="Grupo de difusión" hint="Opcional: id de un grupo de Signal">
        <input v-model="form.signal.groupId" type="text" placeholder="group.xxxxx" :disabled="!canEdit" />
      </AppField>

      <footer class="chan__foot">
        <AppButton size="sm" :loading="saving === 'signal'" :disabled="!canEdit" @click="save('signal')">
          Guardar
        </AppButton>

        <div class="chan__test">
          <input v-model="testTarget.signal" type="text" placeholder="+593… de prueba (o el tuyo)" />
          <AppButton
            variant="ghost"
            size="sm"
            icon="fa-solid fa-paper-plane"
            :loading="testing === 'signal'"
            :disabled="!canEdit"
            @click="test('signal')"
          >
            Probar
          </AppButton>
        </div>
      </footer>
    </article>
  </section>
</template>

<style scoped lang="scss">
.chan {
  @include wrap(var(--s-4));
}

.chan__card {
  @include col(var(--s-4));
  flex: 1 1 380px;
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
}

.chan__head {
  @include row(var(--s-3), center, space-between);

  h3 {
    @include row(var(--s-2), center);
    font-family: var(--font-display);
    font-size: 17px;
    color: var(--text-strong);
  }
}

.chan__state {
  padding: 4px 11px;
  border-radius: var(--r-pill);
  @include eyebrow;
  font-size: 9px;
  border: 1px solid var(--line);
  color: var(--text-dim);
}

.chan__state--ok {
  border-color: color-mix(in srgb, var(--moss) 45%, transparent);
  background: var(--moss-soft);
  color: var(--moss);
}

.chan__state--bad {
  border-color: color-mix(in srgb, var(--danger) 45%, transparent);
  background: var(--danger-soft);
  color: var(--danger);
}

.chan__detail {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
}

.chan__how {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);

  strong {
    color: var(--text);
  }
}

.chan__warn {
  @include row(var(--s-3), flex-start);
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--gold-soft);
  border: 1px solid color-mix(in srgb, var(--gold) 34%, transparent);

  > i {
    margin-top: 2px;
    color: var(--gold);
  }

  p {
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  strong {
    color: var(--text);
  }
}

code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--gold);
}

.chan__foot {
  @include col(var(--s-3));
  padding-top: var(--s-2);
  border-top: 1px dashed var(--line);
}

.chan__test {
  @include row(var(--s-2), center);

  input {
    flex: 1;
    min-width: 0;
  }
}
</style>
