<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/services/api'
import { apiErrorMessage } from '@/services/http'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { useSound } from '@/composables/useSound'
import { ROLE_LABELS } from '@/config/navigation'
import { formatDate } from '@/composables/useFormat'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const session = useSessionStore()
const toasts = useToastStore()
const router = useRouter()
const { preference: sonido, setVolume, cue } = useSound()

/* ------------------------------------------------------------------ */
/* Perfil                                                              */
/* ------------------------------------------------------------------ */

function desdeSesion() {
  return {
    name: session.user?.name || '',
    lastname: session.user?.lastname || '',
    email: session.user?.email || '',
    phone: session.user?.phone || '',
    position: session.user?.position || '',
    signalHandle: session.user?.signalHandle || '',
    telegramChatId: session.user?.telegramChatId || '',
  }
}

const original = ref(desdeSesion())
const perfil = reactive(desdeSesion())

const guardandoPerfil = ref(false)
const errorPerfil = ref('')
const confirmarCorreo = ref(false)

/** Qué campos cambiaron: mueve el botón de guardar y avisa de lo importante. */
const cambios = computed(() =>
  (Object.keys(perfil) as (keyof typeof perfil)[]).filter(
    (campo) => perfil[campo].trim() !== String(original.value[campo] || '').trim(),
  ),
)

const sucio = computed(() => cambios.value.length > 0)
const cambiaCorreo = computed(() => cambios.value.includes('email'))

const rol = computed(() => ROLE_LABELS[session.user?.roleId ?? 2] || 'Usuario')
const inicial = computed(() => (session.displayName || '·').charAt(0))

function descartar() {
  Object.assign(perfil, original.value)
  errorPerfil.value = ''
}

function pedirGuardar() {
  errorPerfil.value = ''

  if (!perfil.name.trim()) {
    errorPerfil.value = 'El nombre no puede quedar vacío.'
    return
  }

  // Cambiar el correo cambia con qué se entra: nunca en silencio.
  if (cambiaCorreo.value) {
    confirmarCorreo.value = true
    return
  }

  void guardarPerfil()
}

async function guardarPerfil() {
  guardandoPerfil.value = true
  try {
    const { data, message } = await authApi.updateMe(perfil)
    session.persist(data)
    original.value = desdeSesion()
    confirmarCorreo.value = false
    toasts.success(message, cambiaCorreo.value ? 'A partir de ahora entras con el correo nuevo.' : '')
  } catch (error) {
    confirmarCorreo.value = false
    errorPerfil.value = apiErrorMessage(error, 'No pudimos guardar tu perfil.')
  } finally {
    guardandoPerfil.value = false
  }
}

/* ------------------------------------------------------------------ */
/* Contraseña                                                          */
/* ------------------------------------------------------------------ */

const clave = reactive({ actual: '', nueva: '', repetir: '' })
const verClave = ref(false)
const guardandoClave = ref(false)
const errorClave = ref('')
const confirmarClave = ref(false)

/** Fuerza aproximada, solo para orientar a quien la escribe. */
const fuerza = computed(() => {
  const valor = clave.nueva
  if (!valor) return { nivel: 0, label: '', tono: '' }

  let puntos = 0
  if (valor.length >= 8) puntos++
  if (valor.length >= 12) puntos++
  if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) puntos++
  if (/\d/.test(valor)) puntos++
  if (/[^a-zA-Z0-9]/.test(valor)) puntos++

  if (puntos <= 2) return { nivel: 1, label: 'Débil', tono: 'mala' }
  if (puntos === 3) return { nivel: 2, label: 'Aceptable', tono: 'media' }
  if (puntos === 4) return { nivel: 3, label: 'Buena', tono: 'buena' }
  return { nivel: 4, label: 'Excelente', tono: 'buena' }
})

const claveLista = computed(
  () => clave.actual.length > 0 && clave.nueva.length >= 8 && clave.nueva === clave.repetir,
)

