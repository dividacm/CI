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
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Desfazer' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Inserir tabela 2 por 3' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();

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


  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 375, height: 812 },
  ] as const) {
    test(`supports keyboard activation of table and graphic commands on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const insertTable = page.getByRole('button', { name: 'Inserir tabela 2 por 3' });
      await insertTable.focus();
      await expect(insertTable).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#editor table')).toHaveCount(1);

      const insertShape = page.getByRole('button', { name: 'Inserir forma' });
      await insertShape.focus();
      await expect(insertShape).toBeFocused();
      await page.keyboard.press('Enter');

      const shapes = page.locator('.graphic-elements-layer .graphic-element-shape');
      await expect(shapes).toHaveCount(1);

      await shapes.first().focus();
      await page.keyboard.press('Control+Enter');
      const duplicate = page.getByRole('button', { name: 'Duplicar elemento' });
      await expect(duplicate).toBeVisible();
      await duplicate.focus();
      await expect(duplicate).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(shapes).toHaveCount(2);
    });
  }

  test('edits a table cell and persists its content after reload', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
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
      await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();

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

      await page.locator('#editor').dispatchEvent('click');
      await expect(graphicTools).toBeHidden();

      await page.getByRole('button', { name: 'Inserir SmartArt' }).click();
      await expect(page.locator('.graphic-elements-layer .graphic-element-smartart')).toHaveCount(1);
      await expect(graphicTools).toBeVisible();
      await expect(smartArtTools).toBeVisible();
      await expect(connectorTools).toBeHidden();

      await page.locator('#editor').dispatchEvent('click');
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

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 375, height: 812 },
  ] as const) {
    test(`shows connector actions only for a selected connector and clears them on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await expect(page.locator('#editor')).toBeVisible();

      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });

      await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
      const graphicTools = page.locator('.graphic-tools');
      const connectorTools = page.locator('.connector-tools');
      const smartArtTools = page.locator('.smartart-tools');

      await expect(graphicTools).toBeHidden();
      await expect(connectorTools).toBeHidden();
      await expect(smartArtTools).toBeHidden();

      await page.getByRole('button', { name: 'Inserir forma' }).click();
      let graphics = page.locator('.graphic-elements-layer .graphic-element-shape');
      await expect(graphics).toHaveCount(1);
      await expect(graphicTools).toBeVisible();
      await expect(connectorTools).toBeHidden();

      await page.getByRole('button', { name: 'Inserir forma' }).click();
      graphics = page.locator('.graphic-elements-layer .graphic-element-shape');
      await expect(graphics).toHaveCount(2);

      await graphics.first().focus();
      await page.keyboard.press('Control+Enter');
      await expect(graphicTools).toBeVisible();
      await page.getByRole('button', { name: 'Conectar dois elementos' }).click();

      const connector = page.locator('.graphic-connectors-layer [data-connector-id]');
      await expect(connector).toHaveCount(1);
      await expect(connectorTools).toBeVisible();
      const deleteConnector = page.getByRole('button', { name: 'Excluir conector' });
      await expect(deleteConnector).toBeVisible();
      await expect(deleteConnector).toBeEnabled();

      await graphics.last().click();
      await expect(connectorTools).toBeHidden();
      await expect(smartArtTools).toBeHidden();

      expect(errors).toEqual([]);
    });
  }



test.describe('Régua e zoom da pré-visualização responsiva', () => {
  for (const viewport of [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ]) {
    test(`mantém régua e controles de zoom funcionais em ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await expect(page.locator('#paper')).toBeVisible();
      await expect(page.locator('#horizontal-ruler')).toBeVisible();
      await expect(page.locator('[data-action="zoom-in"]')).toBeVisible();
      await expect(page.locator('[data-action="zoom-out"]')).toBeVisible();

      const zoom = page.locator('#preview-zoom');
      await expect(zoom).toHaveText('100%');
      await page.locator('[data-action="zoom-in"]').click();
      await expect(zoom).toHaveText('110%');
      await page.locator('[data-action="zoom-out"]').click();
      await expect(zoom).toHaveText('100%');

      const dimensions = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        rulerWidth: document.querySelector<HTMLElement>('#horizontal-ruler')?.getBoundingClientRect().width ?? 0,
        paperWidth: document.querySelector<HTMLElement>('#paper')?.getBoundingClientRect().width ?? 0,
      }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
      expect(dimensions.rulerWidth).toBeGreaterThan(0);
      expect(dimensions.paperWidth).toBeGreaterThan(0);
    });
  }
});


test.describe('Preservação do documento e exportação PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#editor')).toBeVisible();
  });

  test('preserva os campos e o corpo editados após salvar e recarregar', async ({ page }) => {
    await page.locator('[data-field="from"]').fill('Setor de teste documental');
    await page.locator('[data-field="to"]').fill('Destinatário de teste');
    await page.locator('[data-field="subject"]').fill('Preservação do documento V2.10');

    const editor = page.locator('#editor');
    await editor.fill('Conteúdo que deve permanecer no documento após salvar.');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');

    await page.reload();
    await expect(page.locator('[data-field="from"]')).toHaveValue('Setor de teste documental');
    await expect(page.locator('[data-field="to"]')).toHaveValue('Destinatário de teste');
    await expect(page.locator('[data-field="subject"]')).toHaveValue('Preservação do documento V2.10');
    await expect(page.locator('#editor')).toContainText('Conteúdo que deve permanecer no documento após salvar.');
    await expect(page.locator('#paper')).toBeVisible();
  });

  test('gera um PDF multipágina quando o documento tem conteúdo extenso', async ({ page }) => {
    const editor = page.locator('#editor');
    await editor.fill('Conteúdo sintético para validar a exportação multipágina. '.repeat(900));

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const stream = await download.createReadStream();
    if (!stream) throw new Error('Não foi possível ler o PDF baixado.');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const pdf = Buffer.concat(chunks).toString('latin1');

    expect(pdf.startsWith('%PDF-')).toBe(true);
    const exportedPageCount = (pdf.match(/\/Type\s*\/Page\b/g) ?? []).length;
    expect(exportedPageCount).toBeGreaterThan(1);
    await expect(page.locator('#save-status')).toHaveText('PDF gerado com sucesso.', {
      timeout: 30_000,
    });
  });
});
