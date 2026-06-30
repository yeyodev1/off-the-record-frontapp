<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const email = ref('admin@local.test')
const password = ref('admin1234')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true

  try {
    const response = await authService.signIn({
      email: email.value,
      password: password.value,
    })

    userStore.setSession({
      token: response.accessToken,
      id: response.user.id || response.user._id,
      name: response.user.name,
      email: response.user.email,
      roleId: response.user.roleId,
    })

    try {
      localStorage.setItem('refresh_token', response.refreshToken)
    } catch {}

    await router.push('/dashboard')
  } catch (err: any) {
    error.value = err?.message || 'No se pudo iniciar sesion'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="login__hero">
      <div class="login__badge">Off The Record</div>
      <h1>Backend y web editorial listos para crecer.</h1>
      <p>
        Interfaz limpia, sobria y con acento periodistico para administrar usuarios, articulos,
        exclusivos y reportes.
      </p>
    </section>

    <section class="login__card">
      <span class="login__eyebrow">Acceso interno</span>
      <h2>Ingresar</h2>

      <form class="login__form" @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="email" />
        </label>

        <label>
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>

        <button class="primary-button" type="submit" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Entrar' }}
        </button>

        <p v-if="error" class="error">{{ error }}</p>
        <p class="hint">Demo bootstrap: <strong>admin@local.test</strong> / <strong>admin1234</strong></p>
      </form>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
  gap: 1.5rem;
  padding: 1.5rem;
}

.login__hero,
.login__card {
  border-radius: 32px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.login__hero {
  position: relative;
  overflow: hidden;
  padding: clamp(2rem, 5vw, 4rem);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 100%;
  background:
    linear-gradient(145deg, rgba(1, 13, 39, 0.98), rgba(8, 8, 8, 0.96)),
    radial-gradient(circle at top right, rgba(32, 148, 210, 0.28), transparent 36%),
    radial-gradient(circle at bottom left, rgba(201, 168, 76, 0.22), transparent 30%);
  color: $text-light;

  h1 {
    max-width: 14ch;
    font-size: clamp(2.5rem, 5vw, 4.8rem);
    line-height: 0.95;
    letter-spacing: -0.06em;
    margin-top: 1rem;
  }

  p {
    max-width: 56ch;
    margin-top: 1rem;
    color: rgba(254, 254, 254, 0.76);
    font-size: 1.05rem;
  }
}

.login__badge,
.login__eyebrow {
  width: fit-content;
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(254, 254, 254, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(254, 254, 254, 0.84);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.login__card {
  padding: clamp(1.5rem, 4vw, 3rem);
  align-self: center;

  h2 {
    margin-top: 0.85rem;
    font-size: clamp(2rem, 3vw, 2.5rem);
    letter-spacing: -0.05em;
  }
}

.login__form {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;

  label {
    display: grid;
    gap: 0.45rem;

    span {
      font-size: 0.88rem;
      font-weight: 600;
      color: rgba(1, 13, 39, 0.74);
    }
  }

  input {
    width: 100%;
    border-radius: 16px;
    border: 1px solid rgba(1, 13, 39, 0.12);
    background: rgba(1, 13, 39, 0.02);
    padding: 0.95rem 1rem;
    outline: none;
  }
}

.primary-button {
  margin-top: 0.35rem;
  border: 0;
  border-radius: 16px;
  padding: 1rem 1.2rem;
  background: linear-gradient(135deg, $accent-red, $accent-red-dark);
  color: $text-light;
  font-weight: 700;
  cursor: pointer;
}

.error {
  color: $accent-red;
  font-weight: 600;
}

.hint {
  color: rgba(1, 13, 39, 0.64);
  font-size: 0.92rem;
}

@media (max-width: 980px) {
  .login {
    grid-template-columns: 1fr;
  }
}
</style>
