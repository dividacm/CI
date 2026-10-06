import { describe, expect, it } from 'vitest';
import { normalizeCommunicationDocument } from '../../src/document/normalizeDocument';

describe('normalizeCommunicationDocument', () => {
  it('normalizes a valid document and removes invalid graphics and connectors', () => {
    const normalized = normalizeCommunicationDocument({
      id: 'doc-1',
      number: 1,
      year: 2026,
      fields: { subject: 'Assunto', invalid: 42 },
      bodyHtml: '<p>Olá<script>alert(1)</script></p>',
      graphics: [
        {
          id: 'shape-1',
          kind: 'shape',
          position: { x: 10, y: 20 },
          size: { width: 100, height: 50 },
          rotation: 0,
          data: { text: 'Olá' },
        },
        {
          id: '',
          kind: 'shape',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 50 },
          rotation: 0,
          data: {},
        },
      ],
      connectors: [
        { id: 'connector-1', fromId: 'shape-1', toId: 'missing', type: 'straight' },
      ],
      templateId: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(normalized).toMatchObject({
      id: 'doc-1',
      fields: { subject: 'Assunto' },
      bodyHtml: '<p>Olá</p>',
      graphics: [{ id: 'shape-1' }],
      connectors: [],
    });
  });

  it('rejects malformed document identity and metadata', () => {
    expect(normalizeCommunicationDocument(null)).toBeNull();
    expect(normalizeCommunicationDocument({ id: '', number: 1, year: 2026 })).toBeNull();
    expect(
      normalizeCommunicationDocument({
        id: 'doc-1',
        number: -1,
        year: 2026,
        templateId: 'default',
        createdAt: 'now',
        updatedAt: 'now',
      }),
    ).toBeNull();
    expect(
      normalizeCommunicationDocument({
        id: 'doc-1',
        number: 1.5,
        year: 2026,
        templateId: 'default',
        createdAt: 'now',
        updatedAt: 'now',
      }),
    ).toBeNull();
  });

  it('preserves legacy fields when structured fields are absent', () => {
    expect(
      normalizeCommunicationDocument({
        id: 'legacy-1',
        number: 1,
        year: 2026,
        from: 'Origem',
        to: 'Destino',
        subject: 'Assunto',
        bodyHtml: '',
        templateId: 'default',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })?.fields,
    ).toEqual({
      from: 'Origem',
      to: 'Destino',
      subject: 'Assunto',
    });
  });
});
