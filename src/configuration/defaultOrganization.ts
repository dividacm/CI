import type { OrganizationConfig } from '../types/configuration';

export const defaultOrganization: OrganizationConfig = {
  id: 'demo',
  name: 'Demonstração — Comunicação Interna',
  branding: {
    organizationName: 'Organização de demonstração',
    primaryColor: '#1f4e79',
    secondaryColor: '#e8eef5',
    fontFamily: 'Carlito, Arial, sans-serif',
    signatureName: 'NOME FICTÍCIO',
    signatureRole: 'Cargo de demonstração',
    signatureLocation: 'Cidade de exemplo',
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
          defaultValue: 'Setor de demonstração',
        },
        {
          id: 'to',
          label: 'Para',
          required: true,
          defaultValue: 'Destinatário fictício',
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
  demoNotice: {
    enabled: true,
    title: 'Demonstração pública',
    message: 'Use somente dados fictícios. Não insira documentos reais, dados pessoais ou informações institucionais reservadas. Os documentos são salvos localmente neste navegador; esta demonstração não oferece autenticação nem controle de acesso.',
  },
  features: {
    pdfExport: true,
    autosave: true,
    history: true,
    clipboardFormatting: false,
  },
};
