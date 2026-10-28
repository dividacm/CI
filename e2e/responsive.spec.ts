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

    test('atalho visível leva o foco ao corpo do documento', async ({ page }) => {
      await page.getByRole('button', { name: 'Ir para o corpo do documento' }).click();
      await expect(page.locator('#editor')).toBeFocused();
      await expect(page.locator('#editor')).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
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

        const buttons = [...primaryActions.querySelectorAll('button:not([data-action="focus-editor"])')];
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

    test('mede a ocupação da toolbar com Ferramentas recolhidas e abertas', async ({ page }, testInfo) => {
      const before = await page.evaluate(() => {
        const toolbar = document.querySelector<HTMLElement>('.toolbar');
        const canvas = document.querySelector<HTMLElement>('.editor-canvas');
        const summary = document.querySelector<HTMLElement>('.tools-menu > summary');
        if (!toolbar || !canvas || !summary) {
          throw new Error('Não foi possível medir toolbar, canvas e controle Ferramentas.');
        }
        return {
          toolbarHeight: Math.round(toolbar.getBoundingClientRect().height),
          canvasTop: Math.round(canvas.getBoundingClientRect().top),
          summaryHeight: Math.round(summary.getBoundingClientRect().height),
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      const summary = page.locator('.tools-menu > summary');
      await summary.click();
      const panel = page.locator('.tools-panel');
      await expect(panel).toBeVisible();

      const after = await page.evaluate(() => {
        const toolbar = document.querySelector<HTMLElement>('.toolbar');
        const canvas = document.querySelector<HTMLElement>('.editor-canvas');
        const panel = document.querySelector<HTMLElement>('.tools-panel');
        if (!toolbar || !canvas || !panel) {
          throw new Error('Não foi possível medir a toolbar expandida e o painel de ferramentas.');
        }
        const panelRect = panel.getBoundingClientRect();
        return {
          toolbarHeight: Math.round(toolbar.getBoundingClientRect().height),
          canvasTop: Math.round(canvas.getBoundingClientRect().top),
          panelWidth: Math.round(panelRect.width),
          panelHeight: Math.round(panelRect.height),
          panelScrollHeight: panel.scrollHeight,
          panelClientHeight: panel.clientHeight,
          panelLeft: Math.round(panelRect.left),
          panelRight: Math.round(panelRect.right),
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      const report = { viewport: viewport.name, collapsed: before, expanded: after };
      const serializedMetrics = JSON.stringify(report);
      testInfo.annotations.push({ type: 'toolbar-density-baseline', description: serializedMetrics });
      console.log(`Toolbar density baseline: ${serializedMetrics}`);

      if (process.env.GITHUB_STEP_SUMMARY) {
        const summaryMarkdown = [
          `\\n### Ocupação da toolbar — Ferramentas ${viewport.name} (${viewport.width}×${viewport.height})`,
          '',
          '| Métrica | Recolhida | Aberta |',
          '|---|---:|---:|',
          `| Altura da toolbar | ${before.toolbarHeight} px | ${after.toolbarHeight} px |`,
          `| Topo do canvas | ${before.canvasTop} px | ${after.canvasTop} px |`,
          `| Altura do resumo Ferramentas | ${before.summaryHeight} px | — |`,
          `| Dimensões do painel aberto | — | ${after.panelWidth} × ${after.panelHeight} px |`,
          `| Rolagem interna do painel (conteúdo/área útil) | — | ${after.panelScrollHeight} / ${after.panelClientHeight} px |`,
          `| Limites horizontais do painel | — | ${after.panelLeft}–${after.panelRight} px |`,
          `| Overflow horizontal da página | ${before.pageOverflow} px | ${after.pageOverflow} px |`,
          '',
          '_Medição observacional para decisão de UX; não altera CSS nem define thresholds de performance._',
          '',
        ].join('\\n');
        await appendFile(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown, 'utf8');
      }

      expect(Math.abs(after.toolbarHeight - before.toolbarHeight),
        'Abrir Ferramentas não deve aumentar a altura reservada da toolbar').toBeLessThanOrEqual(1);
      expect(Math.abs(after.canvasTop - before.canvasTop),
        'Abrir Ferramentas não deve deslocar verticalmente a área do canvas').toBeLessThanOrEqual(1);
      expect(after.panelWidth).toBeGreaterThan(0);
      expect(after.panelHeight).toBeGreaterThan(0);
      expect(after.panelClientHeight).toBeGreaterThan(0);
      expect(after.panelScrollHeight).toBeGreaterThanOrEqual(after.panelClientHeight);
      expect(after.pageOverflow, 'Ferramentas abertas não devem criar overflow horizontal na página').toBeLessThanOrEqual(1);
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
