import { afterEach, describe, expect, it, vi } from 'vitest';
import { getObservability, resetObservability } from '../../src/observability/Observability';

describe('Observability', () => {
  afterEach(() => {
    resetObservability();
    vi.restoreAllMocks();
  });

  it('emits structured JSON with operation, component, error name and stack', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    getObservability().captureError(new Error('Falha controlada'), {
      operation: 'export',
      component: 'PdfExporter',
      documentId: 'doc-123',
    });

    const entry = JSON.parse(errorSpy.mock.calls[0]?.[0] as string) as {
      timestamp: string;
      level: string;
      message: string;
      context: Record<string, unknown>;
    };

    expect(entry.timestamp).toBeTruthy();
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('Falha controlada');
    expect(entry.context.operation).toBe('export');
    expect(entry.context.component).toBe('PdfExporter');
    expect(entry.context.errorName).toBe('Error');
    expect(entry.context.stack).toContain('Error: Falha controlada');
  });

  it('redacts sensitive context keys and limits long strings', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    getObservability().log('error', 'x'.repeat(600), {
      token: 'private-value',
      nested: {
        content: '<p>documento confidencial</p>',
      },
      safe: 'y'.repeat(600),
    });

    const entry = JSON.parse(errorSpy.mock.calls[0]?.[0] as string) as {
      message: string;
      context: Record<string, unknown>;
    };

    expect(entry.message).toHaveLength(501);
    expect(entry.message.endsWith('…')).toBe(true);
    expect(entry.context.token).toBe('[REDACTED]');
    expect(entry.context.nested).toEqual({ content: '[REDACTED]' });
    expect(entry.context.safe).toBe(`${'y'.repeat(500)}…`);
  });

  it('normalizes non-Error failures without serializing arbitrary object data', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    getObservability().captureError({ message: 'dados internos', privateValue: 'must-not-leak' }, {
      operation: 'load-layout-config',
      component: 'App',
    });

    const entry = JSON.parse(errorSpy.mock.calls[0]?.[0] as string) as {
      message: string;
      context: Record<string, unknown>;
    };

    expect(entry.message).toBe('Erro desconhecido');
    expect(entry.context.operation).toBe('load-layout-config');
    expect(entry.context.component).toBe('App');
    expect(JSON.stringify(entry)).not.toContain('must-not-leak');
  });
});
