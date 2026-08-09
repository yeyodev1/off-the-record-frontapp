export interface NavItem {
  label: string
  to: string
  icon: string
  adminOnly?: boolean
  superOnly?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Redacción',
    items: [
      { label: 'Panel', to: '/admin/panel', icon: 'fa-solid fa-gauge-high' },
      { label: 'Reportajes', to: '/admin/reportajes', icon: 'fa-solid fa-newspaper' },
      { label: 'Actualizaciones', to: '/admin/actualizaciones', icon: 'fa-solid fa-bolt' },
      { label: 'Resumen del día', to: '/admin/resumen', icon: 'fa-solid fa-sun' },
      { label: 'Reportes', to: '/admin/reportes', icon: 'fa-solid fa-file-invoice' },
    ],
  },
  {
    label: 'Audiencia',
    items: [
      { label: 'Analítica', to: '/admin/analitica', icon: 'fa-solid fa-chart-line' },
      { label: 'Notificaciones', to: '/admin/notificaciones', icon: 'fa-solid fa-bell' },
      { label: 'Usuarios', to: '/admin/usuarios', icon: 'fa-solid fa-users', adminOnly: true },
      { label: 'Acuses de lectura', to: '/admin/acuses', icon: 'fa-solid fa-eye', superOnly: true },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { label: 'Categorías', to: '/admin/categorias', icon: 'fa-solid fa-layer-group' },
      { label: 'Indicadores', to: '/admin/indicadores', icon: 'fa-solid fa-coins' },
      { label: 'Accesos', to: '/admin/accesos', icon: 'fa-solid fa-shield-halved', adminOnly: true },
    ],
  },
]

export const STATUS_META: Record<string, { label: string; tone: string; icon: string }> = {
  draft: { label: 'Borrador', tone: 'neutral', icon: 'fa-regular fa-pen-to-square' },
  review: { label: 'En revisión', tone: 'gold', icon: 'fa-solid fa-magnifying-glass' },
  scheduled: { label: 'Programado', tone: 'iris', icon: 'fa-regular fa-clock' },
  published: { label: 'Publicado', tone: 'moss', icon: 'fa-solid fa-circle-check' },
  archived: { label: 'Archivado', tone: 'neutral', icon: 'fa-solid fa-box-archive' },
}

export const ROLE_LABELS: Record<number, string> = {
  1: 'Administrador',
  2: 'Lector',
  3: 'Editor',
  4: 'Superadministrador',
}

/** Acentos de secciones y etiquetas, derivados de la marca de anderssonboscan.ec. */
export const ACCENT_PALETTE = [
  '#C8392B', // rojo de marca
  '#C9A84C', // dorado
  '#2094D2', // azul acento
  '#8A1F14', // rojo profundo
  '#57A773', // verde
  '#7B6CF6', // violeta
  '#F5F2ED', // crema
  '#E0594A', // rojo claro
]
