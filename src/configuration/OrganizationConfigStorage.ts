import { validateOrganizationConfig } from './validateOrganizationConfig';
import type { OrganizationConfig } from '../types/configuration';

const STORAGE_PREFIX = 'ci:organization-config:';
const CURRENT_SCHEMA_VERSION = 1;

interface PersistedOrganizationConfig {
  schemaVersion: number;
  organization: OrganizationConfig;
}

export class OrganizationConfigStorage {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(organizationId: string): OrganizationConfig | null {
    const raw = this.storage.getItem(this.key(organizationId));
    if (!raw) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      const migrated = migratePersistedConfig(parsed);

      if (!migrated || !validateOrganizationConfig(migrated)) {
        this.clear(organizationId);
        return null;
      }

      return structuredClone(migrated);
    } catch {
      this.clear(organizationId);
      return null;
    }
  }

  save(organization: OrganizationConfig): boolean {
    if (!validateOrganizationConfig(organization)) return false;

    const payload: PersistedOrganizationConfig = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      organization: structuredClone(organization),
    };

    try {
      this.storage.setItem(
        this.key(organization.id),
        JSON.stringify(payload),
      );
      return true;
    } catch {
      return false;
    }
  }

  clear(organizationId: string): void {
    this.storage.removeItem(this.key(organizationId));
  }

  private key(organizationId: string): string {
    return `${STORAGE_PREFIX}${organizationId}`;
  }
}

function migratePersistedConfig(value: unknown): OrganizationConfig | null {
  if (!isRecord(value)) return null;

  if (value.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return isRecord(value.organization)
      ? (value.organization as OrganizationConfig)
      : null;
  }

  if (value.schemaVersion === undefined && validateOrganizationConfig(value)) {
    return value;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
