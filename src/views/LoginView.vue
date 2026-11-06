<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { apiErrorMessage } from '@/services/http'
import { authApi } from '@/services/api'
import AppButton from '@/components/ui/AppButton.vue'
import AppField from '@/components/ui/AppField.vue'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const toasts = useToastStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const formError = ref('')

async function submit() {
  formError.value = ''

  if (!email.value.trim() || !password.value) {
    formError.value = 'Ingresa tu correo y contraseña.'
    return
  }

  loading.value = true
  try {
    const user = await session.signIn(email.value.trim(), password.value)
    toasts.success(`Bienvenido, ${user.name}`, 'Sesión iniciada correctamente.')
    const next = typeof route.query.next === 'string' ? route.query.next : session.homeRoute
    router.push(next)
  } catch (error) {
    formError.value = apiErrorMessage(error, 'No pudimos iniciar tu sesión.')
  } finally {
    loading.value = false
  }
}

const recovering = ref(false)

/** El backend avisa a un administrador; la respuesta es igual exista o no el correo. */
async function recover() {
  formError.value = ''
  if (!email.value.trim()) {
    formError.value = 'Escribe tu correo arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».'
    return
  }

  recovering.value = true
  try {
    await authApi.recover(email.value.trim())
    toasts.success('Solicitud enviada', 'Nuestro equipo restablecerá tu acceso y se pondrá en contacto contigo.')
  } catch (error) {
    formError.value = apiErrorMessage(error, 'No pudimos enviar la solicitud. Inténtalo de nuevo.')
  } finally {
    recovering.value = false
  }
}
</script>

<template>
  <div class="login">
    <!-- Panel editorial -->
    <section class="login__hero">
      <div class="login__hero-inner">
        <RouterLink class="login__brand" to="/">
          <img src="/otr-logo.png" alt="Off The Record" width="220" height="83" />
        </RouterLink>

        <h1>
          Periodismo de investigación<br />
          <em>que no se publica en ningún otro lado.</em>
        </h1>

        <p class="login__hero-text">
          Reportajes y actualizaciones exclusivos para nuestros suscriptores, con el contexto que no vas a encontrar
          en los medios.
        </p>

        <ul class="login__features">
          <li><i class="fa-solid fa-newspaper" /> Reportajes de investigación con contexto completo</li>
          <li><i class="fa-solid fa-bolt" /> Actualizaciones en cuanto ocurren</li>
          <li><i class="fa-regular fa-bell" /> Te avisamos cuando hay algo nuevo</li>
          <li><i class="fa-solid fa-mobile-screen" /> Léelo desde el celular o la computadora</li>
        </ul>
      </div>

      <span class="login__grain" aria-hidden="true" />
    </section>

    <!-- Formulario -->
    <section class="login__form-wrap">
      <form class="login__form" @submit.prevent="submit">
        <header class="login__form-head">
          <p class="login__eyebrow">Solo suscriptores</p>
          <h2>Entra a tu cuenta</h2>
          <p class="login__sub">Usa el correo con el que te suscribiste.</p>
        </header>

        <AppField label="Correo" icon="fa-regular fa-envelope" required>
          <input v-model="email" type="email" autocomplete="username" placeholder="tucorreo@ejemplo.com" />
        </AppField>

        <AppField label="Contraseña" icon="fa-solid fa-lock" required :error="formError">
          <div class="login__password">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button type="button" :aria-label="showPassword ? 'Ocultar' : 'Mostrar'" @click="showPassword = !showPassword">
              <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'" />
            </button>
          </div>
        </AppField>

        <AppButton type="submit" size="lg" block :loading="loading" trailing-icon="fa-solid fa-arrow-right">
          Entrar
        </AppButton>

        <button type="button" class="login__forgot" :disabled="recovering" @click="recover">
          {{ recovering ? 'Enviando…' : '¿Olvidaste tu contraseña?' }}
        </button>

        <p class="login__note">
          <i class="fa-solid fa-lock" />
          Contenido confidencial: tu cuenta es personal, no la compartas.
        </p>
      </form>
    </section>
  </div>
</template>

<style scoped lang="scss">
.login {
  @include row(0, stretch);
  min-height: 100vh;

  @include tablet {
    flex-direction: column;
  }
}

.login__hero {
  position: relative;
  @include col(0, stretch);
  justify-content: center;
  flex: 1 1 52%;
  padding: var(--s-9) var(--s-8);
  background:
    radial-gradient(800px 400px at 20% 10%, rgba(200, 57, 43, 0.22), transparent 60%),
    radial-gradient(700px 500px at 90% 90%, rgba(123, 108, 246, 0.18), transparent 60%),
    var(--ink-850);
  border-inline-end: 1px solid var(--line);
  overflow: hidden;

  @include tablet {
    flex: 0 0 auto;
    padding: var(--s-7) var(--s-5);
    border-inline-end: none;
    border-bottom: 1px solid var(--line);
  }
}

.login__hero-inner {
  @include col(var(--s-5));
  position: relative;
  z-index: 2;
  max-width: 520px;

  h1 {
    font-size: clamp(30px, 4.4vw, 46px);
    line-height: 1.08;

    em {
      font-style: italic;
      color: var(--brand-strong);
    }
  }
}

.login__brand {
  align-self: flex-start;

  img {
    display: block;
    width: clamp(160px, 22vw, 220px);
    height: auto;
  }
}

.login__forgot {
  align-self: center;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover:not(:disabled) {
    color: var(--text);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.login__hero-text {
  font-size: 15px;
  color: var(--text-muted);
  max-width: 46ch;
}

.login__features {
  @include col(var(--s-2));
  list-style: none;

  // En el celular el formulario debe verse sin hacer scroll.
  @include mobile {
    display: none;
  }

  li {
    @include row(var(--s-3), center);
    font-size: 14px;
    color: var(--text-muted);

    i {
      width: 20px;
      color: var(--gold);
      font-size: 12px;
    }
  }
}

.login__grain {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.4) 0,
    rgba(255, 255, 255, 0.4) 1px,
    transparent 1px,
    transparent 6px
  );
  pointer-events: none;
}

.login__form-wrap {
  @include row(0, center, center);
  flex: 1 1 48%;
  padding: var(--s-8) var(--s-6);

  @include mobile {
    padding: var(--s-6) var(--s-4);
  }
}

.login__form {
  @include col(var(--s-4));
  width: 100%;
  max-width: 400px;
  animation: login-in 500ms var(--ease);
}

@keyframes login-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

.login__form-head {
  @include col(var(--s-1));
  margin-bottom: var(--s-2);

  h2 {
    font-size: 26px;
  }
}

.login__eyebrow {
  @include eyebrow;
}

.login__sub {
  font-size: 13px;
  color: var(--text-muted);
}

.login__password {
  position: relative;

  button {
    position: absolute;
    inset-inline-end: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-dim);
    padding: 4px;

    &:hover {
      color: var(--text);
    }
  }

  input {
    padding-inline-end: 40px;
  }
}

.login__note {
  @include row(var(--s-2), flex-start);
  font-size: 12px;
  color: var(--text-dim);

  i {
    margin-top: 3px;
  }
}
</style>
