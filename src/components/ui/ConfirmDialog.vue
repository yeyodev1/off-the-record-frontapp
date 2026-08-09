<script setup lang="ts">
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'danger' | 'primary'
    loading?: boolean
  }>(),
  {
    title: '¿Confirmas la acción?',
    message: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    tone: 'danger',
    loading: false,
  },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'confirm'): void }>()
</script>

<template>
  <AppModal
    :model-value="modelValue"
    size="sm"
    :title="title"
    icon="fa-solid fa-triangle-exclamation"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="confirm__message">{{ message }}</p>

    <template #footer>
      <AppButton variant="ghost" @click="emit('update:modelValue', false)">{{ cancelLabel }}</AppButton>
      <AppButton :variant="tone" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.confirm__message {
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-muted);
}
</style>
