import { describe, expect, it } from 'vitest';
import type { GraphicConnector } from '../../src/graphics/GraphicConnectorModel';
import type { GraphicElement } from '../../src/graphics/GraphicElementModel';
import { getPageMetrics, renderGraphicFlow } from '../../src/pagination/DocumentFlowRenderer';

const element = (id: string, y: number): GraphicElement => ({
  id, kind: 'shape', position: { x: 20, y }, size: { width: 100, height: 60 }, rotation: 0, data: { label: id },
});

describe('DocumentFlowRenderer', () => {
  it('renders elements only on their calculated page', () => {
    const root = document.createElement('div');
    const metrics = { contentWidthPx: 700, contentHeightPx: 500 };
    renderGraphicFlow(root, { elements: [element('p1', 20), element('p2', 520)], connectors: [], pageIndex: 1, metrics });
    expect(root.querySelectorAll('.paper-graphic-element')).toHaveLength(1);
    expect(root.querySelector<HTMLElement>('[data-graphic-id="p2"]')?.style.top).toBe('20px');
  });

  it('renders only connectors whose endpoints share the page', () => {
    const root = document.createElement('div');
    const metrics = { contentWidthPx: 700, contentHeightPx: 500 };
    const elements = [element('a', 20), element('b', 100), element('c', 520)];
    const connectors: GraphicConnector[] = [
      { id: 'same', fromId: 'a', toId: 'b', type: 'straight' },
      { id: 'cross', fromId: 'a', toId: 'c', type: 'straight' },
    ];
    renderGraphicFlow(root, { elements, connectors, pageIndex: 0, metrics });
    expect(root.querySelectorAll('.paper-graphic-connector')).toHaveLength(1);
  });

  it('derives A4 content metrics from the configured margins', () => {
    const metrics = getPageMetrics({ marginLeftMm: 10, marginRightMm: 10, marginTopMm: 10, marginBottomMm: 10 });
    expect(metrics.contentWidthPx).toBeCloseTo((210 - 20) * 96 / 25.4, 5);
    expect(metrics.contentHeightPx).toBeCloseTo((297 - 30 - 25 - 20) * 96 / 25.4, 5);
  });
});