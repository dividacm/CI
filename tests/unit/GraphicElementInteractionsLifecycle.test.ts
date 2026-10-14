import { describe, expect, it, vi } from 'vitest';
import { GraphicElementInteractions } from '../../src/graphics/GraphicElementInteractions';
import { createGraphicElement } from '../../src/graphics/GraphicElementModel';

describe('GraphicElementInteractions lifecycle', () => {
  it('disposes listeners and removes its interaction layer', () => {
    const root = document.createElement('article');
    const onChange = vi.fn();
    const interactions = new GraphicElementInteractions(root, { onChange });
    interactions.setElements([
      createGraphicElement({
        id: 'lifecycle-shape',
        kind: 'shape',
        position: { x: 20, y: 20 },
      }),
    ]);

    const element = root.querySelector<HTMLElement>('[data-graphic-id="lifecycle-shape"]');
    expect(element).not.toBeNull();
    element?.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 20,
    }));
    expect(interactions.getSelectedIds()).toEqual(['lifecycle-shape']);

    const layer = root.querySelector('.graphic-elements-layer');
    expect(layer).not.toBeNull();

    interactions.dispose();
    interactions.dispose();

    expect(root.querySelector('.graphic-elements-layer')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(0);

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
    }));

    expect(interactions.getElements()[0]?.position).toEqual({ x: 20, y: 20 });
    expect(interactions.getSelectedIds()).toEqual(['lifecycle-shape']);
  });

  it('does not react to root events after disposal', () => {
    const root = document.createElement('article');
    const onChange = vi.fn();
    const interactions = new GraphicElementInteractions(root, { onChange });
    interactions.setElements([
      createGraphicElement({
        id: 'disposed-shape',
        kind: 'shape',
        position: { x: 10, y: 10 },
      }),
    ]);

    interactions.dispose();
    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(interactions.getSelectedIds()).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(0);
  });
});


describe('GraphicElementInteractions command guard branches', () => {
  it('rejects SmartArt and grouping operations without a valid selection', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });

    expect(interactions.groupSelected()).toBe(false);
    expect(interactions.ungroupSelected()).toBe(false);
    expect(interactions.editSelectedSmartArtNode('Updated')).toBe(false);
    expect(interactions.addSmartArtNode()).toBe(false);
    expect(interactions.removeSelectedSmartArtNode()).toBe(false);
    expect(interactions.setSelectedSmartArtLayout('hierarchy')).toBe(false);

    interactions.dispose();
  });

  it('covers SmartArt node editing guards and layout updates on a selected SmartArt', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });

    expect(interactions.insertSmartArt('process')).toBe(true);
    expect(interactions.editSelectedSmartArtNode('')).toBe(false);
    expect(interactions.editSelectedSmartArtNode('Etapa 1')).toBe(false);
    expect(interactions.removeSelectedSmartArtNode()).toBe(false);
    expect(interactions.setSelectedSmartArtLayout('process')).toBe(false);
    expect(interactions.setSelectedSmartArtLayout('hierarchy')).toBe(true);
    expect(interactions.addSmartArtNode()).toBe(true);

    interactions.dispose();
  });
});
