import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/styles/global.scss'
import { useSessionStore } from './stores/session'
import { useToastStore } from './stores/toast'
import { startSound } from './composables/useSound'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const session = useSessionStore(pinia)
session.hydrate()

window.addEventListener('auth:token-expired', () => {
  const toasts = useToastStore(pinia)
  session.clear()
  toasts.warning('Tu sesión expiró', 'Vuelve a ingresar para continuar.')
  router.push('/entrar')
})

app.mount('#app')

// Después de montar: delega los `data-cuelume-*` de toda la interfaz.
startSound()
