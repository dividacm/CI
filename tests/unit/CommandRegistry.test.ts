import { describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from '../../src/app/CommandRegistry';

describe('CommandRegistry', () => {
  it('registers and executes a command', async () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    registry.register('bold', handler);

    await expect(registry.execute('bold')).resolves.toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('returns false for unknown or missing commands', async () => {
    const registry = new CommandRegistry();

    await expect(registry.execute('missing')).resolves.toBe(false);
    await expect(registry.execute(undefined)).resolves.toBe(false);
  });
});
