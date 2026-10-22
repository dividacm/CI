import { expect, test } from '@playwright/test';

test.describe('Comunicação Interna editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#editor')).toBeVisible();
  });

  test('clearly identifies the public demo and warns against real data on desktop and mobile', async ({ page }) => {
    const notice = page.locator('.demo-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute('role', 'note');
    await expect(notice).toContainText('Demonstração pública');
    await expect(notice).toContainText('Use somente dados fictícios');
    await expect(notice).toContainText('Não insira documentos reais, dados pessoais ou informações institucionais reservadas');
    await expect(notice).toContainText('não oferece autenticação nem controle de acesso');

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(notice).toBeVisible();
    const mobileWidth = await notice.evaluate((element) => element.getBoundingClientRect().width);
    expect(mobileWidth).toBeLessThanOrEqual(375);

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(notice).toBeVisible();
  });

  test('opens with the default document fields and editor', async ({ page }) => {
    await expect(page.locator('[data-field="from"]')).toHaveValue(
      'Setor de demonstração',
    );
    await expect(page.locator('[data-field="to"]')).toHaveValue('Destinatário fictício');
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

  test('inserts the first table when no table cell is active and persists it after reload', async ({ page }) => {
    await page.locator('summary', { hasText: 'Ferramentas' }).click();

    const insertTable = page.getByRole('button', { name: 'Inserir tabela 2 por 3' });
    const selectionTools = page.locator('.table-selection-tools');
    await expect(insertTable).toBeVisible();
    await expect(selectionTools).toBeHidden();

    await page.locator('#editor').click();
    await insertTable.click();
    await expect(page.locator('#editor table')).toHaveCount(1);
    await expect(page.locator('#editor table tr')).toHaveCount(2);
    await expect(page.locator('#editor table tr').first().locator('td, th')).toHaveCount(3);

    await page.locator('#editor table td, #editor table th').first().click();
    await expect(selectionTools).toBeVisible();

    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');
    await page.reload();

    await expect(page.locator('#editor table')).toHaveCount(1);
    await expect(page.locator('#editor table tr')).toHaveCount(2);
    await expect(page.locator('#editor table tr').first().locator('td, th')).toHaveCount(3);
  });


  test('edits a table cell and persists its content after reload', async ({ page }) => {
    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    const editor = page.locator('#editor');
    await editor.click();
    await page.getByRole('button', { name: 'Inserir tabela 2 por 3' }).click();

    const firstCell = editor.locator('table td').first();
    await firstCell.fill('Célula de teste persistida');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');

    await page.reload();
    await expect(page.locator('#editor table td').first()).toHaveText('Célula de teste persistida');
    await expect(page.locator('#editor table tr')).toHaveCount(2);
  });

  test('inserts SmartArt and persists it after reload', async ({ page }) => {
    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    await page.getByRole('button', { name: 'Inserir SmartArt' }).click();

    await expect(page.locator('.editor-page-content .graphic-element-smartart')).toHaveCount(1);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');

    await page.reload();
    await expect(page.locator('.editor-page-content .graphic-element-smartart')).toHaveCount(1);
    await expect(page.locator('.editor-page-content .graphic-element-smartart')).toContainText('Etapa 1');
  });

  test('keeps preview zoom within supported bounds and resets to 100%', async ({ page }) => {
    const zoom = page.locator('#preview-zoom');
    const zoomIn = page.getByRole('button', { name: 'Aumentar zoom' });
    const zoomOut = page.getByRole('button', { name: 'Reduzir zoom' });

    for (let index = 0; index < 8; index += 1) await zoomIn.click();
    await expect(zoom).toHaveText('150%');
    await zoomIn.click();
    await expect(zoom).toHaveText('150%');

    for (let index = 0; index < 12; index += 1) await zoomOut.click();
    await expect(zoom).toHaveText('50%');
    await zoomOut.click();
    await expect(zoom).toHaveText('50%');

    await page.getByRole('button', { name: 'Redefinir zoom' }).click();
    await expect(zoom).toHaveText('100%');
  });

  test('updates the left margin through the keyboard-accessible ruler', async ({ page }) => {
    const marker = page.getByRole('slider', { name: 'Margem esquerda' });
    const initialValue = Number(await marker.getAttribute('aria-valuenow'));

    await marker.press('ArrowRight');

    await expect.poll(async () => {
      const currentMarker = page.getByRole('slider', { name: 'Margem esquerda' });
      return Number(await currentMarker.getAttribute('aria-valuenow'));
    }).toBe(initialValue + 1);
  });

  test('navigates between pages after editing content that spans multiple pages', async ({ page }) => {
    const editor = page.locator('#editor');
    await editor.fill('Conteúdo sintético para validar paginação. '.repeat(900));

    await expect.poll(() => page.locator('#paper .paper-page').count(), {
      timeout: 10_000,
    }).toBeGreaterThan(1);

    const indicator = page.locator('#page-indicator');
    await expect(indicator).toHaveText(/^Página 1 de [2-9]\d*$/);
    await expect(page.getByRole('button', { name: 'Página anterior' })).toBeDisabled();

    await page.getByRole('button', { name: 'Próxima página' }).click();
    await expect(indicator).toHaveText(/^Página 2 de [2-9]\d*$/);
    await expect(page.locator('#paper .paper-page[data-active="true"]')).toHaveAttribute(
      'data-page-number',
      '2',
    );

    await page.getByRole('button', { name: 'Página anterior' }).click();
    await expect(indicator).toHaveText(/^Página 1 de [2-9]\d*$/);
  });

  test('inserts a graphic element and persists it after reload', async ({ page }) => {
    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    await page.getByRole('button', { name: 'Inserir forma' }).click();

    await expect(page.locator('#paper .paper-graphic-element')).toHaveCount(1);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');

    await page.reload();
    await expect(page.locator('#paper .paper-graphic-element')).toHaveCount(1);
  });

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 375, height: 812 },
  ] as const) {
    test(`keeps graphic tool groups synchronized with selection on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await expect(page.locator('#editor')).toBeVisible();
      await page.locator('summary', { hasText: 'Ferramentas' }).click();

      const graphicTools = page.locator('.graphic-tools');
      const smartArtTools = page.locator('.smartart-tools');
      const connectorTools = page.locator('.connector-tools');

      await expect(graphicTools).toBeHidden();
      await expect(smartArtTools).toBeHidden();
      await expect(connectorTools).toBeHidden();

      await page.getByRole('button', { name: 'Inserir forma' }).click();
      await expect(page.locator('.graphic-elements-layer .graphic-element-shape')).toHaveCount(1);
      await expect(graphicTools).toBeVisible();
      await expect(smartArtTools).toBeHidden();
      await expect(connectorTools).toBeHidden();

      await page.locator('#editor').click({ position: { x: 500, y: 300 } });
      await expect(graphicTools).toBeHidden();

      await page.getByRole('button', { name: 'Inserir SmartArt' }).click();
      await expect(page.locator('.graphic-elements-layer .graphic-element-smartart')).toHaveCount(1);
      await expect(graphicTools).toBeVisible();
      await expect(smartArtTools).toBeVisible();
      await expect(connectorTools).toBeHidden();

      await page.locator('#editor').click({ position: { x: 500, y: 300 } });
      await expect(graphicTools).toBeHidden();
      await expect(smartArtTools).toBeHidden();
      await expect(connectorTools).toBeHidden();
    });
  }

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
