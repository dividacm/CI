import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getObservability,
  resetObservability,
  setObservability,
} from '../../src/observability/Observability';

describe('Observability', () => {
  afterEach(() => {
    resetObservability();
    vi.restoreAllMocks();
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

  it('sanitiza mensagens de erro não-Error e remove o conteúdo interno de markup', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    resetObservability();
    getObservability().captureError(
      'Falha <p>SENTINEL_DOCUMENT_CONTENT</p> token=segredo',
      { operation: 'load', component: 'Test' },
    );

    const serialized = consoleError.mock.calls[0][0] as string;
    const entry = JSON.parse(serialized) as { message: string };
    expect(entry.message).toContain('[REDACTED]');
    expect(entry.message).not.toContain('SENTINEL_DOCUMENT_CONTENT');
    expect(entry.message).not.toContain('segredo');
    expect(entry.message).not.toContain('<p>');
  });

  it('remove conteúdo marcado em mensagens e stack traces de erros Error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    resetObservability();
    const error = new Error('Falha ao salvar <article>SENTINEL_STACK_CONTENT</article>');
    error.stack = 'Error: <article>SENTINEL_STACK_CONTENT</article> token=stack-secret';
    getObservability().captureError(error, { operation: 'save', component: 'Test' });

    const serialized = consoleError.mock.calls[0][0] as string;
    expect(serialized).not.toContain('SENTINEL_STACK_CONTENT');
    expect(serialized).not.toContain('stack-secret');
    expect(serialized).toContain('[REDACTED]');
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
  });
});
