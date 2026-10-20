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

    await page.locator('#editor').click();
    await insertTable.click();
    await expect(page.locator('#editor table')).toHaveCount(1);
    await expect(page.locator('#editor table tr')).toHaveCount(2);
    await expect(page.locator('#editor table tr').first().locator('td, th')).toHaveCount(3);
  });
}