function pedirCambioClave() {
  errorClave.value = ''

  if (clave.nueva.length < 8) {
    errorClave.value = 'La nueva contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (clave.nueva !== clave.repetir) {
    errorClave.value = 'Las dos contraseñas no coinciden.'
    return
  }
  if (clave.nueva === clave.actual) {
    errorClave.value = 'La nueva contraseña tiene que ser distinta de la actual.'
    return
  }

  confirmarClave.value = true
}

async function cambiarClave() {
  guardandoClave.value = true
  try {
    const { message } = await authApi.changePassword(clave.actual, clave.nueva)
    toasts.success('Contraseña actualizada', message)
    await session.signOut()
    router.push('/entrar')
  } catch (error) {
    confirmarClave.value = false
    errorClave.value = apiErrorMessage(error, 'No pudimos cambiar la contraseña.')
  } finally {
    guardandoClave.value = false
  }
}
</script>

<template>
  <div class="cfg">
    <PageHeader
      eyebrow="Tu cuenta"
      title="Configuración"
      detail="Tus datos, tu contraseña y cómo se comporta la plataforma contigo."
      icon="fa-solid fa-sliders"
    />

    <!-- ---------- Resumen de la cuenta ---------- -->
    <section class="cfg__hero">
      <span class="cfg__avatar">{{ inicial }}</span>

      <div class="cfg__hero-main">
        <h2>{{ session.displayName }}</h2>
        <p>{{ session.user?.email }}</p>
      </div>

      <div class="cfg__hero-meta">
        <AppBadge tone="neutral">{{ rol }}</AppBadge>
        <AppBadge v-if="session.user?.premium" tone="gold">Premium</AppBadge>
        <span v-if="session.user?.createdAt">Desde {{ formatDate(session.user.createdAt) }}</span>
      </div>
    </section>

    <div class="cfg__cols">
      <!-- ---------- Datos ---------- -->
      <section class="cfg__card">
        <header class="cfg__head">
          <h3><i class="fa-regular fa-id-card" aria-hidden="true" /> Tus datos</h3>
          <Transition name="pop">
            <span v-if="sucio" class="cfg__dirty">{{ cambios.length }} sin guardar</span>
          </Transition>
        </header>

        <form class="cfg__form" @submit.prevent="pedirGuardar">
          <div class="cfg__row">
            <AppField label="Nombre" required><input v-model="perfil.name" type="text" /></AppField>
            <AppField label="Apellido"><input v-model="perfil.lastname" type="text" /></AppField>
          </div>

          <AppField
            label="Correo"
            :hint="cambiaCorreo ? 'Con este correo entrarás a partir de ahora' : 'Es con lo que inicias sesión'"
          >
            <input v-model="perfil.email" type="email" autocomplete="email" />
          </AppField>

          <div class="cfg__row">
            <AppField label="Teléfono"><input v-model="perfil.phone" type="tel" placeholder="+593 99 000 0000" /></AppField>
            <AppField label="Cargo"><input v-model="perfil.position" type="text" /></AppField>
          </div>

          <div class="cfg__row">
            <AppField label="Signal" hint="Número al que te escribe el equipo">
              <input v-model="perfil.signalHandle" type="text" placeholder="+593 99 000 0000" />
            </AppField>
            <AppField label="Telegram" hint="Escribe /start al bot para obtenerlo">
              <input v-model="perfil.telegramChatId" type="text" placeholder="123456789" />
            </AppField>
          </div>

          <p v-if="errorPerfil" class="cfg__error">
            <i class="fa-solid fa-circle-exclamation" aria-hidden="true" /> {{ errorPerfil }}
          </p>

          <!-- Sólo aparece cuando hay algo que guardar. -->
          <Transition name="rise">
            <footer v-if="sucio" class="cfg__actions">
              <AppButton type="submit" icon="fa-solid fa-check" :loading="guardandoPerfil">Guardar</AppButton>
              <AppButton variant="ghost" type="button" :disabled="guardandoPerfil" @click="descartar">
                Descartar
              </AppButton>
            </footer>
          </Transition>
        </form>
      </section>

      <!-- ---------- Contraseña ---------- -->
      <section class="cfg__card">
        <header class="cfg__head">
          <h3><i class="fa-solid fa-key" aria-hidden="true" /> Contraseña</h3>
        </header>

        <form class="cfg__form" @submit.prevent="pedirCambioClave">
          <AppField label="Contraseña actual" required>
            <input v-model="clave.actual" :type="verClave ? 'text' : 'password'" autocomplete="current-password" />
          </AppField>

          <AppField label="Nueva contraseña" required hint="Mínimo 8 caracteres">
            <input v-model="clave.nueva" :type="verClave ? 'text' : 'password'" autocomplete="new-password" />
          </AppField>

          <Transition name="rise">
            <div v-if="clave.nueva" :class="['cfg__meter', `cfg__meter--${fuerza.tono}`]">
              <span v-for="paso in 4" :key="paso" :class="{ 'is-on': paso <= fuerza.nivel }" />
              <em>{{ fuerza.label }}</em>
            </div>
          </Transition>

          <AppField
            label="Repite la nueva"
            required
            :error="clave.repetir && clave.nueva !== clave.repetir ? 'No coinciden' : ''"
          >
            <input v-model="clave.repetir" :type="verClave ? 'text' : 'password'" autocomplete="new-password" />
          </AppField>

          <AppSwitch v-model="verClave" label="Ver lo que escribo" />

          <p v-if="errorClave" class="cfg__error">
            <i class="fa-solid fa-circle-exclamation" aria-hidden="true" /> {{ errorClave }}
          </p>

          <p class="cfg__note">
            <i class="fa-solid fa-circle-info" aria-hidden="true" />
            Al cambiarla se cierran todas tus sesiones y tendrás que volver a entrar.
          </p>

          <AppButton type="submit" icon="fa-solid fa-lock" :disabled="!claveLista" :loading="guardandoClave">
            Cambiar contraseña
          </AppButton>
        </form>
      </section>

      <!-- ---------- Sonido ---------- -->
      <section class="cfg__card">
        <header class="cfg__head">
          <h3><i class="fa-solid fa-volume-high" aria-hidden="true" /> Sonidos</h3>
          <AppBadge :tone="sonido.enabled ? 'moss' : 'neutral'">
            {{ sonido.enabled ? 'Activados' : 'Silenciado' }}
          </AppBadge>
        </header>

        <div class="cfg__form">
          <AppSwitch
            v-model="sonido.enabled"
            label="Sonidos de la interfaz"
            hint="Señales breves al pulsar, guardar o recibir un aviso"
          />

          <div :class="['cfg__vol', { 'cfg__vol--off': !sonido.enabled }]">
            <label>
              <span>Volumen</span>
              <input
                :value="sonido.volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                :disabled="!sonido.enabled"
                @input="setVolume(Number(($event.target as HTMLInputElement).value))"
              />
            </label>

            <output>{{ Math.round(sonido.volume * 100) }}%</output>

            <AppButton
              variant="ghost"
              size="sm"
              icon="fa-solid fa-play"
              :disabled="!sonido.enabled"
              @click="cue('success')"
            >
              Probar
            </AppButton>
          </div>

          <p class="cfg__note">
            <i class="fa-solid fa-circle-info" aria-hidden="true" />
            Se guarda en este navegador. El sistema solo suena tras tu primera interacción con la página.
          </p>
        </div>
      </section>
    </div>

    <ConfirmDialog
      v-model="confirmarCorreo"
      title="Vas a cambiar tu correo"
      :message="`Entrarás con ${perfil.email} la próxima vez. Asegúrate de que es tuyo y de que tienes acceso.`"
      confirm-label="Sí, cambiarlo"
      :loading="guardandoPerfil"
      @confirm="guardarPerfil"
    />

    <ConfirmDialog
      v-model="confirmarClave"
      title="Cambiar la contraseña"
      message="Se cerrarán todas tus sesiones, también esta. Tendrás que volver a entrar con la contraseña nueva."
      confirm-label="Cambiar y salir"
      tone="danger"
      :loading="guardandoClave"
      @confirm="cambiarClave"
    />
  </div>
