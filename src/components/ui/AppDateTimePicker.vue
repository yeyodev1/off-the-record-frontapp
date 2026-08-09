<script setup lang="ts">
import { computed } from 'vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppSelect from '@/components/ui/AppSelect.vue'

/**
 * Fecha y hora sin `<input type="datetime-local">`. Reutiliza el calendario
 * propio y dos desplegables nuestros, así la programación se ve igual en
 * Windows que en Mac.
 *
 * El valor entra y sale en el formato que ya usaba el proyecto:
 * `YYYY-MM-DDTHH:mm` (hora local, el mismo que producía `toLocalInput`).
 */
const props = withDefaults(defineProps<{ modelValue: string; min?: string }>(), { min: '' })
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()

const fecha = computed(() => (props.modelValue || '').split('T')[0] || '')
const hora = computed(() => ((props.modelValue || '').split('T')[1] || '').slice(0, 5))

const HORAS = Array.from({ length: 24 }, (_, index) => ({
  value: String(index).padStart(2, '0'),
  label: `${String(index).padStart(2, '0')}:00`,
}))

const MINUTOS = ['00', '15', '30', '45'].map((value) => ({ value, label: value }))

const hh = computed(() => hora.value.slice(0, 2) || '09')
const mm = computed(() => hora.value.slice(3, 5) || '00')

/** Elegir día sin hora asume las 09:00: publicar a medianoche nunca es la intención. */
function setFecha(value: string) {
  if (!value) return emit('update:modelValue', '')
  emit('update:modelValue', `${value}T${hh.value}:${mm.value}`)
}

function setHora(parte: 'h' | 'm', value: string) {
  const dia = fecha.value || new Date().toISOString().slice(0, 10)
  const h = parte === 'h' ? value : hh.value
  const m = parte === 'm' ? value : mm.value
  emit('update:modelValue', `${dia}T${h}:${m}`)
}

const minFecha = computed(() => (props.min || '').split('T')[0] || '')
</script>

<template>
  <div class="dtp">
    <AppDatePicker
      class="dtp__date"
      placeholder="Elegir día"
      :model-value="fecha"
      :min="minFecha"
      @update:model-value="setFecha"
    />

    <div class="dtp__time">
      <AppSelect :model-value="hh" :options="HORAS" @update:model-value="setHora('h', String($event))" />
      <span class="dtp__sep">:</span>
      <AppSelect :model-value="mm" :options="MINUTOS" @update:model-value="setHora('m', String($event))" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.dtp {
  @include row(var(--s-2), flex-end);
  flex-wrap: wrap;
}

.dtp__date {
  flex: 1 1 180px;
}

.dtp__time {
  @include row(var(--s-2), center);
  flex: 0 0 auto;

  // Los desplegables de hora no necesitan el ancho de un selector normal.
  :deep(.sel) {
    min-width: 84px;
  }
}

.dtp__sep {
  color: var(--text-dim);
  font-family: var(--font-mono);
}
</style>
