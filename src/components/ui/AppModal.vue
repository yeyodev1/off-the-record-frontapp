<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    subtitle?: string
    icon?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    dismissible?: boolean
  }>(),
  { title: '', subtitle: '', icon: '', size: 'md', dismissible: true },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'close'): void }>()

function close() {
  if (!props.dismissible) return
  emit('update:modelValue', false)
  emit('close')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="modal" role="dialog" aria-modal="true" @click.self="close">
        <Transition name="pop" appear>
          <div :class="['modal__panel', `modal__panel--${size}`]">
            <header class="modal__head">
              <div class="modal__title">
                <span v-if="icon" class="modal__icon"><i :class="icon" aria-hidden="true" /></span>
                <div class="modal__titles">
                  <h2>{{ title }}</h2>
                  <p v-if="subtitle">{{ subtitle }}</p>
                </div>
              </div>
              <button v-if="dismissible" class="modal__close" type="button" aria-label="Cerrar" @click="close">
                <i class="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <div class="modal__body">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="modal__foot">
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.modal {
  position: fixed;
  inset: 0;
  z-index: 900;
  @include row(0, center, center);
  padding: var(--s-5);
  background: rgba(3, 5, 10, 0.74);
  backdrop-filter: blur(10px);

  @include mobile {
    padding: 0;
    align-items: flex-end;
  }
}

.modal__panel {
  @include col(0);
  width: 100%;
  max-height: 90vh;
  background: var(--surface-raised);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;

  @include mobile {
    max-height: 92vh;
    border-radius: var(--r-xl) var(--r-xl) 0 0;
  }
}

.modal__panel--sm {
  max-width: 440px;
}
.modal__panel--md {
  max-width: 620px;
}
.modal__panel--lg {
  max-width: 880px;
}
.modal__panel--xl {
  max-width: 1160px;
}

.modal__head {
  @include row(var(--s-4), flex-start, space-between);
  padding: var(--s-5) var(--s-6);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.modal__title {
  @include row(var(--s-3), center);
}

.modal__icon {
  @include row(0, center, center);
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.modal__titles {
  @include col(2px);

  h2 {
    font-size: 19px;
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.modal__close {
  @include row(0, center, center);
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--r-sm);
  color: var(--text-muted);
  transition:
    background var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.modal__body {
  padding: var(--s-6);
  overflow-y: auto;
  @include scrollbar;
}

.modal__foot {
  @include row(var(--s-3), center, flex-end);
  flex-wrap: wrap;
  padding: var(--s-4) var(--s-6);
  border-top: 1px solid var(--line);
  background: var(--surface-sunken);
  flex-shrink: 0;
}
</style>
