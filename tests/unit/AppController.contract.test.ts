import { describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from '../../src/app/bootstrap';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';

describe('bootstrapApp', () => {
  it('starts the editor when the organization configuration is valid', () => {
    const root = document.createElement('div');
    const render = vi.fn();

    expect(bootstrapApp(root, defaultOrganization, render)).toBe(true);
    expect(render).toHaveBeenCalledWith(root, defaultOrganization);
  });

  it('rejects invalid configuration before rendering', () => {
    const root = document.createElement('div');
    const render = vi.fn();

    expect(bootstrapApp(root, { ...defaultOrganization, defaultTemplateId: 'missing' }, render)).toBe(false);
    expect(render).not.toHaveBeenCalled();
  });

  it('converts render failures into a controlled bootstrap failure', () => {
    const root = document.createElement('div');
    const render = vi.fn(() => {
      throw new Error('render failure');
    });

    expect(bootstrapApp(root, defaultOrganization, render)).toBe(false);
  });
});
