export interface PageLayoutConfig {
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
}

export interface BrandingConfig {
  organizationName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headerAsset?: string;
  footerAsset?: string;
  signatureName?: string;
  signatureRole?: string;
  signatureLocation?: string;
}

export interface FieldConfig {
  id: string;
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description?: string;
  fields: FieldConfig[];
  headerAsset?: string;
  footerAsset?: string;
}

export interface FeatureFlags {
  pdfExport: boolean;
  autosave: boolean;
  history: boolean;
  clipboardFormatting: boolean;
}

export interface DemoNoticeConfig {
  enabled: boolean;
  title: string;
  message: string;
}

export interface OrganizationConfig {
  id: string;
  name: string;
  branding: BrandingConfig;
  layout: PageLayoutConfig;
  defaultTemplateId: string;
  templates: TemplateConfig[];
  features: FeatureFlags;
  /** Aviso informativo de demonstração; não é um controle de segurança. */
  demoNotice?: DemoNoticeConfig;
}
