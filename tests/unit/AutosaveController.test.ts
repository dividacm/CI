import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutosaveController } from '../../src/storage/AutosaveController';
import type { DocumentStorage } from '../../src/storage/DocumentStorage';
import type { CommunicationDocument, DocumentStatus } from '../../src/types/document';

function createDocument(): CommunicationDocument {
  return {
    id: 'doc-1',
    number: 1,
    year: 2026,
    from: 'Origem',
    to: 'Destino',
    subject: 'Assunto',
    bodyHtml: '<p>Texto</p>',
    templateId: 'template-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('AutosaveController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transiciona de dirty para saving e saved após o atraso', () => {
    const storage: DocumentStorage = { load: vi.fn(), save: vi.fn(), remove: vi.fn() };
    const statuses: DocumentStatus[] = [];
    const autosave = new AutosaveController({
      storage,
      delayMs: 300,
      onStatusChange: (status) => statuses.push(status),
    });
    const document = createDocument();

    autosave.markDirty(document);
    expect(statuses).toEqual(['dirty']);
    expect(storage.save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(storage.save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(statuses).toEqual(['dirty', 'saving', 'saved']);
    expect(storage.save).toHaveBeenCalledWith(document);
  });

  it('reinicia o debounce quando uma nova alteração chega', () => {
    const storage: DocumentStorage = { load: vi.fn(), save: vi.fn(), remove: vi.fn() };
    const autosave = new AutosaveController({ storage, delayMs: 300 });
    const document = createDocument();

    autosave.markDirty(document);
    vi.advanceTimersByTime(200);
    autosave.markDirty(document);
    vi.advanceTimersByTime(299);
    expect(storage.save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(storage.save).toHaveBeenCalledTimes(1);
  });

  it('entra em error quando o storage falha', () => {
    const storage: DocumentStorage = {
      load: vi.fn(),
      save: vi.fn(() => {
        throw new Error('storage unavailable');
      }),
      remove: vi.fn(),
    };
    const statuses: DocumentStatus[] = [];
    const autosave = new AutosaveController({
      storage,
      delayMs: 300,
      retryDelaysMs: [],
      onStatusChange: (status) => statuses.push(status),
    });
    const document = createDocument();

    autosave.markDirty(document);
    vi.advanceTimersByTime(300);

    expect(statuses).toEqual(['dirty', 'saving', 'error']);
    expect(storage.save).toHaveBeenCalledWith(document);
  });

  it('saveNow salva imediatamente e cancela o timer pendente', () => {
    const storage: DocumentStorage = { load: vi.fn(), save: vi.fn(), remove: vi.fn() };
    const statuses: DocumentStatus[] = [];
    const autosave = new AutosaveController({
      storage,
      delayMs: 300,
      onStatusChange: (status) => statuses.push(status),
    });
    const document = createDocument();

    autosave.markDirty(document);
    autosave.saveNow();
    vi.advanceTimersByTime(300);

    expect(storage.save).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(['dirty', 'saving', 'saved']);
  });

  it('dispose cancela o autosave pendente', () => {
    const storage: DocumentStorage = { load: vi.fn(), save: vi.fn(), remove: vi.fn() };
    const autosave = new AutosaveController({ storage, delayMs: 300 });
    const document = createDocument();

    autosave.markDirty(document);
    autosave.dispose();
    vi.advanceTimersByTime(300);

    expect(storage.save).not.toHaveBeenCalled();
  });
});
