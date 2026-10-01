import { describe, expect, it, vi } from 'vitest';
import { GraphicConnectorInteractions } from '../../src/graphics/GraphicConnectorInteractions';
import { createGraphicElement } from '../../src/graphics/GraphicElementModel';

describe('GraphicConnectorInteractions', () => {
  function setup() {
    const root = document.createElement('article');
    const elements = [
      createGraphicElement({ id: 'from', kind: 'shape', position: { x: 10, y: 20 }, size: { width: 100, height: 60 } }),
      createGraphicElement({ id: 'to', kind: 'shape', position: { x: 220, y: 80 }, size: { width: 100, height: 60 } }),
    ];
    const onChange = vi.fn();
    const interactions = new GraphicConnectorInteractions(root, {
      getElements: () => elements,
      onChange,
    });
    interactions.setElements(elements);
    return { root, elements, interactions, onChange };
  }

  it('creates a connector between two graphic elements and renders an arrow', () => {
    const { root, interactions, onChange } = setup();

    expect(interactions.connect('from', 'to')).toBe(true);
    expect(interactions.getConnectors()).toHaveLength(1);
    expect(interactions.getConnectors()[0]).toMatchObject({ fromId: 'from', toId: 'to', type: 'straight' });
    expect(root.querySelector('[data-connector-id="')) .not.toBeNull();
    expect(root.querySelector('.graphic-connector')).not.toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicates and self connections', () => {
    const { interactions } = setup();

    expect(interactions.connect('from', 'from')).toBe(false);
    expect(interactions.connect('from', 'to')).toBe(true);
    expect(interactions.connect('to', 'from')).toBe(false);
    expect(interactions.getConnectors()).toHaveLength(1);
  });

  it('selects and deletes a connector', () => {
    const { root, interactions } = setup();
    expect(interactions.connect('from', 'to')).toBe(true);

    root.querySelector<SVGLineElement>('.graphic-connector')?.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 60 }),
    );

    expect(interactions.hasSelection()).toBe(true);
    expect(interactions.deleteSelected()).toBe(true);
    expect(interactions.getConnectors()).toHaveLength(0);
  });

  it('undoes and redoes connector creation', () => {
    const { interactions } = setup();
    interactions.connect('from', 'to');

    expect(interactions.undo()).toBe(true);
    expect(interactions.getConnectors()).toHaveLength(0);
    expect(interactions.redo()).toBe(true);
    expect(interactions.getConnectors()).toHaveLength(1);
  });

  it('re-renders endpoints when graphic positions change', () => {
    const { root, elements, interactions } = setup();
    interactions.connect('from', 'to');
    const line = root.querySelector<SVGLineElement>('.graphic-connector');
    expect(line?.getAttribute('x1')).toBe('60');
    elements[1]!.position.x = 320;
    interactions.setElements(elements);
    expect(line?.getAttribute('x2')).toBe('370');
  });
});
