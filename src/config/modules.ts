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
  accent: 'red' | 'gold' | 'blue'
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
    accent: 'blue',
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
    accent: 'gold',
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
    accent: 'gold',
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
    accent: 'red',
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
    accent: 'red',
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
    accent: 'blue',
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
    accent: 'gold',
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
    accent: 'blue',
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
    accent: 'gold',
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
    accent: 'gold',
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
