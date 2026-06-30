export type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'checkbox' | 'date' | 'tags'

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
    description: 'Administracion de cuentas, roles y estado de acceso.',
    apiPath: '/users',
    icon: 'fa-user-group',
    accent: 'primary',
    presentation: {
      variant: 'operator',
      kicker: 'Control de acceso',
      headline: 'Usuarios y permisos con narrativa de comando',
      description: 'Una interfaz de supervisión para cuentas, estados, roles y actividad reciente.',
      badges: ['Acceso', 'Estado', 'Riesgo'],
    },
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'lastname', label: 'Apellido', type: 'text' },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'ci', label: 'CI', type: 'text' },
      { name: 'phone', label: 'Telefono', type: 'text' },
      { name: 'roleId', label: 'Rol ID', type: 'number', required: true },
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
    icon: 'fa-shield-halved',
    accent: 'secondary',
    presentation: {
      variant: 'ledger',
      kicker: 'Gobierno del sistema',
      headline: 'Roles como matriz de decisión y seguridad',
      description: 'Visualiza cómo se distribuye el poder de edición y administración en el panel.',
      badges: ['Permisos', 'Jerarquía', 'Control'],
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
    icon: 'fa-tags',
    accent: 'secondary',
    presentation: {
      variant: 'editorial',
      kicker: 'Taxonomía editorial',
      headline: 'Categorias pensadas como una portada dinámica',
      description: 'Agrupa el contenido en capas visuales que priorizan legibilidad y ritmo.',
      badges: ['Secciones', 'Etiquetas', 'Orden'],
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
    description: 'Piezas editoriales y su contenido principal.',
    apiPath: '/articles',
    icon: 'fa-newspaper',
    accent: 'error',
    presentation: {
      variant: 'editorial',
      kicker: 'Laboratorio de historias',
      headline: 'Articulos con layout de revista y control de detalle',
      description: 'Edicion, resumen, estados y metadatos en un flujo que se siente premium.',
      badges: ['Story', 'Preview', 'Publicacion'],
    },
    fields: [
      { name: 'title', label: 'Titulo', type: 'text', required: true },
      { name: 'key', label: 'Clave', type: 'text' },
      { name: 'summary', label: 'Resumen', type: 'textarea' },
      { name: 'description', label: 'Descripcion', type: 'textarea' },
      { name: 'observations', label: 'Observaciones', type: 'textarea' },
      { name: 'photo', label: 'Foto', type: 'text' },
      { name: 'typeId', label: 'Categoria ID', type: 'number', required: true },
      { name: 'userId', label: 'Autor ID', type: 'number', required: true },
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
    key: 'exclusives',
    path: 'exclusives',
    title: 'Exclusivos',
    description: 'Contenido premium y su audiencia asociada.',
    apiPath: '/exclusives',
    icon: 'fa-crown',
    accent: 'error',
    presentation: {
      variant: 'broadcast',
      kicker: 'Contenido premium',
      headline: 'Exclusivos con dramatismo visual y foco absoluto',
      description: 'Un tablero cinemático para piezas premium, audiencias y segmentación.',
      badges: ['Premium', 'Audiencia', 'Expiración'],
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
    icon: 'fa-bell',
    accent: 'primary',
    presentation: {
      variant: 'broadcast',
      kicker: 'Difusion editorial',
      headline: 'Notificaciones como una consola de transmisión',
      description: 'El mensaje se siente como un envío directo, no como un CRUD frío.',
      badges: ['Alerta', 'Segmento', 'Distribucion'],
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
    icon: 'fa-folder-open',
    accent: 'secondary',
    presentation: {
      variant: 'archive',
      kicker: 'Archivo y assets',
      headline: 'Archivos organizados como una bóveda editorial',
      description: 'Explora documentos y cargas con una jerarquía limpia y escaneable.',
      badges: ['Archivo', 'Peso', 'Origen'],
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
    icon: 'fa-chart-line',
    accent: 'primary',
    presentation: {
      variant: 'ledger',
      kicker: 'Señales internas',
      headline: 'Extras con lectura analítica de comportamiento',
      description: 'Flags, estados y contexto editorial en una sola vista de comando.',
      badges: ['Deep', 'Interest', 'Reunion'],
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
    icon: 'fa-book-open-reader',
    accent: 'secondary',
    presentation: {
      variant: 'ledger',
      kicker: 'Lecturas y trazabilidad',
      headline: 'Logs con estética de bitácora premium',
      description: 'Un recorrido claro por eventos, lecturas y relaciones de consumo.',
      badges: ['Auditoria', 'Tiempo', 'Historia'],
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
    icon: 'fa-bookmark',
    accent: 'secondary',
    presentation: {
      variant: 'ledger',
      kicker: 'Lectura premium',
      headline: 'Registros de exclusivos con foco de auditoría',
      description: 'Seguimiento visual fuerte para entender qué contenido se consumió y cuándo.',
      badges: ['Premium', 'Lectura', 'Rastro'],
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
