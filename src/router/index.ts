import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ROLE_ADMIN, ROLE_EDITOR, ROLE_SUPERADMIN } from '@/stores/session'
import { cue } from '@/composables/useSound'

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/entrar' },
  {
    path: '/entrar',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Ingresar', public: true },
  },
  {
    path: '/s/:kind(r|a)/:token',
    name: 'shared',
    component: () => import('@/views/SharedView.vue'),
    meta: { title: 'Contenido compartido', public: true },
  },
  {
    path: '/lector',
    component: () => import('@/layouts/ReaderShell.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'reader',
        component: () => import('@/views/reader/ReaderHomeView.vue'),
        meta: { title: 'Lecturas' },
      },
      {
        path: 'reportajes',
        name: 'reader-articles',
        component: () => import('@/views/reader/ReaderListView.vue'),
        meta: { title: 'Reportajes', readerMode: 'kind', kind: 'article' },
      },
      {
        path: 'actualizaciones',
        name: 'reader-updates',
        component: () => import('@/views/reader/ReaderListView.vue'),
        meta: { title: 'Actualizaciones', readerMode: 'kind', kind: 'update' },
      },
      {
        path: 'seccion/:categoryId',
        name: 'reader-section',
        component: () => import('@/views/reader/ReaderListView.vue'),
        meta: { title: 'Sección', readerMode: 'category' },
      },
      {
        path: 'etiqueta/:slug',
        name: 'reader-tag',
        component: () => import('@/views/reader/ReaderListView.vue'),
        meta: { title: 'Etiqueta', readerMode: 'tag' },
      },
      {
        path: 'ajustes',
        name: 'reader-settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: 'Configuración' },
      },
      {
        path: 'buscar',
        name: 'reader-search',
        component: () => import('@/views/reader/ReaderListView.vue'),
        meta: { title: 'Búsqueda', readerMode: 'search' },
      },
      // Va después de las listas para que "/lector/reportajes" no se lea como id.
      {
        path: ':kind(reportajes|actualizaciones)/:id',
        name: 'reader-detail',
        component: () => import('@/views/reader/ReaderDetailView.vue'),
        meta: { title: 'Lectura' },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminShell.vue'),
    meta: { requiresAuth: true, editorial: true },
    children: [
      { path: '', redirect: '/admin/panel' },
      {
        path: 'panel',
        name: 'dashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { title: 'Panel' },
      },
      {
        path: 'reportajes',
        name: 'articles',
        component: () => import('@/views/admin/ContentListView.vue'),
        props: { kind: 'article' },
        meta: { title: 'Reportajes' },
      },
      {
        path: 'reportajes/nuevo',
        name: 'article-new',
        component: () => import('@/views/admin/ContentEditorView.vue'),
        props: { kind: 'article' },
        meta: { title: 'Nuevo reportaje' },
      },
      {
        path: 'reportajes/:id',
        name: 'article-edit',
        component: () => import('@/views/admin/ContentEditorView.vue'),
        props: (route) => ({ kind: 'article', id: route.params.id }),
        meta: { title: 'Editar reportaje' },
      },
      {
        path: 'actualizaciones',
        name: 'updates',
        component: () => import('@/views/admin/ContentListView.vue'),
        props: { kind: 'update' },
        meta: { title: 'Actualizaciones' },
      },
      {
        path: 'actualizaciones/nueva',
        name: 'update-new',
        component: () => import('@/views/admin/ContentEditorView.vue'),
        props: { kind: 'update' },
        meta: { title: 'Nueva actualización' },
      },
      {
        path: 'actualizaciones/:id',
        name: 'update-edit',
        component: () => import('@/views/admin/ContentEditorView.vue'),
        props: (route) => ({ kind: 'update', id: route.params.id }),
        meta: { title: 'Editar actualización' },
      },
      {
        path: 'resumen',
        name: 'brief',
        component: () => import('@/views/admin/BriefView.vue'),
        meta: { title: 'Resumen del día' },
      },
      {
        path: 'reportes',
        name: 'reports',
        component: () => import('@/views/admin/ReportsView.vue'),
        meta: { title: 'Reportes' },
      },
      {
        path: 'analitica',
        name: 'analytics',
        component: () => import('@/views/admin/AnalyticsView.vue'),
        meta: { title: 'Analítica' },
      },
      {
        path: 'notificaciones',
        name: 'notifications',
        component: () => import('@/views/admin/NotificationsView.vue'),
        meta: { title: 'Notificaciones' },
      },
      {
        path: 'usuarios',
        name: 'users',
        component: () => import('@/views/admin/UsersView.vue'),
        meta: { title: 'Usuarios', adminOnly: true },
      },
      {
        path: 'acuses',
        name: 'receipts',
        component: () => import('@/views/admin/ReceiptsView.vue'),
        meta: { title: 'Acuses de lectura', superOnly: true },
      },
      {
        path: 'categorias',
        name: 'categories',
        component: () => import('@/views/admin/CategoriesView.vue'),
        meta: { title: 'Categorías' },
      },
      {
        path: 'indicadores',
        name: 'indicators',
        component: () => import('@/views/admin/IndicatorsView.vue'),
        meta: { title: 'Indicadores económicos' },
      },
      {
        path: 'ajustes',
        name: 'admin-settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: 'Configuración' },
      },
      {
        path: 'accesos',
        name: 'access',
        component: () => import('@/views/admin/AccessLogView.vue'),
        meta: { title: 'Registro de accesos', adminOnly: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'No encontrado', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to) => {
  const token = localStorage.getItem('access_token')
  const roleId = Number(localStorage.getItem('role_id')) || 0
  const isSuperadmin = roleId === ROLE_SUPERADMIN
  const isAdmin = roleId === ROLE_ADMIN || isSuperadmin
  const isEditorial = isAdmin || roleId === ROLE_EDITOR

  if (to.matched.some((record) => record.meta?.requiresAuth) && !token) {
    return { path: '/entrar', query: to.fullPath !== '/' ? { next: to.fullPath } : undefined, replace: true }
  }

  if (to.matched.some((record) => record.meta?.editorial) && !isEditorial) {
    return { path: '/lector', replace: true }
  }

  if (to.meta?.adminOnly && !isAdmin) {
    return { path: '/admin/panel', replace: true }
  }

  if (to.meta?.superOnly && !isSuperadmin) {
    return { path: '/admin/panel', replace: true }
  }

  if (to.path === '/entrar' && token) {
    return { path: isEditorial ? '/admin/panel' : '/lector', replace: true }
  }

  return true
})

router.afterEach((to, from) => {
  const title = (to.meta?.title as string) || ''
  document.title = title ? `${title} · Off The Record` : 'Off The Record'

  // Sólo entre vistas reales: el arranque no suena porque el navegador lo
  // bloquea hasta la primera interacción, y sonaría fuera de lugar.
  if (from.name && to.path !== from.path) cue('arrival')
})

export default router
