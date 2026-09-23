import { expect, test } from '@playwright/test';

test.describe('Acessibilidade do editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#editor')).toBeVisible();
  });

  test('expõe nomes acessíveis e foco visível nos controles principais', async ({ page }) => {
    await expect(page.getByRole('toolbar', { name: 'Ferramentas do editor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Baixar PDF' })).toBeVisible();
    await expect(page.locator('#editor')).toHaveAttribute('role', 'textbox');
    await expect(page.locator('#editor')).toHaveAttribute('aria-multiline', 'true');

    const focusRing = await page.locator('[data-action="save"]').evaluate((element) => {
      (element as HTMLElement).focus();
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });

    expect(focusRing.outlineStyle).not.toBe('none');
    expect(focusRing.outlineWidth).not.toBe('0px');
  });

  test('mantém controles operáveis por teclado', async ({ page }) => {
    await page.locator('summary', { hasText: 'Ferramentas' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.tools-menu')).toHaveAttribute('open', '');

    await page.getByRole('button', { name: 'Negrito' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Negrito' })).toBeFocused();
  });

  test('respeita prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();

    const motion = await page.locator('.tools-menu > summary').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        transitionDuration: style.transitionDuration,
        animationDuration: style.animationDuration,
      };
    });

    expect(motion.transitionDuration).toBe('0.01ms');
    expect(motion.animationDuration).toBe('0.01ms');
  });
});
