import type { OrganizationConfig, TemplateConfig } from '../types/configuration';

export function resolveTemplate(
  organization: OrganizationConfig,
  templateId = organization.defaultTemplateId,
): TemplateConfig {
  const template = organization.templates.find((item) => item.id === templateId);

  if (!template) {
    throw new Error(`Template "${templateId}" não encontrado.`);
  }

  return template;
}
