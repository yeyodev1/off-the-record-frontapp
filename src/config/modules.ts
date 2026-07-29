export type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'checkbox' | 'date' | 'datetime-local' | 'tags'

export interface ModuleField {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
}

export interface ModuleColumn {
  key: string
  label: string
  type?: 'text' | 'boolean' | 'date' | 'tags'
}

export interface ModuleConfig {
  key: string
  path: string
  title: string
  description: string
  apiPath: string
  countPath: string
  createPath: string
  updatePath: (id: string) => string
  deletePath: (id: string) => string
  searchPath?: (query: string) => string
  icon: string
  accent: 'primary' | 'secondary' | 'error'
  presentation: {
    variant: 'operator' | 'editorial' | 'archive' | 'broadcast' | 'ledger'
    kicker: string
    headline: string
    description: string
    badges: string[]
  }
  fields: ModuleField[]
  columns: ModuleColumn[]
}

export const moduleConfigs: ModuleConfig[] = [
  {
    key: 'users',
    path: 'users',
    title: 'Usuarios',
    description: 'Crea usuarios, asigna roles y controla su acceso.',
    apiPath: '/users',
    countPath: '/users/count',
    createPath: '/users',
    updatePath: (id) => `/users/${id}`,
    deletePath: (id) => `/users/${id}`,
    icon: 'fa-user-group',
    accent: 'primary',
    presentation: {
      variant: 'operator',
      kicker: 'Control de acceso',
      headline: 'Usuarios y permisos',
      description: 'Crea cuentas, asigna roles y controla quién puede acceder al panel.',
      badges: ['Cuentas', 'Roles', 'Acceso'],
    },
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'lastname', label: 'Apellido', type: 'text' },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'ci', label: 'CI', type: 'text' },
      { name: 'phone', label: 'Telefono', type: 'text' },
      { name: 'roleId', label: 'Rol (1 administrador, 2 lector, 3 editor)', type: 'number', required: true },
      { name: 'active', label: 'Activo', type: 'checkbox' },
      { name: 'premium', label: 'Premium', type: 'checkbox' },
    ],
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      { key: 'roleId', label: 'Rol ID' },
      { key: 'active', label: 'Activo', type: 'boolean' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'roles',
    path: 'roles',
    title: 'Roles',
    description: 'Perfiles de acceso del sistema.',
    apiPath: '/roles',
    countPath: '/role-count',
    createPath: '/role/create',
    updatePath: (id) => `/role/update/${id}`,
    deletePath: (id) => `/role/delete/${id}`,
    icon: 'fa-shield-halved',
    accent: 'secondary',
    presentation: {
      variant: 'ledger',
      kicker: 'Gobierno del sistema',
      headline: 'Roles del sistema',
      description: 'Define los permisos disponibles para cada tipo de usuario.',
      badges: ['Roles', 'Permisos', 'Control'],
    },
    fields: [{ name: 'name', label: 'Nombre', type: 'text', required: true }],
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'types',
    path: 'types',
    title: 'Categorias',
    description: 'Clasificacion editorial para articulos y exclusivos.',
    apiPath: '/types',
    countPath: '/type-count',
    createPath: '/type/create',
    updatePath: (id) => `/type/update/${id}`,
    deletePath: (id) => `/type/delete/${id}`,
    icon: 'fa-tags',
    accent: 'secondary',
    presentation: {
      variant: 'editorial',
      kicker: 'Taxonomía editorial',
      headline: 'Categorías editoriales',
      description: 'Organiza las noticias por tema para facilitar su gestión.',
      badges: ['Categorías', 'Temas', 'Orden'],
    },
    fields: [{ name: 'name', label: 'Nombre', type: 'text', required: true }],
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'articles',
    path: 'articles',
    title: 'Articulos',
    description: 'Crea, programa y publica las noticias del sitio.',
    apiPath: '/articles',
    countPath: '/articles/count',
    createPath: '/articles',
    updatePath: (id) => `/articles/${id}`,
    deletePath: (id) => `/articles/${id}`,
    icon: 'fa-newspaper',
    accent: 'error',
    presentation: {
      variant: 'editorial',
      kicker: 'Laboratorio de historias',
      headline: 'Gestiona tus artículos',
      description: 'Crea borradores, programa publicaciones y revisa las noticias existentes.',
      badges: ['Borradores', 'Programadas', 'Publicadas'],
    },
    fields: [
      { name: 'title', label: 'Titulo', type: 'text', required: true },
      { name: 'key', label: 'Clave', type: 'text' },
      { name: 'summary', label: 'Resumen', type: 'textarea' },
      { name: 'description', label: 'Descripcion', type: 'textarea' },
      { name: 'observations', label: 'Observaciones', type: 'textarea' },
      { name: 'photo', label: 'Foto', type: 'text' },
      { name: 'typeId', label: 'Categoria ID', type: 'number' },
      { name: 'status', label: 'Estado: draft, scheduled o published', type: 'text', required: true },
      { name: 'scheduledFor', label: 'Programar para', type: 'datetime-local' },
    ],
    columns: [
      { key: 'title', label: 'Titulo' },
      { key: 'typeId', label: 'Categoria ID' },
      { key: 'status', label: 'Estado' },
      { key: 'scheduledFor', label: 'Programado', type: 'date' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'exclusives',
    path: 'exclusives',
    title: 'Exclusivos',
    description: 'Contenido premium y su audiencia asociada.',
    apiPath: '/exclusives/all',
    countPath: '/exclusives-count',
    createPath: '/exclusive/create',
    updatePath: (id) => `/exclusive/update/${id}`,
    deletePath: (id) => `/exclusive/delete/${id}`,
    icon: 'fa-crown',
    accent: 'error',
    presentation: {
      variant: 'broadcast',
      kicker: 'Contenido premium',
      headline: 'Contenido exclusivo',
      description: 'Administra las publicaciones disponibles para usuarios premium.',
      badges: ['Premium', 'Usuarios', 'Estado'],
    },
    fields: [
      { name: 'title', label: 'Titulo', type: 'text', required: true },
      { name: 'summary', label: 'Resumen', type: 'textarea' },
      { name: 'description', label: 'Descripcion', type: 'textarea' },
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'typeId', label: 'Categoria ID', type: 'number', required: true },
      { name: 'userId', label: 'Autor ID', type: 'number', required: true },
      { name: 'users', label: 'Usuarios IDS', type: 'tags' },
      { name: 'status', label: 'Publicado', type: 'checkbox' },
    ],
    columns: [
      { key: 'title', label: 'Titulo' },
      { key: 'typeId', label: 'Categoria ID' },
      { key: 'status', label: 'Estado', type: 'boolean' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'notifications',
    path: 'notifications',
    title: 'Notificaciones',
    description: 'Mensajes y avisos enviados a usuarios.',
    apiPath: '/notifications',
    countPath: '/notification-count',
    createPath: '/notification/create',
    updatePath: (id) => `/notification/update/${id}`,
    deletePath: (id) => `/notification/delete/${id}`,
    icon: 'fa-bell',
    accent: 'primary',
    presentation: {
      variant: 'broadcast',
      kicker: 'Difusion editorial',
      headline: 'Notificaciones',
      description: 'Crea y consulta los avisos enviados a los usuarios.',
      badges: ['Mensajes', 'Usuarios', 'Envíos'],
    },
    fields: [
      { name: 'message', label: 'Mensaje', type: 'textarea', required: true },
      { name: 'userId', label: 'Autor ID', type: 'number', required: true },
      { name: 'articleId', label: 'Articulo ID', type: 'number' },
      { name: 'users', label: 'Usuarios IDS', type: 'tags' },
    ],
    columns: [
      { key: 'message', label: 'Mensaje' },
      { key: 'userId', label: 'Autor ID' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'uploads',
    path: 'uploads',
    title: 'Archivos',
    description: 'Metadatos de documentos y piezas cargadas.',
    apiPath: '/uploads',
    countPath: '/upload-count',
    createPath: '/upload/create',
    updatePath: (id) => `/upload/update/${id}`,
    deletePath: (id) => `/upload/delete/${id}`,
    icon: 'fa-folder-open',
    accent: 'secondary',
    presentation: {
      variant: 'archive',
      kicker: 'Archivo y assets',
      headline: 'Archivos',
      description: 'Consulta los archivos y enlaces usados en las publicaciones.',
      badges: ['Archivos', 'Enlaces', 'Origen'],
    },
    fields: [
      { name: 'url', label: 'URL', type: 'text', required: true },
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'userId', label: 'Usuario ID', type: 'number', required: true },
    ],
    columns: [
      { key: 'name', label: 'Nombre' },
      { key: 'url', label: 'URL' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'extras',
    path: 'extras',
    title: 'Extras',
    description: 'Flags operativos para analitica editorial.',
    apiPath: '/extras',
    countPath: '/extras',
    createPath: '/extra/create',
    updatePath: (id) => `/extra/update/${id}`,
    deletePath: (id) => `/extra/delete/${id}`,
    icon: 'fa-chart-line',
    accent: 'primary',
    presentation: {
      variant: 'ledger',
      kicker: 'Señales internas',
      headline: 'Datos adicionales',
      description: 'Revisa los indicadores adicionales asociados a cada artículo.',
      badges: ['Indicadores', 'Interés', 'Reuniones'],
    },
    fields: [
      { name: 'deep', label: 'Deep', type: 'checkbox' },
      { name: 'deepdate', label: 'Fecha Deep', type: 'date' },
      { name: 'information', label: 'Informacion', type: 'checkbox' },
      { name: 'interest', label: 'Interes', type: 'checkbox' },
      { name: 'reunion', label: 'Reunion', type: 'checkbox' },
      { name: 'userId', label: 'Usuario ID', type: 'number', required: true },
      { name: 'articleId', label: 'Articulo ID', type: 'number' },
    ],
    columns: [
      { key: 'userId', label: 'Usuario ID' },
      { key: 'deep', label: 'Deep', type: 'boolean' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'logs',
    path: 'logs',
    title: 'Lecturas',
    description: 'Registro de lectura de articulos.',
    apiPath: '/logs',
    countPath: '/log-count',
    createPath: '/log/create',
    updatePath: (id) => `/log/update/${id}`,
    deletePath: (id) => `/log/delete/${id}`,
    icon: 'fa-book-open-reader',
    accent: 'secondary',
    presentation: {
      variant: 'ledger',
      kicker: 'Lecturas y trazabilidad',
      headline: 'Lecturas de artículos',
      description: 'Consulta qué artículos fueron leídos y cuándo ocurrió.',
      badges: ['Lecturas', 'Usuarios', 'Fechas'],
    },
    fields: [
      { name: 'userId', label: 'Usuario ID', type: 'number', required: true },
      { name: 'articleId', label: 'Articulo ID', type: 'number', required: true },
    ],
    columns: [
      { key: 'userId', label: 'Usuario ID' },
      { key: 'articleId', label: 'Articulo ID' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
  {
    key: 'logexclusives',
    path: 'logexclusives',
    title: 'Lectura de Exclusivos',
    description: 'Registro de lectura de exclusivos.',
    apiPath: '/logexclusives',
    countPath: '/logexclusive-count',
    createPath: '/logexclusive/create',
    updatePath: (id) => `/logexclusive/update/${id}`,
    deletePath: (id) => `/logexclusive/delete/${id}`,
    icon: 'fa-bookmark',
    accent: 'secondary',
    presentation: {
      variant: 'ledger',
      kicker: 'Lectura premium',
      headline: 'Lecturas de exclusivos',
      description: 'Consulta el historial de lectura del contenido exclusivo.',
      badges: ['Exclusivos', 'Usuarios', 'Fechas'],
    },
    fields: [
      { name: 'userId', label: 'Usuario ID', type: 'number', required: true },
      { name: 'exclusiveId', label: 'Exclusivo ID', type: 'number', required: true },
    ],
    columns: [
      { key: 'userId', label: 'Usuario ID' },
      { key: 'exclusiveId', label: 'Exclusivo ID' },
      { key: 'createdAt', label: 'Creado', type: 'date' },
    ],
  },
]

export function getModuleConfig(path: string) {
  return moduleConfigs.find((config) => config.path === path)
}
