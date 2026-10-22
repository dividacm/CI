import { describe, expect, it } from 'vitest';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';
import { createDocument } from '../../src/document/createDocument';
import { createDocumentComposition, ensureDocumentComposition } from '../../src/document/documentComposition';
import type { TemplateConfig } from '../../src/types/configuration';

describe('document composition', () => {
  it('snapshots template assets and organization signature data', () => {
    const baseTemplate = defaultOrganization.templates[0];
    if (!baseTemplate) throw new Error('Modelo padrão não encontrado.');
    const template: TemplateConfig = {
      ...baseTemplate,
      headerAsset: '/assets/template-header.png',
      footerAsset: '/assets/template-footer.png',
    };

    expect(createDocumentComposition(defaultOrganization, template)).toEqual({
      headerAsset: '/assets/template-header.png',
      footerAsset: '/assets/template-footer.png',
      signatureName: 'NOME FICTÍCIO',
      signatureRole: 'Cargo de demonstração',
      signatureLocation: 'Cidade de exemplo',
    });
  });

  it('does not replace an existing document composition', () => {
    const template = defaultOrganization.templates[0];
    if (!template) throw new Error('Modelo padrão não encontrado.');
    const document = createDocument({
      template,
      number: 0,
      year: 2026,
      composition: {
        headerAsset: '/legacy/header.png',
        signatureName: 'Assinatura histórica',
      },
    });
    const updatedAt = document.updatedAt;

    expect(ensureDocumentComposition(document, defaultOrganization, template)).toBe(false);
    expect(document.composition).toEqual({
      headerAsset: '/legacy/header.png',
      signatureName: 'Assinatura histórica',
    });
    expect(document.updatedAt).toBe(updatedAt);
  });

  it('hydrates a legacy document once without changing its content', () => {
    const template = defaultOrganization.templates[0]!;
    const document = createDocument({ template, number: 0, year: 2026 });
    const originalFields = { ...document.fields };
    const originalBody = document.bodyHtml;

    expect(ensureDocumentComposition(document, defaultOrganization, template)).toBe(true);
    expect(document.composition?.headerAsset).toBeUndefined();
    expect(document.composition?.footerAsset).toBeUndefined();
    expect(document.composition?.signatureName).toBe('NOME FICTÍCIO');
    expect(document.fields).toEqual(originalFields);
    expect(document.bodyHtml).toBe(originalBody);
  });
});
