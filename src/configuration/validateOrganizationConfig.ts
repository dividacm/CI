import type { OrganizationConfig, TemplateConfig } from '../types/configuration';

export function validateOrganizationConfig(value: unknown): value is OrganizationConfig {
  if (!isRecord(value)) return false;

  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return false;
  if (!isBrandingConfig(value.branding) || !isPageLayoutConfig(value.layout)) return false;
  if (!isNonEmptyString(value.defaultTemplateId) || !Array.isArray(value.templates)) return false;
  if (!isFeatureFlags(value.features) || value.templates.length === 0) return false;

  const templateIds = new Set<string>();
  for (const template of value.templates) {
    if (!isTemplateConfig(template) || templateIds.has(template.id)) return false;
    templateIds.add(template.id);
  }

  return templateIds.has(value.defaultTemplateId);
}

function isBrandingConfig(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isNonEmptyString(value.organizationName) &&
    isNonEmptyString(value.primaryColor) &&
    isNonEmptyString(value.secondaryColor) &&
    isNonEmptyString(value.fontFamily) &&
    isOptionalString(value.headerAsset) &&
    isOptionalString(value.footerAsset) &&
    isOptionalString(value.signatureName) &&
    isOptionalString(value.signatureRole) &&
    isOptionalString(value.signatureLocation)
  );
}

function isPageLayoutConfig(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    isNonNegativeFiniteNumber(value.marginTopMm) &&
    isNonNegativeFiniteNumber(value.marginRightMm) &&
    isNonNegativeFiniteNumber(value.marginBottomMm) &&
    isNonNegativeFiniteNumber(value.marginLeftMm)
  );
}

function isTemplateConfig(value: unknown): value is TemplateConfig {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return false;
  if (!isOptionalString(value.description)) return false;
  if (!isOptionalString(value.headerAsset) || !isOptionalString(value.footerAsset)) return false;
  if (!Array.isArray(value.fields)) return false;

  return value.fields.every((field) => {
    if (!isRecord(field)) return false;

    return (
      isNonEmptyString(field.id) &&
      isNonEmptyString(field.label) &&
      typeof field.required === 'boolean' &&
      isOptionalString(field.placeholder) &&
      isOptionalString(field.defaultValue)
    );
  });
}

function isFeatureFlags(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    typeof value.pdfExport === 'boolean' &&
    typeof value.autosave === 'boolean' &&
    typeof value.history === 'boolean' &&
    typeof value.clipboardFormatting === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
