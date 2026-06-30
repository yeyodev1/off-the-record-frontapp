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
    <div class="login__ambient"></div>

    <section class="login__hero glass-card">
      <div class="login__hero-content">
        <span class="eyebrow fade-up stagger-1"><i class="fa-solid fa-sparkles" aria-hidden="true"></i> Off The Record</span>
        <h1 class="section-title fade-up stagger-2">Una portada operativa para la redacción.</h1>
        <p class="section-copy fade-up stagger-3">
          Interfaz sobria, cinematográfica y con acento periodístico para administrar usuarios, artículos, exclusivos y reportes.
        </p>

        <div class="hero-kpis fade-up stagger-4">
          <article v-for="item in heroKpis" :key="item.label" class="hero-kpis__item glass-card">
            <i class="fa-solid fa-bolt" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
      </div>
    </section>

    <section class="login__card surface-card fade-up stagger-5">
      <div class="login__card-head">
        <span class="section-label">Acceso interno</span>
        <h2 class="section-title"><i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Ingresar</h2>
        <p class="section-copy">Entrá al panel editorial y retomá el flujo de trabajo.</p>
      </div>

      <form class="login__form" @submit.prevent="submit">
        <label>
          <span><i class="fa-solid fa-envelope" aria-hidden="true"></i> Email</span>
          <input v-model="email" type="email" autocomplete="email" placeholder="nombre@correo.com" />
        </label>

        <label>
          <span><i class="fa-solid fa-key" aria-hidden="true"></i> Password</span>
          <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" />
        </label>

        <button class="primary-button hover-magnetic" type="submit" :disabled="loading">
          <span>{{ loading ? 'Ingresando...' : 'Entrar' }}</span>
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p class="hint">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          Cuenta de prueba: <strong>dreyes@bakano.ec</strong> / <strong>12345</strong>
        </p>
      </form>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/colorVariables.module.scss' as *;

@keyframes fadeUp {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up {
  opacity: 0;
  animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.stagger-1 { animation-delay: 0.08s; }
.stagger-2 { animation-delay: 0.18s; }
.stagger-3 { animation-delay: 0.28s; }
.stagger-4 { animation-delay: 0.38s; }
.stagger-5 { animation-delay: 0.48s; }

.login {
  min-height: 100svh;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.login__ambient {
  position: absolute;
  inset: -15% -10% auto;
  height: 130%;
  pointer-events: none;
  background:
    radial-gradient(circle at 80% 20%, rgba(200, 57, 43, 0.26), transparent 28%),
    radial-gradient(circle at 20% 75%, rgba(32, 148, 210, 0.18), transparent 30%),
    radial-gradient(circle at 55% 50%, rgba(201, 168, 76, 0.12), transparent 24%);
  filter: blur(60px);
  opacity: 0.9;
}

.login__hero,
.login__card {
  position: relative;
  z-index: 1;
}

.login__hero {
  padding: 1.5rem;
  color: $text-light;
  background:
    linear-gradient(135deg, rgba(6, 12, 28, 0.98), rgba(12, 23, 54, 0.94)),
    radial-gradient(circle at top right, rgba(200, 57, 43, 0.16), transparent 30%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 44vh;
  display: flex;
  align-items: flex-end;
}

.login__hero-content {
  display: grid;
  gap: 1rem;
}

.login__hero .section-title {
  font-size: clamp(2.6rem, 8vw, 5rem);
  max-width: 11ch;
}

.login__hero .section-copy {
  max-width: 55ch;
  font-size: 1.05rem;
  color: rgba(246, 241, 232, 0.74);
}

.hero-kpis {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
  margin-top: 0.75rem;
}

.hero-kpis__item {
  padding: 1rem;
  display: grid;
  gap: 0.3rem;
  color: $text-light;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);

  i {
    color: $accent-red;
    margin-bottom: 0.35rem;
  }

  span {
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    color: rgba(246, 241, 232, 0.68);
  }

  strong {
    font-family: var(--font-display);
    font-size: 1.35rem;
    letter-spacing: -0.04em;
  }
}

.login__card {
  padding: 1.4rem;
}

.login__card-head {
  display: grid;
  gap: 0.45rem;

  h2 {
    font-size: clamp(2rem, 4vw, 2.8rem);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: $primary-dark;

    i {
      color: $accent-red;
    }
  }

  .section-copy {
    color: rgba(1, 13, 39, 0.72);
  }
}

.login__form {
  display: grid;
  gap: 1rem;
  margin-top: 1.4rem;

  label {
    display: grid;
    gap: 0.6rem;

    span {
      font-size: 0.84rem;
      font-weight: 700;
      color: rgba(1, 13, 39, 0.72);
      text-transform: uppercase;
      letter-spacing: 0.08em;

      i {
        margin-right: 0.35rem;
        color: $accent-red;
      }
    }
  }

  input {
    width: 100%;
    border-radius: 18px;
    border: 1px solid rgba(1, 13, 39, 0.12);
    background: rgba(1, 13, 39, 0.02);
    padding: 1rem 1.1rem;
    outline: none;
    color: $primary-dark;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &::placeholder {
      color: rgba(1, 13, 39, 0.34);
    }

    &:focus {
      border-color: rgba(200, 57, 43, 0.45);
      box-shadow: 0 0 0 4px rgba(200, 57, 43, 0.1);
      background: #fff;
    }
  }
}

.error {
  color: $alert-error;
  font-weight: 600;
  font-size: 0.92rem;
  padding: 0.75rem;
  background: rgba($alert-error, 0.1);
  border-radius: 14px;
  text-align: center;
}

.hint {
  color: rgba(1, 13, 39, 0.56);
  font-size: 0.86rem;
  text-align: center;

  i {
    color: $accent-red;
    margin-right: 0.35rem;
  }
}

@media (min-width: 980px) {
  .login {
    grid-template-columns: minmax(0, 1.35fr) minmax(420px, 1fr);
    padding: 1.5rem;
    align-items: stretch;
  }

  .login__hero {
    min-height: calc(100svh - 3rem);
    border-radius: 40px;
    padding: clamp(3rem, 6vw, 5rem);
    align-items: center;
  }

  .login__card {
    align-self: center;
    border-radius: 40px;
    padding: clamp(2rem, 4vw, 3.25rem);
  }

  .hero-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
