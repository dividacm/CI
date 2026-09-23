import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getObservability,
  resetObservability,
  setObservability,
} from '../../src/observability/Observability';

describe('Observability', () => {
  afterEach(() => {
    resetObservability();
  });

  it('encaminha erros com contexto e preserva o stack para o sink configurado', () => {
    const captureError = vi.fn();
    const observability = { log: vi.fn(), captureError };
    setObservability(observability);

    const error = new Error('storage failed');
    getObservability().captureError(error, {
      operation: 'save',
      component: 'LocalStorageDocumentStorage',
      documentId: 'doc-1',
    });

    expect(captureError).toHaveBeenCalledWith(error, {
      operation: 'save',
      component: 'LocalStorageDocumentStorage',
      documentId: 'doc-1',
    });
  });

  it('redige contexto sensível e limita strings no logger padrão', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    resetObservability();
    getObservability().log('error', 'mensagem com dado'.repeat(100), {
      operation: 'save',
      bodyHtml: '<p>conteúdo do documento</p>',
      nested: {
        token: 'segredo',
        safe: 'ok',
      },
    });

    expect(consoleError).toHaveBeenCalledTimes(1);
    const serialized = consoleError.mock.calls[0][0] as string;
    const entry = JSON.parse(serialized) as {
      message: string;
      context: { bodyHtml: string; nested: { token: string; safe: string } };
    };

    expect(entry.message.length).toBeLessThanOrEqual(501);
    expect(entry.context.bodyHtml).toBe('[REDACTED]');
    expect(entry.context.nested.token).toBe('[REDACTED]');
    expect(entry.context.nested.safe).toBe('ok');

    consoleError.mockRestore();
  });
});
