import { describe, expect, it } from 'vitest';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';
import { resolveTemplate } from '../../src/configuration/resolveTemplate';

describe('configuration', () => {
  it('expõe uma organização padrão completa', () => {
    expect(defaultOrganization.id).toBe('dividacm');
    expect(defaultOrganization.templates).toHaveLength(1);
    expect(defaultOrganization.features.pdfExport).toBe(true);
    expect(defaultOrganization.branding.headerAsset).toBe('/assets/cab.png');
  });

  it('resolve o template padrão e rejeita ids inexistentes', () => {
    expect(resolveTemplate(defaultOrganization).id).toBe('comunicacao-interna-v2');
    expect(resolveTemplate(defaultOrganization, 'comunicacao-interna-v2').name).toBe('Comunicação Interna');
    expect(() => resolveTemplate(defaultOrganization, 'missing')).toThrow('Template "missing" não encontrado.');
  });
});
