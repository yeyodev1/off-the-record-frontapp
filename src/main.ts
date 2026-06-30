import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/styles/global.scss'
import { useUserStore } from './stores/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const userStore = useUserStore(pinia)
userStore.hydrate()

window.addEventListener('auth:token-expired', () => {
  userStore.clear()
  router.push('/login')
})

app.mount('#app')
