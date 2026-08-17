import type { DailyBrief } from '@/types'
import { formatDate, formatIndicator } from '@/composables/useFormat'

/**
 * Convierte el resumen del día en una imagen lista para Signal. El cliente
 * pidió que el cierre no viaje como texto plano: se dibuja un afiche con la
 * paleta de la marca (navy de fondo, rojo editorial, dorado para datos).
 */

const ANCHO = 1080
const MARGEN = 72
const NAVY = '#010D27'
const CREMA = '#f5f2ed'
const MUTED = '#9aa8c4'
const DIM = '#6b7a99'
const ROJO = '#c8392b'
const ROJO_CLARO = '#e0594a' // el rojo puro no contrasta sobre navy
const OCEAN = '#2094d2'
const GOLD = '#c9a84c'
const MOSS = '#57a773'
const ROSADO = '#ff6b7a' // subidas en verde, bajadas en rosado (no rojo: es la marca)
const LINEA = 'rgba(245, 242, 237, 0.14)'

function fuente(variable: string, fallback: string) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return valor || fallback
}

function envolver(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number) {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''

  for (const palabra of palabras) {
    const intento = actual ? `${actual} ${palabra}` : palabra
    if (ctx.measureText(intento).width <= maxAncho || !actual) actual = intento
    else {
      lineas.push(actual)
      actual = palabra
    }
  }

  if (actual) lineas.push(actual)
  return lineas
}

export async function renderBriefImage(brief: DailyBrief): Promise<Blob> {
  // Sin las tipografías cargadas el canvas caería a la fuente del sistema.
  await document.fonts?.ready

  const display = fuente('--font-display', 'Georgia, serif')
  const sans = fuente('--font-sans', 'system-ui, sans-serif')
  const mono = fuente('--font-mono', 'ui-monospace, monospace')
  const anchoUtil = ANCHO - MARGEN * 2

  /** Un solo recorrido sirve para medir y para dibujar. */
  function pintar(ctx: CanvasRenderingContext2D, dibujar: boolean, alto: number) {
    if (dibujar) {
      ctx.fillStyle = NAVY
      ctx.fillRect(0, 0, ANCHO, alto)
      ctx.fillStyle = ROJO
      ctx.fillRect(0, 0, ANCHO, 10)
    }

    let y = MARGEN + 44

    ctx.font = `700 52px ${display}`
    if (dibujar) {
      ctx.fillStyle = CREMA
      ctx.fillText('OFF THE RECORD', MARGEN, y)
    }
    y += 40

    ctx.font = `600 22px ${mono}`
    if (dibujar) {
      ctx.fillStyle = GOLD
      ctx.fillText(`RESUMEN DEL ${formatDate(brief.date).toUpperCase()}`, MARGEN, y)
    }
    y += 56

    function seccion(titulo: string, color: string) {
      ctx.font = `700 24px ${mono}`
      if (dibujar) {
        ctx.fillStyle = color
        ctx.fillText(titulo, MARGEN, y)
        const anchoTitulo = ctx.measureText(titulo).width
        ctx.strokeStyle = LINEA
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(MARGEN + anchoTitulo + 20, y - 8)
        ctx.lineTo(ANCHO - MARGEN, y - 8)
        ctx.stroke()
      }
      y += 40
    }

    function listado(items: { title: string }[], color: string) {
      items.forEach((item, index) => {
        ctx.font = `600 27px ${sans}`
        const numero = `${index + 1}.`
        const sangria = 46
        const lineas = envolver(ctx, item.title, anchoUtil - sangria)

        if (dibujar) {
          ctx.font = `700 27px ${mono}`
          ctx.fillStyle = color
          ctx.fillText(numero, MARGEN, y)
          ctx.font = `600 27px ${sans}`
          ctx.fillStyle = CREMA
          lineas.forEach((linea, i) => ctx.fillText(linea, MARGEN + sangria, y + i * 37))
        }

        y += lineas.length * 37 + 14
      })
      y += 34
    }

    if (brief.headlines.length) {
      seccion('TITULARES', ROJO_CLARO)
      listado(brief.headlines, ROJO_CLARO)
    }

    if (brief.updates.length) {
      seccion('ACTUALIZACIONES', OCEAN)
      listado(brief.updates, OCEAN)
    }

    if (brief.indicators.length) {
      seccion('INDICADORES', GOLD)

      const columna = (anchoUtil - 40) / 2
      const altoCelda = 108

      brief.indicators.forEach((indicator, index) => {
        const x = MARGEN + (index % 2) * (columna + 40)
        const fila = y + Math.floor(index / 2) * altoCelda

        if (dibujar) {
          ctx.font = `600 19px ${sans}`
          ctx.fillStyle = MUTED
          ctx.fillText(envolver(ctx, indicator.name, columna)[0] || '', x, fila)

          ctx.font = `700 30px ${mono}`
          ctx.fillStyle = CREMA
          const valor = formatIndicator(indicator.value, indicator.format, indicator.unit)
          const anchoValor = ctx.measureText(valor).width
          ctx.fillText(valor, x, fila + 38)

          if (indicator.deltaPercent !== null) {
            const sube = indicator.deltaPercent >= 0
            ctx.font = `600 21px ${mono}`
            ctx.fillStyle = sube ? MOSS : ROSADO
            const delta = `${sube ? '▲' : '▼'} ${Math.abs(indicator.deltaPercent).toFixed(2)}%`
            ctx.fillText(delta, x + anchoValor + 16, fila + 38)
          }
        }

        if (index === brief.indicators.length - 1) {
          y = fila + altoCelda
        }
      })
    }

    if (dibujar) {
      ctx.strokeStyle = LINEA
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(MARGEN, y)
      ctx.lineTo(ANCHO - MARGEN, y)
      ctx.stroke()

      ctx.font = `500 18px ${sans}`
      ctx.fillStyle = DIM
      ctx.fillText('Sala de redacción · Off The Record', MARGEN, y + 40)
    }

    return y + 40 + MARGEN
  }

  const sonda = document.createElement('canvas')
  const ctxSonda = sonda.getContext('2d')
  if (!ctxSonda) throw new Error('El navegador no permite dibujar la imagen')
  const alto = Math.ceil(pintar(ctxSonda, false, 0))

  const canvas = document.createElement('canvas')
  canvas.width = ANCHO
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no permite dibujar la imagen')
  pintar(ctx, true, alto)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
      'image/png',
    )
  })
}
