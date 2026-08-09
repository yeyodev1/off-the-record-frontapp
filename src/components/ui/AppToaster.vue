<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toasts = useToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="toaster" role="status" aria-live="polite">
      <TransitionGroup name="pop">
        <article v-for="toast in toasts.items" :key="toast.id" :class="['toast', `toast--${toast.tone}`]">
          <span class="toast__icon"><i :class="toasts.iconFor(toast.tone)" aria-hidden="true" /></span>

          <div class="toast__body">
            <p class="toast__title">{{ toast.title }}</p>
            <p v-if="toast.detail" class="toast__detail">{{ toast.detail }}</p>

            <button v-if="toast.action" class="toast__action" type="button" @click="toasts.runAction(toast.id)">
              <i v-if="toast.action.icon" :class="toast.action.icon" aria-hidden="true" />
              {{ toast.action.label }}
            </button>
          </div>

          <button class="toast__close" type="button" aria-label="Cerrar aviso" @click="toasts.dismiss(toast.id)">
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>

          <span v-if="toast.timeout > 0" class="toast__bar" :style="{ animationDuration: `${toast.timeout}ms` }" />
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.toaster {
  position: fixed;
  z-index: 1000;
  inset-block-end: var(--s-5);
  inset-inline-end: var(--s-5);
  @include col(var(--s-3));
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;

  @include mobile {
    inset-inline: var(--s-3);
    inset-block-end: var(--s-3);
    width: auto;
  }
}

.toast {
  position: relative;
  @include row(var(--s-3), flex-start);
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--ink-750);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  pointer-events: auto;
}

.toast__icon {
  @include row(0, center, center);
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--r-xs);
  font-size: 14px;
}

.toast--success .toast__icon {
  background: var(--moss-soft);
  color: var(--moss);
}
.toast--error .toast__icon {
  background: var(--danger-soft);
  color: var(--danger);
}
.toast--info .toast__icon {
  background: var(--ocean-soft);
  color: #5fb6d8;
}
.toast--warning .toast__icon {
  background: var(--gold-soft);
  color: var(--gold);
}

.toast__body {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-weight: 600;
  font-size: 14px;
}

.toast__detail {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.toast__action {
  @include row(var(--s-2), center);
  margin-top: var(--s-2);
  padding: 5px 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line-strong);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  transition:
    background var(--t-fast) var(--ease),
    border-color var(--t-fast) var(--ease);

  i {
    font-size: 10px;
  }

  &:hover {
    background: var(--surface-hover);
    border-color: var(--brand-line);
    color: var(--brand-strong);
  }
}

.toast__close {
  color: var(--text-dim);
  font-size: 13px;
  padding: 2px;

  &:hover {
    color: var(--text);
  }
}

.toast__bar {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 0;
  height: 2px;
  width: 100%;
  background: currentColor;
  opacity: 0.5;
  transform-origin: left;
  animation: toast-bar linear forwards;
}

.toast--success .toast__bar {
  color: var(--moss);
}
.toast--error .toast__bar {
  color: var(--danger);
}
.toast--info .toast__bar {
  color: #5fb6d8;
}
.toast--warning .toast__bar {
  color: var(--gold);
}

@keyframes toast-bar {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
