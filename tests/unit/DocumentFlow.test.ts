import { describe, expect, it } from 'vitest';
import { getConnectorsForPage, getGraphicPageIndex, placeGraphicElement } from '../../src/pagination/DocumentFlow';
import type { GraphicConnector } from '../../src/graphics/GraphicConnectorModel';
import type { GraphicElement } from '../../src/graphics/GraphicElementModel';

const metrics = {
  contentWidthPx: 700,
  contentHeightPx: 1000,
};

function element(id: string, x: number, y: number): GraphicElement {
  return {
    id,
    kind: 'shape',
    position: { x, y },
    size: { width: 180, height: 100 },
    rotation: 0,
    data: { label: id },
  };
}

describe('DocumentFlow', () => {
  it('places graphics on deterministic pages using their document y position', () => {
    const item = element('graphic-2', 760, 1120);

    expect(getGraphicPageIndex(item, metrics)).toBe(1);
    expect(placeGraphicElement(item, metrics)).toEqual({
      pageIndex: 1,
      x: 520,
      y: 120,
    });
  });

  it('keeps graphics inside the horizontal content bounds', () => {
    const item = element('graphic-1', -20, 40);

    expect(placeGraphicElement(item, metrics)).toEqual({
      pageIndex: 0,
      x: 0,
      y: 40,
    });
  });

  it('keeps connectors only when both endpoints belong to the same page', () => {
    const elements = [
      element('a', 40, 40),
      element('b', 300, 500),
      element('c', 40, 1040),
    ];
    const connectors: GraphicConnector[] = [
      { id: 'same-page', fromId: 'a', toId: 'b', type: 'straight' },
      { id: 'cross-page', fromId: 'a', toId: 'c', type: 'straight' },
    ];

    expect(getConnectorsForPage(connectors, elements, 0, metrics)).toEqual([connectors[0]]);
    expect(getConnectorsForPage(connectors, elements, 1, metrics)).toEqual([]);
  });
});
