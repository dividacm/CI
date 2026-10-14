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


describe('GraphicElementInteractions history and ordering branches', () => {
  it('covers empty and populated undo/redo stacks', () => {
    const root = document.createElement('article');
    const onChange = vi.fn();
    const interactions = new GraphicElementInteractions(root, { onChange });

    expect(interactions.canUndo()).toBe(false);
    expect(interactions.canRedo()).toBe(false);
    expect(interactions.undo()).toBe(false);
    expect(interactions.redo()).toBe(false);

    expect(interactions.insertShape()).toBe(true);
    expect(interactions.canUndo()).toBe(true);
    expect(interactions.canRedo()).toBe(false);
    expect(interactions.undo()).toBe(true);
    expect(interactions.canUndo()).toBe(false);
    expect(interactions.canRedo()).toBe(true);
    expect(interactions.redo()).toBe(true);
    expect(interactions.canUndo()).toBe(true);
    expect(interactions.canRedo()).toBe(false);

    interactions.dispose();
  });

  it('covers grouping, ungrouping, and no-op z-order changes', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({ id: 'shape-a', kind: 'shape', position: { x: 10, y: 10 } }),
      createGraphicElement({ id: 'shape-b', kind: 'shape', position: { x: 30, y: 30 } }),
    ]);

    expect(interactions.groupSelected()).toBe(false);
    expect(interactions.ungroupSelected()).toBe(false);
    expect(interactions.bringSelectedToFront()).toBe(false);
    expect(interactions.sendSelectedToBack()).toBe(false);

    const first = root.querySelector<HTMLElement>('[data-graphic-id="shape-a"]');
    first?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    // Selecting the first element re-renders the layer, so query the second element afterward.
    const second = root.querySelector<HTMLElement>('[data-graphic-id="shape-b"]');
    second?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: true, clientX: 30, clientY: 30 }));

    expect(interactions.getSelectedIds()).toHaveLength(2);
    expect(interactions.groupSelected()).toBe(true);
    expect(interactions.getElements().every((element) => Boolean(element.groupId))).toBe(true);
    expect(interactions.ungroupSelected()).toBe(true);
    expect(interactions.getElements().every((element) => !element.groupId)).toBe(true);

    interactions.dispose();
  });

  it('covers z-order changes when a selected element can move', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({ id: 'shape-a', kind: 'shape', position: { x: 10, y: 10 } }),
      createGraphicElement({ id: 'shape-b', kind: 'shape', position: { x: 30, y: 30 } }),
    ]);

    root.querySelector<HTMLElement>('[data-graphic-id="shape-a"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
    );
    expect(interactions.bringSelectedToFront()).toBe(true);
    expect(interactions.getElements().map((element) => element.id)).toEqual(['shape-b', 'shape-a']);
    expect(interactions.sendSelectedToBack()).toBe(true);
    expect(interactions.getElements().map((element) => element.id)).toEqual(['shape-a', 'shape-b']);

    interactions.dispose();
  });
});


describe('GraphicElementInteractions SmartArt node lifecycle branches', () => {
  it('edits a selected node and removes it while detaching its children', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Direção atualizada');

    interactions.insertSmartArt('hierarchy');
    const graphic = root.querySelector<HTMLElement>('.graphic-element-smartart');
    const nodes = graphic?.querySelectorAll<HTMLElement>('.smartart-node');
    expect(nodes?.length).toBe(2);

    nodes?.[0]?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(interactions.getElements()[0]?.smartArt?.nodes[0]?.text).toBe('Direção atualizada');
    expect(interactions.getSelectedSmartArtNodeId()).toBe(interactions.getElements()[0]?.smartArt?.nodes[0]?.id);

    expect(interactions.removeSelectedSmartArtNode()).toBe(true);
    const remaining = interactions.getElements()[0]?.smartArt?.nodes ?? [];
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.parentId).toBeUndefined();
    expect(interactions.getSelectedSmartArtNodeId()).toBeNull();

    prompt.mockRestore();
    interactions.dispose();
  });

  it('ignores unchanged or cancelled SmartArt edits and supports hierarchy child creation', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

    interactions.insertSmartArt('hierarchy');
    const firstNode = root.querySelector<HTMLElement>('.smartart-node');
    firstNode?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(interactions.getElements()[0]?.smartArt?.nodes[0]?.text).toBe('Direção');

    const nodeId = interactions.getElements()[0]?.smartArt?.nodes[0]?.id;
    expect(nodeId).toBeTruthy();
    expect(interactions.addSmartArtNode()).toBe(true);
    const elements = interactions.getElements();
    const addedNode = elements[0]?.smartArt?.nodes[2];
    expect(addedNode?.parentId).toBe(nodeId);
    expect(interactions.removeSelectedSmartArtNode()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.nodes).toHaveLength(2);

    prompt.mockRestore();
    interactions.dispose();
  });
});
