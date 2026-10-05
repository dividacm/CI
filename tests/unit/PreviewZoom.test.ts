import { describe, expect, it } from 'vitest';
import { setPreviewZoom } from '../../src/app/AppView';

describe('setPreviewZoom', () => {
  it('applies the requested zoom and updates the accessible value', () => {
    document.body.innerHTML = '<div id="app"><div class="preview-wrap"></div><output id="preview-zoom"></output></div>';

    setPreviewZoom(document.querySelector('#app')!, 120);

    const wrap = document.querySelector<HTMLElement>('.preview-wrap');
    const output = document.querySelector<HTMLOutputElement>('#preview-zoom');

    expect(wrap?.style.getPropertyValue('--preview-zoom')).toBe('1.2');
    expect(wrap?.dataset.zoom).toBe('120');
    expect(output?.textContent).toBe('120%');
  });

  it('clamps zoom to the supported viewport range', () => {
    document.body.innerHTML = '<div id="app"><div class="preview-wrap"></div><output id="preview-zoom"></output></div>';

    setPreviewZoom(document.querySelector('#app')!, 999);

    const wrap = document.querySelector<HTMLElement>('.preview-wrap');
    expect(wrap?.style.getPropertyValue('--preview-zoom')).toBe('1.5');
  });
});
