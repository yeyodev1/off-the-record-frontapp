import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { moduleConfigs } from '@/config/modules'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Ingresar' },
  },
  {
    path: '/',
    component: () => import('../layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'Dashboard', requiresAuth: true },
      },
      ...moduleConfigs.map((module) => ({
        path: module.path,
        name: module.key,
        component: () => import('../views/ModuleView.vue'),
        meta: {
          title: module.title,
          moduleKey: module.key,
          requiresAuth: true,
        },
      })),
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'No encontrado' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to, _from, next) => {
  const hasToken = !!localStorage.getItem('access_token')
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth)

  if (requiresAuth && !hasToken) {
    return next({ path: '/login', replace: true })
  }

  if (to.path === '/login' && hasToken) {
    return next({ path: '/dashboard', replace: true })
  }

  next()
})

export default router
