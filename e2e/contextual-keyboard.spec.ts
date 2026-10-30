import { expect, test } from '@playwright/test';

test.describe('Teclado nos comandos contextuais de tabela e gráficos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
  });

  test('insere uma tabela usando apenas teclado e preserva sua estrutura', async ({ page }) => {
    const insertTable = page.getByRole('button', { name: 'Inserir tabela 2 por 3' });
    await insertTable.focus();
    await expect(insertTable).toBeFocused();
    await page.keyboard.press('Enter');

    const table = page.locator('#editor table');
    await expect(table).toHaveCount(1);
    await expect(table.locator('tr')).toHaveCount(2);
    await expect(table.locator('tr').first().locator('td, th')).toHaveCount(3);
  });

  test('seleciona forma e aciona duplicação por teclado', async ({ page }) => {
    const insertShape = page.getByRole('button', { name: 'Inserir forma' });
    await insertShape.focus();
    await page.keyboard.press('Enter');

    const shape = page.locator('.graphic-elements-layer .graphic-element-shape').first();
    await expect(shape).toHaveAttribute('tabindex', '0');

    // Limpa a seleção criada pela inserção para validar foco + Enter.
    await page.locator('#editor').dispatchEvent('click');
    await expect(page.locator('.graphic-tools')).toBeHidden();

    await shape.focus();
    await page.keyboard.press('Enter');

    await expect(shape).toBeFocused();
    await expect(shape).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.graphic-tools')).toBeVisible();

    const duplicate = page.getByRole('button', { name: 'Duplicar elemento' });
    await expect(duplicate).toBeVisible();
    await duplicate.focus();
    await expect(duplicate).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('.graphic-elements-layer .graphic-element-shape')).toHaveCount(2);
  });

  test('alcança e aciona a exclusão de conector por teclado', async ({ page }) => {
    const insertShape = page.getByRole('button', { name: 'Inserir forma' });
    await insertShape.click();
    await insertShape.click();

    const shapes = page.locator('.graphic-elements-layer .graphic-element-shape');
    await expect(shapes).toHaveCount(2);
    await shapes.first().focus();
    await page.keyboard.press('Control+Enter');

    const connect = page.getByRole('button', { name: 'Conectar dois elementos' });
    await expect(connect).toBeVisible();
    await connect.click();

    const connector = page.locator('.graphic-connectors-layer [data-connector-id]');
    await expect(connector).toHaveCount(1);

    const deleteConnector = page.getByRole('button', { name: 'Excluir conector' });
    await expect(deleteConnector).toBeVisible();
    await expect(deleteConnector).toBeEnabled();
    await deleteConnector.focus();
    await expect(deleteConnector).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(connector).toHaveCount(0);
    await expect(page.locator('.connector-tools')).toBeHidden();
  });
});
