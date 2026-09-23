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

    const saveButton = page.getByRole('button', { name: 'Salvar' });
    await saveButton.focus();
    await expect(saveButton).toBeFocused();

    const focusRing = await saveButton.evaluate((element) => {
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
    const summary = page.locator('summary', { hasText: 'Ferramentas' });
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.tools-menu')).toHaveAttribute('open', '');

    const boldButton = page.getByRole('button', { name: 'Negrito' });
    await boldButton.focus();
    await expect(boldButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#editor')).toBeFocused();
  });

  test('respeita prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();

    const motion = await page.locator('.tools-menu > summary').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        transitionDuration: Number.parseFloat(style.transitionDuration) || 0,
        animationDuration: Number.parseFloat(style.animationDuration) || 0,
        transitionUnit: style.transitionDuration.includes('s') ? 's' : 'ms',
        animationUnit: style.animationDuration.includes('s') ? 's' : 'ms',
      };
    });

    const transitionMs = motion.transitionUnit === 's' ? motion.transitionDuration * 1000 : motion.transitionDuration;
    const animationMs = motion.animationUnit === 's' ? motion.animationDuration * 1000 : motion.animationDuration;

    expect(transitionMs).toBeLessThanOrEqual(0.01);
    expect(animationMs).toBeLessThanOrEqual(0.01);
  });
});
