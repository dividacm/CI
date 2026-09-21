import type { OrganizationConfig } from '../types/configuration';

export const defaultOrganization: OrganizationConfig = {
  id: 'dividacm',
  name: 'Comunicação Interna',
  branding: {
    organizationName: 'Comunicação Interna',
    primaryColor: '#1f4e79',
    secondaryColor: '#e8eef5',
    fontFamily: 'Carlito, Arial, sans-serif',
    headerAsset: '/assets/cab.png',
    footerAsset: '/assets/rodape.png',
    signatureName: 'CRISTIANE SCHWARZ',
    signatureRole: 'Gerente de Valores em Carteira e Cobrança',
    signatureLocation: 'Campo Mourão',
  },
  layout: {
    marginTopMm: 10,
    marginRightMm: 20,
    marginBottomMm: 20,
    marginLeftMm: 20,
  },
  defaultTemplateId: 'comunicacao-interna-v2',
  templates: [
    {
      id: 'comunicacao-interna-v2',
      name: 'Comunicação Interna',
      description: 'Modelo padrão para comunicados internos.',
      fields: [
        {
          id: 'from',
          label: 'De',
          required: true,
          defaultValue: 'Gerência de Valores em Carteira e Cobrança - GCCOB',
        },
        {
          id: 'to',
          label: 'Para',
          required: true,
          defaultValue: 'CRISTIANE SCHWARZ',
        },
        {
          id: 'subject',
          label: 'Assunto',
          required: true,
          placeholder: 'Informe o assunto da comunicação',
        },
      ],
    },
  ],
  features: {
    pdfExport: true,
    autosave: true,
    history: true,
    clipboardFormatting: false,
  },
};
