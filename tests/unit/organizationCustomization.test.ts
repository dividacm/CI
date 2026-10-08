import { describe, expect, it } from 'vitest';
import { bootstrapApp } from '../../src/app/bootstrap';
import { createDocumentComposition } from '../../src/document/documentComposition';
import type { OrganizationConfig } from '../../src/types/configuration';

const secondOrganization: OrganizationConfig = {
  id: 'org-exemplo',
  name: 'Órgão Exemplo',
  branding: {
    organizationName: 'Órgão Exemplo',
    primaryColor: '#7a1f1f',
    secondaryColor: '#f6eaea',
    fontFamily: 'Arial, sans-serif',
    headerAsset: '/assets/org-exemplo/header.png',
    footerAsset: '/assets/org-exemplo/footer.png',
    signatureName: 'MARIA EXEMPLO',
    signatureRole: 'Diretora Administrativa',
    signatureLocation: 'Órgão Exemplo',
  },
  layout: {
    marginTopMm: 12,
    marginRightMm: 18,
    marginBottomMm: 22,
    marginLeftMm: 18,
  },
  defaultTemplateId: 'memorando',
  templates: [
    {
      id: 'memorando',
      name: 'Memorando',
      description: 'Modelo institucional da organização de exemplo.',
      fields: [
        { id: 'from', label: 'De', required: true, defaultValue: 'Diretoria Administrativa' },
        { id: 'to', label: 'Para', required: true, defaultValue: 'Setor destinatário' },
        { id: 'subject', label: 'Assunto', required: true, defaultValue: 'Assunto institucional' },
      ],
      headerAsset: '/assets/org-exemplo/header.png',
      footerAsset: '/assets/org-exemplo/footer.png',
    },
  ],
  features: {
    pdfExport: true,
    autosave: true,
    history: true,
    clipboardFormatting: true,
  },
};

describe('organization customization acceptance', () => {
  it('bootstraps a second organization without editor-core changes', () => {
    const root = document.createElement('div');
    let received: OrganizationConfig | undefined;

    const started = bootstrapApp(root, secondOrganization, (_root, organization) => {
      received = organization;
    });

    expect(started).toBe(true);
    expect(received?.id).toBe('org-exemplo');
    expect(received?.defaultTemplateId).toBe('memorando');
    expect(received?.templates[0]?.name).toBe('Memorando');
  });

  it('builds document composition entirely from organization and template config', () => {
    const template = secondOrganization.templates[0]!;

    expect(createDocumentComposition(secondOrganization, template)).toEqual({
      headerAsset: '/assets/org-exemplo/header.png',
      footerAsset: '/assets/org-exemplo/footer.png',
      signatureName: 'MARIA EXEMPLO',
      signatureRole: 'Diretora Administrativa',
      signatureLocation: 'Órgão Exemplo',
    });
  });
});
