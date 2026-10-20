import { expect, test } from '@playwright/test';

type Measurement = {
  characters: number;
  durationMs: number;
  pages: number;
};

const SAMPLES_PER_SIZE = 5;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

test.describe('Performance de documentos longos', () => {
  test('mede renderização do preview com conteúdo crescente', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('#editor');
    const paper = page.locator('#paper');

    const sizes = [5_000, 20_000, 50_000];
    const report: Array<{
      characters: number;
      pages: number[][];
      samplesMs: number[];
      medianMs: number;
    }> = [];

    for (const characters of sizes) {
      const text = 'Texto de teste para benchmark. '
        .repeat(Math.ceil(characters / 31))
        .slice(0, characters);

      const dispatchInputAndWaitForRender = async (): Promise<number> =>
        editor.evaluate(async (element, content) => {
          element.innerHTML = `<p>${content}</p>`;
          const start = performance.now();
          element.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
              inputType: 'insertText',
            }),
          );

          // O listener do editor agenda renderPreview via requestAnimationFrame.
          // Este callback é enfileirado depois do callback de renderização.
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return performance.now() - start;
        }, text);

      // Uma execução de aquecimento por tamanho não entra no relatório.
      await dispatchInputAndWaitForRender();
      await expect.poll(() => paper.locator('.paper-page').count()).toBeGreaterThan(0);
      await expect(paper).toContainText(text);

      const measurements: Measurement[] = [];

      for (let sample = 0; sample < SAMPLES_PER_SIZE; sample += 1) {
        const durationMs = await dispatchInputAndWaitForRender();
        const pages = await paper.locator('.paper-page').count();
        const renderedText = (await paper.textContent()) ?? '';

        expect(pages, `preview sem páginas para ${characters} caracteres`).toBeGreaterThan(0);
        expect(renderedText, `conteúdo incompleto para ${characters} caracteres`).toContain(text);
        measurements.push({ characters, durationMs, pages });
      }

      const sampleTimes = measurements.map(({ durationMs }) => durationMs);
      const pageCounts = measurements.map(({ pages }) => pages);

      report.push({
        characters,
        pages: pageCounts,
        samplesMs: sampleTimes.map((duration) => Number(duration.toFixed(2))),
        medianMs: Number(median(sampleTimes).toFixed(2)),
      });
    }

    console.log(
      `Long-document benchmark (ms; one warm-up + ${SAMPLES_PER_SIZE} samples per size, including preview render): ${JSON.stringify(report)}`,
    );
    expect(report).toHaveLength(sizes.length);
  });
});
