<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{ modelValue: boolean; title?: string; subtitle?: string; icon?: string; width?: string }>(),
  { title: '', subtitle: '', icon: '', width: '460px' },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

function close() {
  emit('update:modelValue', false)
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
      <div v-if="modelValue" class="drawer" @click.self="close">
        <Transition name="slide-right" appear>
          <aside class="drawer__panel" :style="{ maxWidth: width }">
            <header class="drawer__head">
              <div class="drawer__title">
                <span v-if="icon" class="drawer__icon"><i :class="icon" aria-hidden="true" /></span>
                <div>
                  <h2>{{ title }}</h2>
                  <p v-if="subtitle">{{ subtitle }}</p>
                </div>
              </div>
              <button class="drawer__close" type="button" aria-label="Cerrar" @click="close">
                <i class="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <div class="drawer__body"><slot /></div>

            <footer v-if="$slots.footer" class="drawer__foot"><slot name="footer" /></footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer {
  position: fixed;
  inset: 0;
  z-index: 890;
  @include row(0, stretch, flex-end);
  background: rgba(3, 5, 10, 0.7);
  backdrop-filter: blur(8px);
}

.drawer__panel {
  @include col(0);
  width: 100%;
  height: 100%;
  background: var(--surface-raised);
  border-inline-start: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
}

.drawer__head {
  @include row(var(--s-3), center, space-between);
  padding: var(--s-5);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.drawer__title {
  @include row(var(--s-3), center);

  h2 {
    font-size: 18px;
  }

  p {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.drawer__icon {
  @include row(0, center, center);
  width: 36px;
  height: 36px;
  border-radius: var(--r-sm);
  background: var(--iris-soft);
  color: var(--iris);
}

.drawer__close {
  @include row(0, center, center);
  width: 34px;
  height: 34px;
  border-radius: var(--r-sm);
  color: var(--text-muted);

  &:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
}

.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-5);
  @include scrollbar;
}

.drawer__foot {
  @include row(var(--s-3), center, flex-end);
  padding: var(--s-4) var(--s-5);
  border-top: 1px solid var(--line);
  background: var(--surface-sunken);
}
</style>
