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
    redirect: '/login',
  },
  {
    path: '/reader',
    name: 'Reader',
    component: () => import('../views/ReaderView.vue'),
    meta: { title: 'Lecturas', requiresAuth: true },
  },
  {
    path: '/admin',
    component: () => import('../layouts/AppShell.vue'),
    meta: { requiresAuth: true, requiresEditorialAccess: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'Dashboard', requiresAuth: true },
      },
      {
        path: 'articles/new',
        name: 'ArticleCreate',
        component: () => import('../views/ArticleEditorView.vue'),
        meta: { title: 'Nueva publicación', requiresAuth: true },
      },
      {
        path: 'articles/:id/edit',
        name: 'ArticleEdit',
        component: () => import('../views/ArticleEditorView.vue'),
        meta: { title: 'Editar publicación', requiresAuth: true },
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

  const roleId = Number(localStorage.getItem('role_id'))
  if (to.matched.some((record) => record.meta?.requiresEditorialAccess) && ![1, 3].includes(roleId)) {
    return next({ path: '/reader', replace: true })
  }

  if (to.path === '/login' && hasToken) {
    return next({ path: roleId === 1 || roleId === 3 ? '/admin/dashboard' : '/reader', replace: true })
  }

  next()
})

export default router
