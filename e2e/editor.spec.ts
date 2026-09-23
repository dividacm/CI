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
    await expect(editor).toContainText('Texto para histórico');

    await page.getByRole('button', { name: '↶' }).click();
    await expect(editor).not.toContainText('Texto para histórico');

    await page.getByRole('button', { name: '↷' }).click();
    await expect(editor).toContainText('Texto para histórico');
  });

  test('generates a PDF', async ({ page }) => {
    await page.getByRole('button', { name: 'Baixar PDF' }).click();
    await expect(page.locator('#save-status')).toHaveText('PDF gerado com sucesso.', {
      timeout: 30_000,
    });
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
