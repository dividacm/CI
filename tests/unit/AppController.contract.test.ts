import { describe, expect, it } from 'vitest';
import { AppController } from '../../src/app/AppController';

describe('AppController contract', () => {
  it('exposes the application render lifecycle as a controller method', () => {
    expect(typeof AppController.prototype.render).toBe('function');
  });
});
