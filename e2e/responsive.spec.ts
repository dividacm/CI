import { appendFile } from 'node:fs/promises';
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

    test('registra baseline mensurável da toolbar e da área de edição', async ({ page }, testInfo) => {
      const metrics = await page.evaluate(() => {
        const toolbar = document.querySelector<HTMLElement>('.toolbar');
        const primaryActions = document.querySelector<HTMLElement>('.toolbar-primary-actions');
        const toolsSummary = document.querySelector<HTMLElement>('.tools-menu > summary');
        const editor = document.querySelector<HTMLElement>('#editor');
        const paper = document.querySelector<HTMLElement>('.editor-page');

        if (!toolbar || !primaryActions || !toolsSummary || !editor || !paper) {
          throw new Error('Não foi possível medir os elementos principais da toolbar e do editor.');
        }

        const buttons = [...primaryActions.querySelectorAll('button')];
        const buttonTops = [...new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)))];
        const toolbarRect = toolbar.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        const paperRect = paper.getBoundingClientRect();
        const editorCanvas = document.querySelector<HTMLElement>('.editor-canvas');
        const pageHeader = document.querySelector<HTMLElement>('.editor-page-header');
        if (!editorCanvas) {
          throw new Error('Não foi possível medir a área rolável do documento.');
        }
        const editorCanvasRect = editorCanvas.getBoundingClientRect();
        const documentTitle = document.querySelector<HTMLElement>('.editor-document-title');
        const documentDate = document.querySelector<HTMLElement>('.editor-document-date');
        const metadata = document.querySelector<HTMLElement>('.editor-metadata');

        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scrollY: Math.round(window.scrollY),
          toolbarHeight: Math.round(toolbarRect.height),
          primaryActionCount: buttons.length,
          primaryActionRows: buttonTops.length,
          toolsSummaryHeight: Math.round(toolsSummary.getBoundingClientRect().height),
          editorTop: Math.round(editorRect.top),
          editorBottom: Math.round(editorRect.bottom),
          editorHeight: Math.round(editorRect.height),
          editorVisibleHeight: Math.max(
            0,
            Math.min(editorRect.bottom, window.innerHeight) - Math.max(editorRect.top, 0),
          ),
          editorCanvasTop: Math.round(editorCanvasRect.top),
          editorCanvasClientHeight: editorCanvas.clientHeight,
          editorCanvasScrollHeight: editorCanvas.scrollHeight,
          editorCanvasScrollTop: editorCanvas.scrollTop,
          editorCanvasVerticalScrollRange: Math.max(0, editorCanvas.scrollHeight - editorCanvas.clientHeight),
          editorTopWithinCanvas: Math.round(editorRect.top - editorCanvasRect.top + editorCanvas.scrollTop),
          pageHeaderHeight: Math.round(pageHeader?.getBoundingClientRect().height ?? 0),
          documentTitleHeight: Math.round(documentTitle?.getBoundingClientRect().height ?? 0),
          documentDateHeight: Math.round(documentDate?.getBoundingClientRect().height ?? 0),
          metadataHeight: Math.round(metadata?.getBoundingClientRect().height ?? 0),
          paperTop: Math.round(paperRect.top),
          documentScrollWidth: document.documentElement.scrollWidth,
          documentClientWidth: document.documentElement.clientWidth,
        };
      });

      const report = { viewport: viewport.name, ...metrics };
      const serializedMetrics = JSON.stringify(report);
      testInfo.annotations.push({
        type: 'toolbar-baseline',
        description: serializedMetrics,
      });
      console.log(`Responsive toolbar baseline: ${serializedMetrics}`);

      if (process.env.GITHUB_STEP_SUMMARY) {
        const summary = [
          `\n### Toolbar responsiva — ${viewport.name} (${viewport.width}×${viewport.height})`,
          '',
          '| Métrica | Valor |',
          '|---|---:|',
          `| Altura da toolbar | ${metrics.toolbarHeight} px |`,
          `| Ações primárias | ${metrics.primaryActionCount} |`,
          `| Linhas das ações primárias | ${metrics.primaryActionRows} |`,
          `| Altura do resumo Ferramentas | ${metrics.toolsSummaryHeight} px |`,
          `| Posição vertical do editor (topo/fim) | ${metrics.editorTop} / ${metrics.editorBottom} px |`,
          `| Altura total do editor | ${metrics.editorHeight} px |`,
          `| Altura visível do editor no viewport | ${metrics.editorVisibleHeight} px |`,
          `| Topo da área rolável do documento | ${metrics.editorCanvasTop} px |`,
          `| Altura útil / conteúdo da área rolável | ${metrics.editorCanvasClientHeight} / ${metrics.editorCanvasScrollHeight} px |`,
          `| Faixa de rolagem vertical interna | ${metrics.editorCanvasVerticalScrollRange} px |`,
          `| Posição do editor dentro da área rolável | ${metrics.editorTopWithinCanvas} px |`,
          `| Posição inicial de rolagem interna | ${metrics.editorCanvasScrollTop} px |`,
          `| Cabeçalho da página A4 | ${metrics.pageHeaderHeight} px |`,
          `| Título / data / metadados | ${metrics.documentTitleHeight} / ${metrics.documentDateHeight} / ${metrics.metadataHeight} px |`,
          `| Posição de rolagem vertical | ${metrics.scrollY} px |`,
          `| Topo do papel | ${metrics.paperTop} px |`,
          `| Largura de rolagem − largura útil | ${metrics.documentScrollWidth - metrics.documentClientWidth} px |`,
          '',
          '_Medição observacional; não estabelece orçamento automático nem altera o layout._',
          '',
        ].join('\n');
        await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
      }

      expect(metrics.toolbarHeight, 'A toolbar deve ter altura mensurável').toBeGreaterThan(0);
      expect(metrics.primaryActionCount).toBe(4);
      expect(metrics.primaryActionRows, 'A quantidade de linhas das ações principais deve ser mensurável').toBeGreaterThan(0);
      expect(metrics.toolsSummaryHeight).toBeGreaterThan(0);
      expect(
        metrics.documentScrollWidth - metrics.documentClientWidth,
        'A medição da toolbar não deve introduzir overflow horizontal na página',
      ).toBeLessThanOrEqual(1);
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

      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(pageOverflow, 'A página inteira não deve criar rolagem horizontal inesperada').toBeLessThanOrEqual(1);
    });

    test('abre Ferramentas e permite alcançar controles de edição', async ({ page }) => {
      const summary = page.locator('summary', { hasText: 'Ferramentas' });
      await summary.click();
      await expect(page.locator('.tools-menu')).toHaveAttribute('open', '');

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

    await page.locator('summary', { hasText: 'Ferramentas' }).click();
    const insertTable = page.getByRole('button', { name: 'Inserir tabela 2 por 3' });
    await expect(insertTable).toBeVisible();

    await test.step('focar o editor antes da inserção', async () => {
      await page.locator('#editor').click({ timeout: 8_000 });
    });
    await test.step('acionar a inserção da tabela', async () => {
      await insertTable.click({ timeout: 8_000 });
    });
    await test.step('validar a estrutura da tabela inserida', async () => {
      await expect(page.locator('#editor table')).toHaveCount(1, { timeout: 8_000 });
      await expect(page.locator('#editor table tr')).toHaveCount(2, { timeout: 8_000 });
      await expect(page.locator('#editor table tr').first().locator('td, th')).toHaveCount(3, { timeout: 8_000 });
    });
  });
}