</template>

<style scoped lang="scss">
.cfg {
  @include col(var(--s-5));
}

/* --- Resumen --- */

.cfg__hero {
  @include row(var(--s-4), center);
  flex-wrap: wrap;
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
}

.cfg__avatar {
  @include row(0, center, center);
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--brand-soft);
  border: 1px solid var(--brand-line);
  color: var(--brand-strong);
  font-family: var(--font-display);
  font-size: 24px;
  text-transform: uppercase;
}

.cfg__hero-main {
  @include col(2px);
  flex: 1 1 200px;
  min-width: 0;

  h2 {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--text-strong);
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
    @include truncate(1);
  }
}

.cfg__hero-meta {
  @include row(var(--s-2), center);
  flex-wrap: wrap;

  span {
    @include eyebrow;
    font-size: 9px;
  }
}

/* --- Tarjetas --- */

.cfg__cols {
  @include wrap(var(--s-4));
  align-items: flex-start;
}

.cfg__card {
  @include col(var(--s-4));
  flex: 1 1 380px;
  padding: var(--s-5);
  border-radius: var(--r-lg);
  background: var(--surface-raised);
  border: 1px solid var(--line);
}

.cfg__head {
  @include row(var(--s-3), center, space-between);
  padding-bottom: var(--s-2);
  border-bottom: 1px solid var(--line);

  h3 {
    @include row(var(--s-2), center);
    font-family: var(--font-display);
    font-size: 17px;
    color: var(--text-strong);

    i {
      font-size: 13px;
      color: var(--text-dim);
    }
  }
}

