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
      headerAsset: '/assets/cab.png',
      footerAsset: '/assets/rodape.png',
    },
  ],
  features: {
    pdfExport: true,
    autosave: true,
    history: true,
    clipboardFormatting: false,
  },
};
