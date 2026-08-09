<script setup lang="ts">
import AppToaster from '@/components/ui/AppToaster.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>

  <AppToaster />
</template>
