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
    node?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 30, clientY: 35 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 30, clientY: 35 }));

    expect(interactions.getElements()[0]?.position).toEqual({ x: 30, y: 35 });
  });

  it('restores the pre-drag state on undo', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    const element = createGraphicElement({ id: 'shape-undo', kind: 'shape', position: { x: 10, y: 20 } });
    interactions.setElements([element]);

    const node = root.querySelector<HTMLElement>('[data-graphic-id="shape-undo"]');
    expect(node).not.toBeNull();
    node?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 30, clientY: 35 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 30, clientY: 35 }));

    expect(interactions.getElements()[0]?.position).toEqual({ x: 30, y: 35 });
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.position).toEqual({ x: 10, y: 20 });
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()[0]?.position).toEqual({ x: 30, y: 35 });
  });

  it('moves the selected element with arrows and shift-step', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'shape-keyboard',
      kind: 'shape',
      position: { x: 10, y: 20 },
    })]);

    root.querySelector<HTMLElement>('[data-graphic-id="shape-keyboard"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20 }),
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(interactions.getElements()[0]?.position).toEqual({ x: 11, y: 20 });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
    expect(interactions.getElements()[0]?.position).toEqual({ x: 11, y: 30 });

    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.position).toEqual({ x: 11, y: 20 });
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()[0]?.position).toEqual({ x: 11, y: 30 });
  });

  it('supports deletion and ignores modified arrow shortcuts', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'shape-delete',
      kind: 'shape',
      position: { x: 10, y: 20 },
    })]);

    root.querySelector<HTMLElement>('[data-graphic-id="shape-delete"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20 }),
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', metaKey: true, bubbles: true }));
    expect(interactions.getElements()[0]?.position).toEqual({ x: 10, y: 20 });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(interactions.getElements()).toHaveLength(0);
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()).toHaveLength(1);
  });

  it('duplicates the selected element with preserved content and selection', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'shape-duplicate',
      kind: 'shape',
      position: { x: 10, y: 20 },
      data: { label: 'Original' },
    })]);
    root.querySelector<HTMLElement>('[data-graphic-id="shape-duplicate"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20 }),
    );

    expect(interactions.duplicateSelected()).toBe(true);
    expect(interactions.getElements()).toHaveLength(2);
    expect(interactions.getElements()[1]?.data.label).toBe('Original');
    expect(interactions.getElements()[1]?.position).toEqual({ x: 22, y: 32 });
    expect(root.querySelector('[data-graphic-id="shape-duplicate"]')).not.toHaveAttribute('data-selected', 'true');
    expect(root.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
  });

  it('changes z-order and preserves selection through undo and redo', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    const first = createGraphicElement({ id: 'shape-first', kind: 'shape' });
    const second = createGraphicElement({ id: 'shape-second', kind: 'shape', position: { x: 20, y: 20 } });
    interactions.setElements([first, second]);
    root.querySelector<HTMLElement>('[data-graphic-id="shape-first"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }),
    );

    expect(interactions.bringSelectedToFront()).toBe(true);
    expect(interactions.getElements().map((element) => element.id)).toEqual(['shape-second', 'shape-first']);
    expect(root.querySelector('[data-graphic-id="shape-first"]')).toHaveAttribute('data-selected', 'true');
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements().map((element) => element.id)).toEqual(['shape-first', 'shape-second']);
    expect(root.querySelector('[data-graphic-id="shape-first"]')).toHaveAttribute('data-selected', 'true');
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements().map((element) => element.id)).toEqual(['shape-second', 'shape-first']);
    expect(root.querySelector('[data-graphic-id="shape-first"]')).toHaveAttribute('data-selected', 'true');
  });

  it('returns false when ordering has no effect or no selection', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({ id: 'shape-only', kind: 'shape' })]);
    root.querySelector<HTMLElement>('[data-graphic-id="shape-only"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }),
    );
    expect(interactions.bringSelectedToFront()).toBe(false);
    expect(interactions.sendSelectedToBack()).toBe(false);
    expect(interactions.duplicateSelected()).toBe(true);
    expect(interactions.sendSelectedToBack()).toBe(true);
    expect(interactions.getElements()[0]?.id).not.toBe('shape-only');
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
