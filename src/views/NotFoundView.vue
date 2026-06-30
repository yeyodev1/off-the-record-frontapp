<template>
  <div class="not-found page-frame">
    <section class="not-found__card glass-card">
      <span class="eyebrow">Error 404</span>
      <h1 class="section-title">Esta página no existe.</h1>
      <p class="section-copy">Volvé al dashboard para seguir navegando el panel editorial.</p>
      <RouterLink to="/dashboard" class="primary-button">Volver al dashboard</RouterLink>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.not-found__card {
  width: min(100%, 620px);
  padding: 1.5rem;
  text-align: center;
  display: grid;
  gap: 1rem;
}

.section-title {
  font-size: clamp(2.5rem, 8vw, 5rem);
  color: #fff;
}

.section-copy {
  max-width: 50ch;
  margin: 0 auto;
  color: rgba(246, 241, 232, 0.78);
}

@media (min-width: 900px) {
  .not-found__card {
    padding: 2rem;
  }
}
</style>
