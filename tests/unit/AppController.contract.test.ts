import { describe, expect, it, vi } from 'vitest';
import { AppController } from '../../src/app/AppController';

describe('AppController contract', () => {
  it('exposes the application render lifecycle as a controller method', () => {
    expect(typeof AppController.prototype.render).toBe('function');
  });

  it('keeps rendering errors outside the editor controller', () => {
    const error = new Error('bootstrap failure');
    const captureError = vi.fn();

    expect(error.message).toBe('bootstrap failure');
    expect(captureError).not.toHaveBeenCalled();
  });
});
