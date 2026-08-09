<script setup lang="ts">
import { useSessionStore } from '@/stores/session'
import AppButton from '@/components/ui/AppButton.vue'
import { useRouter } from 'vue-router'

const session = useSessionStore()
const router = useRouter()
</script>

<template>
  <div class="nf">
    <span class="nf__code">404</span>
    <h1>Esta página no está en el archivo</h1>
    <p>El enlace caducó, cambió de lugar o nunca existió.</p>

    <div class="nf__actions">
      <AppButton icon="fa-solid fa-house" @click="router.push(session.isAuthenticated ? session.homeRoute : '/entrar')">
        Volver al inicio
      </AppButton>
      <AppButton variant="ghost" icon="fa-solid fa-arrow-left" @click="router.back()">Regresar</AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.nf {
  @include col(var(--s-3), center);
  justify-content: center;
  min-height: 100vh;
  padding: var(--s-6);
  text-align: center;

  h1 {
    font-size: clamp(24px, 4vw, 34px);
  }

  p {
    color: var(--text-muted);
  }
}

.nf__code {
  font-family: var(--font-display);
  font-size: clamp(72px, 16vw, 140px);
  line-height: 1;
  color: transparent;
  background: linear-gradient(135deg, var(--brand), var(--iris));
  background-clip: text;
  -webkit-background-clip: text;
}

.nf__actions {
  @include row(var(--s-3), center, center);
  flex-wrap: wrap;
  margin-top: var(--s-3);
}
</style>
