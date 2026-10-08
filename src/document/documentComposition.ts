import type { OrganizationConfig, TemplateConfig } from '../types/configuration';
import type { CommunicationDocument, DocumentComposition } from '../types/document';

export function createDocumentComposition(
  organization: OrganizationConfig,
  template: TemplateConfig,
): DocumentComposition {
  return {
    headerAsset: template.headerAsset ?? organization.branding.headerAsset,
    footerAsset: template.footerAsset ?? organization.branding.footerAsset,
    signatureName: organization.branding.signatureName,
    signatureRole: organization.branding.signatureRole,
    signatureLocation: organization.branding.signatureLocation,
  };
}

export function ensureDocumentComposition(
  document: CommunicationDocument,
  organization: OrganizationConfig,
  template: TemplateConfig,
): boolean {
  if (document.composition) return false;

  document.composition = createDocumentComposition(organization, template);
  document.updatedAt = new Date().toISOString();
  return true;
}
