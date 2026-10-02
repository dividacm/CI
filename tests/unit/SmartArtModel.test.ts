import { describe, expect, it } from 'vitest';
import { createSmartArt, normalizeSmartArt } from '../../src/graphics/SmartArtModel';

describe('SmartArtModel', () => {
  it('creates a process SmartArt with a default node', () => {
    const smartArt = createSmartArt();

    expect(smartArt.layout).toBe('process');
    expect(smartArt.nodes).toHaveLength(1);
    expect(smartArt.nodes[0]?.text).toBe('Ideia principal');
  });

  it('normalizes valid hierarchy nodes and removes orphan parent references', () => {
    const smartArt = normalizeSmartArt({
      layout: 'hierarchy',
      nodes: [
        { id: 'root', text: 'Direção' },
        { id: 'child', text: 'Equipe', parentId: 'root' },
        { id: 'orphan', text: 'Sem vínculo', parentId: 'missing' },
      ],
    });

    expect(smartArt).toEqual({
      layout: 'hierarchy',
      nodes: [
        { id: 'root', text: 'Direção' },
        { id: 'child', text: 'Equipe', parentId: 'root' },
        { id: 'orphan', text: 'Sem vínculo' },
      ],
    });
  });

  it('rejects invalid layouts and duplicate node ids', () => {
    expect(normalizeSmartArt({ layout: 'unknown', nodes: [] })).toBeNull();

    expect(normalizeSmartArt({
      layout: 'cycle',
      nodes: [
        { id: 'node', text: 'A' },
        { id: 'node', text: 'B' },
      ],
    })).toEqual({
      layout: 'cycle',
      nodes: [{ id: 'node', text: 'A' }],
    });
  });
});
