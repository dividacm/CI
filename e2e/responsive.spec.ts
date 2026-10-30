import { expect, test } from '@playwright/test';

const responsiveViewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

for (const viewport of responsiveViewports) {
  test.describe(`Editor responsivo — ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#editor')).toBeVisible();
    });

    test('atalho visível leva o foco ao corpo do documento', async ({ page }) => {
      await page.getByRole('button', { name: 'Ir para o corpo do documento' }).click();
      await expect(page.locator('#editor')).toBeFocused();
      await expect(page.locator('#editor')).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });

    test('registra baseline mensurável da faixa e da área de edição', async ({ page }, testInfo) => {
      const metrics = await page.evaluate(() => {
        const toolbar = document.querySelector<HTMLElement>('.toolbar');
        const primaryActions = document.querySelector<HTMLElement>('.toolbar-primary-actions');
        const ribbon = document.querySelector<HTMLElement>('.tools-panel');
        const editor = document.querySelector<HTMLElement>('#editor');
        const paper = document.querySelector<HTMLElement>('.editor-page');
        if (!toolbar || !primaryActions || !ribbon || !editor || !paper) {
          throw new Error('Não foi possível medir a faixa de ferramentas e o editor.');
        }
        const buttons = [...primaryActions.querySelectorAll('button:not([data-action="focus-editor"])')];
        const buttonRows = [...new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)))];
        const toolbarRect = toolbar.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        const paperRect = paper.getBoundingClientRect();
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          toolbarHeight: Math.round(toolbarRect.height),
          ribbonHeight: Math.round(ribbon.getBoundingClientRect().height),
          ribbonVisible: getComputedStyle(ribbon).display !== 'none' && ribbon.getBoundingClientRect().height > 0,
          primaryActionCount: buttons.length,
          primaryActionRows: buttonRows.length,
          editorTop: Math.round(editorRect.top),
          editorHeight: Math.round(editorRect.height),
          editorVisibleHeight: Math.max(0, Math.min(editorRect.bottom, window.innerHeight) - Math.max(editorRect.top, 0)),
          paperTop: Math.round(paperRect.top),
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      const serialized = JSON.stringify({ viewport: viewport.name, ...metrics });
      testInfo.annotations.push({ type: 'toolbar-baseline', description: serialized });
      console.log(`Responsive ribbon baseline: ${serialized}`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        await appendFile(process.env.GITHUB_STEP_SUMMARY, [
          `\n### Faixa responsiva — ${viewport.name} (${viewport.width}×${viewport.height})`,
          '', '| Métrica | Valor |', '|---|---:|',
          `| Altura da toolbar / faixa | ${metrics.toolbarHeight} / ${metrics.ribbonHeight} px |`,
          `| Ações primárias / linhas | ${metrics.primaryActionCount} / ${metrics.primaryActionRows} |`,
          `| Faixa visível | ${metrics.ribbonVisible} |`,
          `| Altura visível do editor | ${metrics.editorVisibleHeight} px |`,
          `| Overflow horizontal | ${metrics.documentOverflow} px |`, '',
        ].join('\n'), 'utf8');
      }
      expect(metrics.toolbarHeight).toBeGreaterThan(0);
      expect(metrics.ribbonHeight).toBeGreaterThan(0);
      expect(metrics.ribbonVisible).toBe(true);
      expect(metrics.primaryActionCount).toBe(4);
      expect(metrics.primaryActionRows).toBeGreaterThan(0);
      expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
    });

    test('mantém a faixa de ferramentas permanentemente visível e sem overflow', async ({ page }, testInfo) => {
      const ribbon = page.locator('.tools-panel');
      await expect(ribbon).toBeVisible();
      await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Inserir tabela 2 por 3' })).toBeVisible();
      const metrics = await page.evaluate(() => {
        const toolbar = document.querySelector<HTMLElement>('.toolbar');
        const canvas = document.querySelector<HTMLElement>('.editor-canvas');
        const panel = document.querySelector<HTMLElement>('.tools-panel');
        if (!toolbar || !canvas || !panel) throw new Error('Faixa ou canvas ausente.');
        return {
          toolbarHeight: Math.round(toolbar.getBoundingClientRect().height),
          canvasTop: Math.round(canvas.getBoundingClientRect().top),
          panelWidth: Math.round(panel.getBoundingClientRect().width),
          panelHeight: Math.round(panel.getBoundingClientRect().height),
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      testInfo.annotations.push({ type: 'toolbar-visible-layout', description: JSON.stringify(metrics) });
      expect(metrics.panelWidth).toBeGreaterThan(0);
      expect(metrics.panelHeight).toBeGreaterThan(0);
      expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
    });

    test('mantém as ações principais acessíveis e o editor utilizável', async ({ page }) => {
      for (const name of ['Salvar', 'Limpar', 'Emitir documento', 'Baixar PDF']) {
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
        const bounds = await button.boundingBox();
        expect(bounds, `O botão "${name}" deve ter uma caixa visível`).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      }
      const subject = page.locator('[data-field="subject"]');
      await subject.fill(`Teste responsivo ${viewport.name}`);
      await expect(subject).toHaveValue(`Teste responsivo ${viewport.name}`);
      await page.getByRole('button', { name: 'Salvar', exact: true }).click();
      await expect(page.locator('#save-status')).toHaveText('Salvo localmente.');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test('mantém os controles de edição alcançáveis na faixa permanente', async ({ page }) => {
      const bold = page.getByRole('button', { name: 'Negrito' });
      await expect(bold).toBeVisible();
      const bounds = await bold.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      const editor = page.locator('#editor');
      await editor.click();
      await editor.pressSequentially(`Conteúdo sintético em ${viewport.name}`);
      await expect(editor).toContainText(`Conteúdo sintético em ${viewport.name}`);
      await expect(page.locator('#paper .paper-page').first()).toBeVisible();
    });
  });
}

for (const viewport of [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
] as const) {
  test(`insere a primeira tabela em ${viewport.name} (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.locator('#editor')).toBeVisible();
    const insertTable = page.getByRole('button', { name: 'Inserir tabela 2 por 3' });
    await expect(insertTable).toBeVisible();
    await page.locator('#editor').click({ timeout: 8_000 });
    await insertTable.click({ timeout: 8_000 });
    await expect(page.locator('#editor table')).toHaveCount(1, { timeout: 8_000 });
    await expect(page.locator('#editor table tr')).toHaveCount(2, { timeout: 8_000 });
    await expect(page.locator('#editor table tr').first().locator('td, th')).toHaveCount(3, { timeout: 8_000 });
  });
}
