<template>
  <div class="not-found">
    <h1>404</h1>
    <p>La pagina no existe.</p>
    <RouterLink to="/dashboard">Volver al dashboard</RouterLink>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  text-align: center;
}

h1 {
  font-size: 5rem;
  letter-spacing: -0.08em;
}
</style>
