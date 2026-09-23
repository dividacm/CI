import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutosaveController } from '../../src/storage/AutosaveController';
import type { CommunicationDocument } from '../../src/types/document';
import type { DocumentStorage } from '../../src/storage/DocumentStorage';

const document: CommunicationDocument = {
  id: 'doc-1',
  number: 0,
  year: 2026,
  fields: {},
  bodyHtml: '<p>Teste</p>',
  templateId: 'default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AutosaveController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('salva após o debounce', () => {
    const save = vi.fn();
    const storage: DocumentStorage = { load: vi.fn(), save, remove: vi.fn() };
    const status = vi.fn();
    const controller = new AutosaveController({ storage, delayMs: 300, onStatusChange: status });

    controller.markDirty(document);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(save).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it('tenta novamente com backoff quando o armazenamento falha', () => {
    const save = vi.fn()
      .mockImplementationOnce(() => { throw new Error('temporary'); })
      .mockImplementationOnce(() => { throw new Error('temporary'); })
      .mockImplementationOnce(() => undefined);
    const storage: DocumentStorage = { load: vi.fn(), save, remove: vi.fn() };
    const status = vi.fn();
    const controller = new AutosaveController({
      storage,
      delayMs: 300,
      retryDelaysMs: [250, 500],
      onStatusChange: status,
    });

    controller.markDirty(document);
    vi.advanceTimersByTime(300);
    expect(save).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenLastCalledWith('saving');

    vi.advanceTimersByTime(249);
    expect(save).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledTimes(3);
    expect(status).toHaveBeenLastCalledWith('saved');
  });

  it('marca erro após esgotar as tentativas', () => {
    const save = vi.fn().mockImplementation(() => { throw new Error('persistent'); });
    const storage: DocumentStorage = { load: vi.fn(), save, remove: vi.fn() };
    const status = vi.fn();
    const controller = new AutosaveController({
      storage,
      delayMs: 1,
      retryDelaysMs: [2, 4],
      onStatusChange: status,
    });

    controller.markDirty(document);
    vi.advanceTimersByTime(1 + 2 + 4);

    expect(save).toHaveBeenCalledTimes(3);
    expect(status).toHaveBeenLastCalledWith('error');
  });
});
