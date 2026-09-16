import type { OrganizationConfig } from '../types/configuration';

export interface AppDependencies {
  organization: OrganizationConfig;
}

export function renderApp(root: HTMLElement, dependencies: AppDependencies): void {
  const { organization } = dependencies;

  root.innerHTML = `
    <main class="app-shell" data-organization="${escapeHtml(organization.id)}">
      <header class="app-header">
        <div>
          <p class="eyebrow">${escapeHtml(organization.branding.organizationName)}</p>
          <h1>Editor de Comunicação Interna</h1>
          <p class="status" role="status">Estrutura do novo editor inicializada.</p>
        </div>
      </header>
      <section class="editor-shell" aria-label="Editor">
        <div class="editor-fields">
          <label>
            <span>De</span>
            <input name="from" autocomplete="organization" />
          </label>
          <label>
            <span>Para</span>
            <input name="to" autocomplete="off" />
          </label>
          <label>
            <span>Assunto</span>
            <input name="subject" autocomplete="off" />
          </label>
        </div>
        <div class="editor-toolbar" aria-label="Formatação" role="toolbar">
          <span>Barra de ferramentas será migrada na próxima etapa.</span>
        </div>
        <div class="editor-body" contenteditable="true" role="textbox" aria-multiline="true" data-editor-body></div>
      </section>
    </main>
  `;

  const template = organization.templates.find(
    (item) => item.id === organization.defaultTemplateId,
  );

  if (!template) {
    throw new Error(`Template padrão "${organization.defaultTemplateId}" não encontrado.`);
  }

  for (const field of template.fields) {
    const input = root.querySelector<HTMLInputElement>(`[name="${field.id}"]`);
    if (!input) continue;
    input.placeholder = field.placeholder ?? '';
    input.value = field.defaultValue ?? '';
    input.required = field.required;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
    };
    return entities[character] ?? character;
  });
}
