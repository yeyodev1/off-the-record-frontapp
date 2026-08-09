import { ref, watch } from 'vue'
import { bind, play, setEnabled, setVolume, type SoundName } from 'cuelume'

/**
 * Sonidos de interfaz (cuelume). La biblioteca aplica volumen y encendido
 * pero no los guarda, así que la preferencia vive aquí y se persiste.
 */
const STORAGE_KEY = 'otr:sound'

interface SoundPreference {
  enabled: boolean
  volume: number
}

function readPreference(): SoundPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { enabled: true, volume: 0.5 }

    const parsed = JSON.parse(raw) as Partial<SoundPreference>
    return {
      enabled: parsed.enabled !== false,
      volume: Number.isFinite(parsed.volume) ? Math.min(1, Math.max(0, Number(parsed.volume))) : 0.5,
    }
  } catch {
    // Modo privado o almacenamiento bloqueado: se usa el valor por defecto.
    return { enabled: true, volume: 0.5 }
  }
}

const preference = ref<SoundPreference>(readPreference())

watch(
  preference,
  (value) => {
    setEnabled(value.enabled)
    setVolume(value.volume)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* si no se puede guardar, al menos la sesión actual respeta la elección */
    }
  },
  { deep: true, immediate: true },
)

/** Se llama una sola vez al arrancar: delega todos los `data-cuelume-*`. */
export function startSound() {
  bind()
}

/** Reproduce una señal puntual (guardado, error, contenido listo…). */
export function cue(name: SoundName, volume?: number) {
  play(name, volume === undefined ? undefined : { volume })
}

export function useSound() {
  return {
    preference,
    cue,
    toggle: () => (preference.value.enabled = !preference.value.enabled),
    setVolume: (value: number) => (preference.value.volume = Math.min(1, Math.max(0, value))),
  }
}
