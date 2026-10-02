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
    expect(root.querySelector('[data-graphic-id="shape-duplicate"]')?.hasAttribute('data-selected')).toBe(false);
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
    expect(root.querySelector('[data-graphic-id="shape-first"]')?.getAttribute('data-selected')).toBe('true');
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements().map((element) => element.id)).toEqual(['shape-first', 'shape-second']);
    expect(root.querySelector('[data-graphic-id="shape-first"]')?.getAttribute('data-selected')).toBe('true');
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements().map((element) => element.id)).toEqual(['shape-second', 'shape-first']);
    expect(root.querySelector('[data-graphic-id="shape-first"]')?.getAttribute('data-selected')).toBe('true');
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

  it('renders the visual class according to the graphic kind', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({ id: 'shape-kind', kind: 'shape' }),
      createGraphicElement({ id: 'smartart-kind', kind: 'smartart', position: { x: 20, y: 20 } }),
    ]);

    expect(root.querySelector('[data-graphic-id="shape-kind"]')?.classList.contains('graphic-element-shape')).toBe(true);
    expect(root.querySelector('[data-graphic-id="smartart-kind"]')?.classList.contains('graphic-element-smartart')).toBe(true);
  });

  it('rotates the selected element through the rotation handle and supports undo/redo', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({
        id: 'shape-rotate',
        kind: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
      }),
    ]);

    const node = root.querySelector<HTMLElement>('[data-graphic-id="shape-rotate"]');
    node?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 0 }));
    const rotateHandle = root.querySelector<HTMLElement>('[data-rotate-handle="shape-rotate"]');
    expect(rotateHandle).not.toBeNull();

    rotateHandle?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 50 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 100, clientY: 50 }));

    expect(interactions.getElements()[0]?.rotation).toBe(90);
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.rotation).toBe(0);
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()[0]?.rotation).toBe(90);
  });

  it('records resize changes in undo and redo history', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({
        id: 'shape-resize',
        kind: 'shape',
        size: { width: 100, height: 80 },
      }),
    ]);

    const node = root.querySelector<HTMLElement>('[data-graphic-id="shape-resize"]');
    node?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 80 }));
    const resizeHandle = root.querySelector<HTMLElement>('[data-resize-handle="shape-resize"]');
    expect(resizeHandle).not.toBeNull();

    resizeHandle?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 80 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 110 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 140, clientY: 110 }));

    expect(interactions.getElements()[0]?.size).toEqual({ width: 140, height: 110 });
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.size).toEqual({ width: 100, height: 80 });
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()[0]?.size).toEqual({ width: 140, height: 110 });
  });

  it('supports additive multi-selection and moves selected elements together', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({ id: 'multi-a', kind: 'shape', position: { x: 10, y: 10 } }),
      createGraphicElement({ id: 'multi-b', kind: 'shape', position: { x: 120, y: 20 } }),
    ]);

    root.querySelector<HTMLElement>('[data-graphic-id="multi-a"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    root.querySelector<HTMLElement>('[data-graphic-id="multi-b"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 120, clientY: 20, ctrlKey: true }),
    );

    expect(interactions.getSelectedIds()).toEqual(['multi-a', 'multi-b']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));

    expect(interactions.getElements().find((element) => element.id === 'multi-a')?.position).toEqual({ x: 20, y: 10 });
    expect(interactions.getElements().find((element) => element.id === 'multi-b')?.position).toEqual({ x: 130, y: 20 });
  });

  it('selects elements by marquee and supports group and ungroup undo/redo', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({ id: 'group-a', kind: 'shape', position: { x: 10, y: 10 }, size: { width: 50, height: 40 } }),
      createGraphicElement({ id: 'group-b', kind: 'shape', position: { x: 90, y: 20 }, size: { width: 50, height: 40 } }),
      createGraphicElement({ id: 'outside', kind: 'shape', position: { x: 220, y: 220 } }),
    ]);

    root.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 160, clientY: 100 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 160, clientY: 100 }));

    expect(interactions.getSelectedIds()).toEqual(['group-a', 'group-b']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, bubbles: true }));

    const grouped = interactions.getElements().filter((element) => element.id.startsWith('group-'));
    expect(grouped.every((element) => Boolean(element.groupId))).toBe(true);
    expect(grouped[0]?.groupId).toBe(grouped[1]?.groupId);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, shiftKey: true, bubbles: true }));
    expect(interactions.getElements().filter((element) => element.id.startsWith('group-')).every((element) => !element.groupId)).toBe(true);
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements().filter((element) => element.id.startsWith('group-')).every((element) => Boolean(element.groupId))).toBe(true);
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements().filter((element) => element.id.startsWith('group-')).every((element) => !element.groupId)).toBe(true);
  });

  it('resizes multiple selected elements as one bounding box', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({ id: 'resize-a', kind: 'shape', position: { x: 10, y: 10 }, size: { width: 40, height: 40 } }),
      createGraphicElement({ id: 'resize-b', kind: 'shape', position: { x: 90, y: 10 }, size: { width: 40, height: 40 } }),
    ]);

    root.querySelector<HTMLElement>('[data-graphic-id="resize-a"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    root.querySelector<HTMLElement>('[data-graphic-id="resize-b"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 90, clientY: 10, ctrlKey: true }),
    );

    const handle = root.querySelector<HTMLElement>('[data-resize-handle="resize-a"]');
    expect(handle).not.toBeNull();
    handle?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 130, clientY: 50 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 190, clientY: 70 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 190, clientY: 70 }));

    expect(interactions.getElements().find((element) => element.id === 'resize-a')?.size.width).toBe(60);
    expect(interactions.getElements().find((element) => element.id === 'resize-b')?.position.x).toBe(130);
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements().find((element) => element.id === 'resize-a')?.size.width).toBe(40);
  });

  it('edits, adds and removes SmartArt nodes with undo/redo', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'smartart-edit',
      kind: 'smartart',
      smartArt: {
        layout: 'process',
        nodes: [
          { id: 'node-a', text: 'Etapa A' },
          { id: 'node-b', text: 'Etapa B' },
        ],
      },
    })]);

    root.querySelector<HTMLElement>('[data-graphic-id="smartart-edit"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    root.querySelector<HTMLElement>('[data-smartart-node-id="node-a"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );

    expect(interactions.getSelectedSmartArtNodeId()).toBe('node-a');
    expect(interactions.editSelectedSmartArtNode('Etapa A atualizada')).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.nodes[0]?.text).toBe('Etapa A atualizada');
    expect(interactions.addSmartArtNode()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.nodes).toHaveLength(3);
    expect(interactions.removeSelectedSmartArtNode()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.nodes).toHaveLength(2);
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.nodes).toHaveLength(3);
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.nodes).toHaveLength(2);
  });

  it('adds hierarchy SmartArt nodes as children of the selected node', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'smartart-hierarchy',
      kind: 'smartart',
      smartArt: {
        layout: 'hierarchy',
        nodes: [{ id: 'root-node', text: 'Direção' }],
      },
    })]);

    root.querySelector<HTMLElement>('[data-graphic-id="smartart-hierarchy"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    root.querySelector<HTMLElement>('[data-smartart-node-id="root-node"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );

    expect(interactions.addSmartArtNode()).toBe(true);
    const nodes = interactions.getElements()[0]?.smartArt?.nodes ?? [];
    expect(nodes).toHaveLength(2);
    expect(nodes[1]?.parentId).toBe('root-node');
  });

  it('handles SmartArt editing no-op and invalid-selection cases', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });

    expect(interactions.editSelectedSmartArtNode('Texto')).toBe(false);
    expect(interactions.addSmartArtNode()).toBe(false);
    expect(interactions.removeSelectedSmartArtNode()).toBe(false);
    expect(interactions.setSelectedSmartArtLayout('cycle')).toBe(false);

    interactions.setElements([createGraphicElement({
      id: 'smartart-single',
      kind: 'smartart',
      smartArt: { layout: 'process', nodes: [{ id: 'only', text: 'Único' }] },
    })]);
    root.querySelector<HTMLElement>('[data-graphic-id="smartart-single"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );

    expect(interactions.editSelectedSmartArtNode('Único')).toBe(false);
    expect(interactions.removeSelectedSmartArtNode()).toBe(false);
    expect(interactions.setSelectedSmartArtLayout('process')).toBe(false);
  });

  it('changes the selected SmartArt layout and preserves the change through undo/redo', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'smartart-layout',
      kind: 'smartart',
      smartArt: {
        layout: 'process',
        nodes: [{ id: 'layout-node', text: 'Etapa' }],
      },
    })]);

    root.querySelector<HTMLElement>('[data-graphic-id="smartart-layout"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );

    expect(interactions.setSelectedSmartArtLayout('cycle')).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.layout).toBe('cycle');
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.layout).toBe('process');
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.layout).toBe('cycle');
  });


  it('preserves SmartArt content when duplicating the selected graphic', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'smartart-duplicate',
      kind: 'smartart',
      smartArt: {
        layout: 'hierarchy',
        nodes: [
          { id: 'root-node', text: 'Direção' },
          { id: 'child-node', text: 'Equipe', parentId: 'root-node' },
        ],
      },
    })]);

    root.querySelector<HTMLElement>('[data-graphic-id="smartart-duplicate"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );

    expect(interactions.duplicateSelected()).toBe(true);
    const duplicates = interactions.getElements().filter((element) => element.id !== 'smartart-duplicate');
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.kind).toBe('smartart');
    expect(duplicates[0]?.smartArt?.layout).toBe('hierarchy');
    expect(duplicates[0]?.smartArt?.nodes.map((node) => ({ text: node.text, parentId: node.parentId }))).toEqual([
      { text: 'Direção', parentId: undefined },
      { text: 'Equipe', parentId: 'root-node' },
    ]);
    expect(interactions.getSelectedIds()).toEqual([duplicates[0]!.id]);
  });

  it('preserves SmartArt node selection through layout and content history', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'smartart-history',
      kind: 'smartart',
      smartArt: {
        layout: 'hierarchy',
        nodes: [{ id: 'root-node', text: 'Direção' }],
      },
    })]);

    root.querySelector<HTMLElement>('[data-graphic-id="smartart-history"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    root.querySelector<HTMLElement>('[data-smartart-node-id="root-node"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );

    expect(interactions.getSelectedSmartArtNodeId()).toBe('root-node');
    expect(interactions.setSelectedSmartArtLayout('cycle')).toBe(true);
    expect(interactions.getSelectedSmartArtNodeId()).toBe('root-node');
    expect(interactions.editSelectedSmartArtNode('Direção atualizada')).toBe(true);
    expect(interactions.getSelectedSmartArtNodeId()).toBe('root-node');

    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.nodes[0]?.text).toBe('Direção');
    expect(interactions.getSelectedSmartArtNodeId()).toBe('root-node');
    expect(interactions.undo()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.layout).toBe('hierarchy');
    expect(interactions.getSelectedSmartArtNodeId()).toBe('root-node');
    expect(interactions.redo()).toBe(true);
    expect(interactions.getElements()[0]?.smartArt?.layout).toBe('cycle');
    expect(interactions.getSelectedSmartArtNodeId()).toBe('root-node');
  });

  it('keeps grouped SmartArt selected and editable after grouping and ungrouping', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([
      createGraphicElement({
        id: 'smartart-group',
        kind: 'smartart',
        smartArt: { layout: 'process', nodes: [{ id: 'node', text: 'Etapa' }] },
      }),
      createGraphicElement({ id: 'shape-group', kind: 'shape', position: { x: 220, y: 20 } }),
    ]);

    root.querySelector<HTMLElement>('[data-graphic-id="smartart-group"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    root.querySelector<HTMLElement>('[data-graphic-id="smartart-group"] [data-smartart-node-id="node"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    );
    root.querySelector<HTMLElement>('[data-graphic-id="shape-group"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 220, clientY: 20, ctrlKey: true }),
    );

    expect(interactions.groupSelected()).toBe(true);
    expect(interactions.getSelectedSmartArtNodeId()).toBe('node');
    expect(interactions.ungroupSelected()).toBe(true);
    expect(interactions.getSelectedSmartArtNodeId()).toBe('node');
  });

  it('renders hierarchy nodes by semantic parent levels', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'smartart-render-hierarchy', kind: 'smartart',
      smartArt: { layout: 'hierarchy', nodes: [
        { id: 'root', text: 'Root' },
        { id: 'child-a', text: 'Child A', parentId: 'root' },
        { id: 'child-b', text: 'Child B', parentId: 'root' },
        { id: 'grandchild', text: 'Grandchild', parentId: 'child-a' },
      ] },
    })]);
    const levels = [...root.querySelectorAll<HTMLElement>('[data-smartart-level]')];
    expect(levels).toHaveLength(3);
    expect([...levels[0]!.querySelectorAll('.smartart-node')].map((node) => node.textContent)).toEqual(['Root']);
    expect([...levels[1]!.querySelectorAll('.smartart-node')].map((node) => node.textContent)).toEqual(['Child A', 'Child B']);
    expect([...levels[2]!.querySelectorAll('.smartart-node')].map((node) => node.textContent)).toEqual(['Grandchild']);
  });

  it('keeps process and cycle layouts as ordered semantic node collections', () => {
    const root = document.createElement('article');
    const interactions = new GraphicElementInteractions(root, { onChange: vi.fn() });
    interactions.setElements([createGraphicElement({
      id: 'smartart-render-process', kind: 'smartart',
      smartArt: { layout: 'process', nodes: [
        { id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' },
      ] },
    })]);
    expect([...root.querySelectorAll('.smartart-process .smartart-node')].map((node) => node.textContent)).toEqual(['A', 'B', 'C']);
    root.querySelector<HTMLElement>('[data-graphic-id="smartart-render-process"]')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }),
    );
    expect(interactions.setSelectedSmartArtLayout('cycle')).toBe(true);
    expect([...root.querySelectorAll('.smartart-cycle .smartart-node')].map((node) => node.textContent)).toEqual(['A', 'B', 'C']);
  });

});