.cfg__dirty {
  padding: 3px 10px;
  border-radius: var(--r-pill);
  background: var(--gold-soft);
  border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
  color: var(--gold);
  @include eyebrow;
  font-size: 9px;
}

.cfg__form {
  @include col(var(--s-4));
}

.cfg__row {
  @include row(var(--s-3), flex-start);
  flex-wrap: wrap;

  > * {
    flex: 1 1 150px;
  }
}

.cfg__actions {
  @include row(var(--s-2), center);
  padding-top: var(--s-3);
  border-top: 1px dashed var(--line);
}

.cfg__error {
  @include row(var(--s-2), center);
  font-size: 12px;
  color: var(--danger);
}

.cfg__note {
  @include row(var(--s-2), flex-start);
  font-size: 12px;
  color: var(--text-dim);

  i {
    margin-top: 2px;
  }
}

/* --- Medidor de fuerza --- */

.cfg__meter {
  @include row(var(--s-2), center);

  span {
    flex: 1;
    height: 4px;
    border-radius: var(--r-pill);
    background: var(--line);
    transition: background var(--t-base) var(--ease);
  }

  em {
    flex: 0 0 auto;
    font-style: normal;
    @include eyebrow;
    font-size: 9px;
  }
}

.cfg__meter--mala span.is-on,
.cfg__meter--mala em {
  background: var(--danger);
  color: var(--danger);
}

.cfg__meter--media span.is-on,
.cfg__meter--media em {
  background: var(--gold);
  color: var(--gold);
}

.cfg__meter--buena span.is-on,
.cfg__meter--buena em {
  background: var(--moss);
  color: var(--moss);
}

.cfg__meter em {
  background: none;
}

/* --- Volumen --- */

.cfg__vol {
  @include row(var(--s-3), center);
  flex-wrap: wrap;
  transition: opacity var(--t-base) var(--ease);

  label {
    @include col(4px);
    flex: 1 1 160px;

    span {
      @include eyebrow;
      font-size: 9px;
    }
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--brand);
  }

  output {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }
}

.cfg__vol--off {
  opacity: 0.45;
}
</style>
