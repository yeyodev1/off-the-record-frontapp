<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const email = ref('dreyes@bakano.ec')
const password = ref('12345')
const loading = ref(false)
const error = ref('')

const heroKpis = computed(() => [
  { label: 'Acceso', value: 'VIP' },
  { label: 'Ritmo', value: 'Editorial' },
  { label: 'Estilo', value: 'Premium' },
])

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
      <div class="login__badge"><i class="fa-solid fa-sparkles" aria-hidden="true"></i> Off The Record</div>
      <h1>Una web editorial premium para mover la redaccion.</h1>
      <p>
        Interfaz limpia, sobria y con acento periodistico para administrar usuarios, articulos,
        exclusivos y reportes.
      </p>

      <div class="hero-kpis">
        <article v-for="item in heroKpis" :key="item.label" class="hero-kpis__item">
          <i class="fa-solid fa-bolt" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <section class="login__card">
      <span class="login__eyebrow">Acceso interno</span>
      <h2><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Ingresar</h2>

      <form class="login__form" @submit.prevent="submit">
        <label>
          <span><i class="fa-solid fa-envelope" aria-hidden="true"></i> Email</span>
          <input v-model="email" type="email" autocomplete="email" />
        </label>

        <label>
          <span><i class="fa-solid fa-key" aria-hidden="true"></i> Password</span>
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>

        <button class="primary-button" type="submit" :disabled="loading">
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          {{ loading ? 'Ingresando...' : 'Entrar' }}
        </button>

        <p v-if="error" class="error">{{ error }}</p>
        <p class="hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Cuenta de prueba: <strong>dreyes@bakano.ec</strong> / <strong>12345</strong></p>
      </form>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

.login {
  min-height: 100svh;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 1rem;
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
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 44vh;
  background:
    linear-gradient(145deg, rgba(1, 13, 39, 0.98), rgba(1, 13, 39, 0.92)),
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.26), transparent 36%),
    radial-gradient(circle at bottom left, rgba(200, 57, 43, 0.22), transparent 30%);
  color: $text-light;

  h1 {
    max-width: 12ch;
    font-size: clamp(2.2rem, 10vw, 4.8rem);
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

  i {
    margin-right: 0.4rem;
  }
}

.login__card {
  padding: 1.25rem;
  align-self: center;

  h2 {
    margin-top: 0.85rem;
    font-size: clamp(2rem, 3vw, 2.5rem);
    letter-spacing: -0.05em;
    display: flex;
    align-items: center;
    gap: 0.55rem;

    i {
      color: $accent-red;
    }
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

      i {
        margin-right: 0.35rem;
        color: $accent-red;
      }
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
  background: linear-gradient(135deg, $primary-dark, $accent-red);
  color: $text-light;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
}

.error {
  color: $alert-error;
  font-weight: 600;
}

.hint {
  color: rgba(1, 13, 39, 0.64);
  font-size: 0.92rem;

  i {
    color: $accent-red;
    margin-right: 0.35rem;
  }
}

.hero-kpis {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  margin-top: 1.5rem;
}

.hero-kpis__item {
  padding: 0.85rem 0.95rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  gap: 0.15rem;

  i {
    color: $accent-red;
    margin-bottom: 0.25rem;
  }

  span {
    display: block;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(254, 254, 254, 0.68);
  }

  strong {
    display: block;
    margin-top: 0.35rem;
    font-size: 1.05rem;
    color: $text-light;
  }
}

@media (min-width: 640px) {
  .hero-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 980px) {
  .login {
    grid-template-columns: 1fr;
  }

  .login {
    grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
    padding: 1.5rem;
  }

  .login__hero {
    padding: clamp(2rem, 5vw, 4rem);
    min-height: 100%;
  }

  .login__card {
    padding: clamp(1.5rem, 4vw, 3rem);
  }

  .hero-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
