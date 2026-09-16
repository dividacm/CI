import './styles/main.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Elemento #app não encontrado.');
}

app.innerHTML = `
  <main class="app-shell">
    <section class="bootstrap-card" aria-labelledby="app-title">
      <p class="eyebrow">Comunicação Interna</p>
      <h1 id="app-title">Editor em migração</h1>
      <p class="status" role="status">
        Fundação Vite + TypeScript inicializada. A implementação do editor será migrada por etapas,
        preservando o comportamento do baseline.
      </p>
    </section>
  </main>
`;
