import { beforeEach, describe, expect, it } from 'vitest';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';
import { OrganizationConfigStorage } from '../../src/configuration/OrganizationConfigStorage';

const organizationConfigKey = `ci:organization-config:${defaultOrganization.id}`;

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('OrganizationConfigStorage', () => {
  let storage: MemoryStorage;
  let repository: OrganizationConfigStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new OrganizationConfigStorage(storage);
  });

  it('persists and restores a validated organization config', () => {
    expect(repository.save(defaultOrganization)).toBe(true);

    const loaded = repository.load(defaultOrganization.id);

    expect(loaded).toEqual(defaultOrganization);
    expect(loaded).not.toBe(defaultOrganization);
  });

  it('rejects invalid configurations before persistence', () => {
    const invalid = {
      ...defaultOrganization,
      defaultTemplateId: 'missing',
    };

    expect(repository.save(invalid)).toBe(false);
    expect(repository.load(defaultOrganization.id)).toBeNull();
  });

  it('migrates a legacy unversioned configuration', () => {
    storage.setItem(
      organizationConfigKey,
      JSON.stringify(defaultOrganization),
    );

    expect(repository.load(defaultOrganization.id)).toEqual(defaultOrganization);
  });

  it('rejects unsupported schema versions and clears the corrupt entry', () => {
    storage.setItem(
      organizationConfigKey,
      JSON.stringify({
        schemaVersion: 999,
        organization: defaultOrganization,
      }),
    );

    expect(repository.load(defaultOrganization.id)).toBeNull();
    expect(storage.getItem(organizationConfigKey)).toBeNull();
  });

  it('clears an invalid persisted payload instead of returning unsafe data', () => {
    storage.setItem(
      organizationConfigKey,
      JSON.stringify({
        schemaVersion: 1,
        organization: {
          ...defaultOrganization,
          templates: [],
        },
      }),
    );

    expect(repository.load(defaultOrganization.id)).toBeNull();
    expect(storage.getItem(organizationConfigKey)).toBeNull();
  });
});
