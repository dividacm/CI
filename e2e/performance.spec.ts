import { expect, test } from '@playwright/test';

test.describe('Performance de documentos longos', () => {
  test('mede renderização do preview com conteúdo crescente', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#editor');
    const paper = page.locator('#paper');

    const samples = [5_000, 20_000, 50_000];
    const measurements: Array<{ characters: number; durationMs: number; pages: number }> = [];

    for (const characters of samples) {
      const durationMs = await editor.evaluate((element, length) => {
        const text = 'Texto de teste para benchmark. '.repeat(Math.ceil(length / 31)).slice(0, length);
        element.innerHTML = `<p>${text}</p>`;
        const start = performance.now();
        element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        return performance.now() - start;
      }, characters);

      const pages = await paper.locator('.paper-page').count();
      expect(pages).toBeGreaterThan(0);
      measurements.push({ characters, durationMs, pages });
    }

    console.log(`Long-document benchmark: ${JSON.stringify(measurements)}`);
  });
});
