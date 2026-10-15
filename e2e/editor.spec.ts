import { expect, test } from '@playwright/test';

test.describe('Comunicação Interna editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#editor')).toBeVisible();
  });

  test('opens with the default document fields and editor', async ({ page }) => {
    await expect(page.locator('[data-field="from"]')).toHaveValue(
      'Gerência de Valores em Carteira e Cobrança - GCCOB',
    );
    await expect(page.locator('[data-field="to"]')).toHaveValue('CRISTIANE SCHWARZ');
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('#paper')).toBeVisible();
    await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');
  });

  test('edits fields and content, formats text, and persists after reload', async ({ page }) => {
    const subject = page.locator('[data-field="subject"]');
    const editor = page.locator('#editor');

    await subject.fill('Teste E2E');
    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    await editor.click();
    await editor.pressSequentially('Conteúdo de teste E2E');

    await editor.selectText();
    await page.getByRole('button', { name: 'Negrito' }).click();

    await expect(editor.locator('strong')).toContainText('Conteúdo de teste E2E');

    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');

    await page.reload();
    await expect(subject).toHaveValue('Teste E2E');
    await expect(editor).toContainText('Conteúdo de teste E2E');
    await expect(editor.locator('strong')).toContainText('Conteúdo de teste E2E');
  });

  test('supports undo and redo through the toolbar', async ({ page }) => {
    const editor = page.locator('#editor');

    await editor.click();
    await editor.pressSequentially('Texto para histórico');
    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    await expect(editor).toContainText('Texto para histórico');

    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(editor).not.toContainText('Texto para histórico');

    await page.getByRole('button', { name: 'Refazer' }).click();
    await expect(editor).toContainText('Texto para histórico');
  });

  test('generates a PDF', async ({ page }) => {
    await page.getByRole('button', { name: 'Baixar PDF' }).click();
    await expect(page.locator('#save-status')).toHaveText('PDF gerado com sucesso.', {
      timeout: 30_000,
    });
  });

  test('coalesces preview repagination during a burst of editor input', async ({ page }) => {
    const mutationBatches = await page.evaluate(() => {
      const paper = document.querySelector<HTMLElement>('#paper');
      const editor = document.querySelector<HTMLElement>('#editor');
      if (!paper || !editor) throw new Error('Editor ou preview não encontrado.');

      let batches = 0;
      const observer = new MutationObserver(() => {
        batches += 1;
      });
      observer.observe(paper, { childList: true, subtree: true });

      editor.innerHTML = '<p>Documento de desempenho.</p>';
      for (let index = 0; index < 40; index += 1) {
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      }

      return new Promise<number>((resolve) => {
        requestAnimationFrame(() => {
          observer.disconnect();
          resolve(batches);
        });
      });
    });

    expect(mutationBatches).toBe(1);
  });


  test('imports a valid JSON backup through the browser and restores its content', async ({ page }) => {
    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    const backup = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.startsWith('ci:document:'));
      if (!key) throw new Error('Documento persistido não encontrado.');
      const document = JSON.parse(localStorage.getItem(key) ?? 'null');
      document.id = 'e2e-imported-document';
      document.fields.subject = 'Backup restaurado via E2E';
      document.bodyHtml = '<p>Conteúdo restaurado pelo teste de navegador.</p>';
      return JSON.stringify({
        format: 'ci-communication-document',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        document,
      });
    });

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#backup-import-file').setInputFiles({
      name: 'backup-e2e.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backup),
    });

    await expect(page.locator('#save-status')).toHaveText(
      'Documento JSON restaurado. Confira o conteúdo antes de continuar.',
    );
    await expect(page.locator('[data-field="subject"]')).toHaveValue('Backup restaurado via E2E');
    await expect(page.locator('#editor')).toContainText('Conteúdo restaurado pelo teste de navegador.');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ci:active-document'))).toContain(
      'e2e-imported-document',
    );
  });

  test('reports a storage failure during import without replacing the current document', async ({ page }) => {
    const originalSubject = await page.locator('[data-field="subject"]').inputValue();
    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    const backup = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.startsWith('ci:document:'));
      if (!key) throw new Error('Documento persistido não encontrado.');
      const document = JSON.parse(localStorage.getItem(key) ?? 'null');
      document.id = 'e2e-storage-failure-document';
      document.fields.subject = 'Não deve substituir o documento';
      return JSON.stringify({
        format: 'ci-communication-document',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        document,
      });
    });

    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.startsWith('ci:document:') || key === 'ci:active-document') {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };
    });
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#backup-import-file').setInputFiles({
      name: 'backup-storage-failure.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backup),
    });

    await expect(page.locator('#save-status')).toContainText('Não foi possível importar o backup');
    await expect(page.locator('#save-status')).toHaveAttribute('data-status', 'error');
    await expect(page.locator('[data-field="subject"]')).toHaveValue(originalSubject);
    await expect(page.locator('#editor')).not.toContainText('Não deve substituir o documento');
  });

  test('has no console errors during the main editor flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.locator('[data-field="subject"]').fill('Fluxo sem erros');
    await page.locator('#editor').click();
    await page.locator('#editor').pressSequentially('Verificação do fluxo principal.');
    await page.getByRole('button', { name: 'Salvar' }).click();

    expect(errors).toEqual([]);
  });
});
