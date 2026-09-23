import { afterEach, describe, expect, it, vi } from 'vitest';
import { getObservability, setObservability } from '../../src/observability/Observability';

describe('Observability', () => {
  afterEach(() => {
    setObservability({
      log: vi.fn(),
      captureError: vi.fn(),
    });
  });

  it('registra erros com contexto e stack sem incluir dados do documento', () => {
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
});
