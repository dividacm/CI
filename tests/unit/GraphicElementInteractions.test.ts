import { describe, expect, it, vi } from 'vitest';
import { GraphicElementInteractions } from '../../src/graphics/GraphicElementInteractions';
import { createGraphicElement } from '../../src/graphics/GraphicElementModel';

describe('GraphicElementInteractions', () => {
  it('inserts a shape and exposes it as selected', () => {
    const root = document.createElement('article');
    const onChange = vi.fn();
    const interactions = new GraphicElementInteractions(root, { onChange });

    expect(interactions.insertShape()).toBe(true);
    expect(interactions.getElements()).toHaveLength(1);
    expect(interactions.hasSelection()).toBe(true);
    expect(root.querySelector('.graphic-element')).not.toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('supports move and resize through pointer events', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    const element = createGraphicElement({ id: 'shape-1', kind: 'shape', position: { x: 10, y: 20 } });
    interactions.setElements([element]);

    const node = root.querySelector<HTMLElement>('[data-graphic-id="shape-1"]');
    expect(node).not.toBeNull();
    node?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 30, clientY: 35 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 30, clientY: 35 }));

    expect(interactions.getElements()[0]?.position).toEqual({ x: 30, y: 35 });
  });

  it('supports undo and redo', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.insertShape();
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()).toHaveLength(0);
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()).toHaveLength(1);
  });
});
