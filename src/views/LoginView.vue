<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService, legacyAuthService } from '@/services/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true

  try {
    const payload = { email: email.value, password: password.value }
    const [currentAttempt, legacyAttempt] = await Promise.allSettled([authService.signIn(payload), legacyAuthService.signIn(payload)])
    const currentResponse = currentAttempt.status === 'fulfilled' ? currentAttempt.value : null
    const legacyResponse = legacyAttempt.status === 'fulfilled' ? legacyAttempt.value : null

    if (!currentResponse && !legacyResponse) {
      throw currentAttempt.status === 'rejected' ? currentAttempt.reason : legacyAttempt.status === 'rejected' ? legacyAttempt.reason : new Error('No se pudo iniciar sesión')
    }

    const roleId = Number(currentResponse?.user?.roleId || legacyResponse?.user?.roleId)
    userStore.setSession({
      token: currentResponse?.accessToken || null,
      legacyToken: legacyResponse?.accessToken || null,
      id: currentResponse?.user?.id || currentResponse?.user?._id || legacyResponse?.user?.id || legacyResponse?.user?._id,
      name: currentResponse?.user?.name || legacyResponse?.user?.name || email.value,
      email: currentResponse?.user?.email || legacyResponse?.user?.email || email.value,
      roleId,
    })

    if (currentResponse?.refreshToken) localStorage.setItem('refresh_token', currentResponse.refreshToken)
    await router.push([1, 3].includes(roleId) ? '/admin/dashboard' : '/reader')
  } catch (err: unknown) {
    error.value = typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : 'No se pudo iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <RouterLink to="/" class="login-page__brand">OFF THE RECORD</RouterLink>

    <section class="login-card" aria-labelledby="login-title">
      <div class="login-card__mark"><i class="fa-solid fa-microphone-lines" aria-hidden="true"></i></div>
      <p class="login-card__eyebrow">Acceso editorial</p>
      <h1 id="login-title">Bienvenido de vuelta</h1>
      <p class="login-card__intro">Ingresa con las credenciales creadas por el administrador.</p>

      <form @submit.prevent="submit">
        <label>
          <span>Correo electrónico</span>
          <input v-model="email" type="email" autocomplete="email" required placeholder="nombre@correo.com" />
        </label>
        <label>
          <span>Contraseña</span>
          <div class="password-field">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required placeholder="Tu contraseña" />
            <button type="button" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword">
              <i class="fa-solid" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
            </button>
          </div>
        </label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="submit" type="submit" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Iniciar sesión' }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>
      </form>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.login-page { min-height: 100svh; display: grid; place-items: center; padding: 1.5rem; color: #f7f2e9; background: radial-gradient(circle at 20% 0%, rgba(180, 56, 43, .24), transparent 30%), #0b1328; }
.login-page__brand { position: fixed; top: 1.5rem; left: 1.5rem; color: inherit; font-family: var(--font-display); font-weight: 800; font-size: .9rem; letter-spacing: .12em; }
.login-card { width: min(100%, 430px); padding: clamp(2rem, 7vw, 3.5rem); border: 1px solid rgba(247, 242, 233, .14); border-radius: 24px; background: rgba(12, 23, 54, .76); box-shadow: 0 24px 80px rgba(0, 0, 0, .28); backdrop-filter: blur(18px); }
.login-card__mark { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 1.8rem; border-radius: 50%; background: #c8392b; }
.login-card__eyebrow { color: #efb5a8; font-size: .72rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1 { margin: .55rem 0 .7rem; font-family: var(--font-display); font-size: clamp(2.1rem, 7vw, 3.1rem); line-height: .95; letter-spacing: -.06em; }
.login-card__intro { color: rgba(247, 242, 233, .7); line-height: 1.6; }
form { display: grid; gap: 1.1rem; margin-top: 2rem; }
label { display: grid; gap: .45rem; color: rgba(247, 242, 233, .82); font-size: .82rem; font-weight: 700; letter-spacing: .04em; }
input { width: 100%; border: 1px solid rgba(247, 242, 233, .18); border-radius: 10px; padding: .9rem 1rem; background: rgba(255, 255, 255, .07); color: #fff; outline: none; }
input::placeholder { color: rgba(247, 242, 233, .45); }
input:focus { border-color: #efb5a8; box-shadow: 0 0 0 3px rgba(200, 57, 43, .22); }
.password-field { position: relative; }.password-field input { padding-right: 3rem; }.password-field button { position: absolute; inset: 0 0 0 auto; width: 3rem; border: 0; background: transparent; color: #efb5a8; cursor: pointer; }
.submit { width: 100%; border: 0; border-radius: 10px; padding: 1rem; background: #c8392b; color: #fff; font: inherit; font-weight: 800; cursor: pointer; }.submit:disabled { opacity: .65; cursor: wait; }
.error { padding: .75rem; border-radius: 8px; background: rgba(239, 68, 68, .18); color: #fecaca; font-size: .9rem; }
</style>
