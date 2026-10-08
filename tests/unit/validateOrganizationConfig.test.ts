import { describe, expect, it } from 'vitest';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';
import { validateOrganizationConfig } from '../../src/configuration/validateOrganizationConfig';

describe('validateOrganizationConfig', () => {
  it('accepts the default organization configuration', () => {
    expect(validateOrganizationConfig(defaultOrganization)).toBe(true);
  });

  it('rejects a missing default template', () => {
    const configuration = {
      ...defaultOrganization,
      defaultTemplateId: 'missing',
    };

    expect(validateOrganizationConfig(configuration)).toBe(false);
  });

  it('rejects duplicate template ids', () => {
    const configuration = {
      ...defaultOrganization,
      templates: [...defaultOrganization.templates, defaultOrganization.templates[0]],
    };

    expect(validateOrganizationConfig(configuration)).toBe(false);
  });

  it('rejects invalid page margins', () => {
    const configuration = {
      ...defaultOrganization,
      layout: {
        ...defaultOrganization.layout,
        marginTopMm: Number.NaN,
      },
    };

    expect(validateOrganizationConfig(configuration)).toBe(false);
  });

  it('rejects invalid field definitions', () => {
    const configuration = {
      ...defaultOrganization,
      templates: [
        {
          ...defaultOrganization.templates[0],
          fields: [
            {
              ...defaultOrganization.templates[0].fields[0],
              required: 'yes',
            },
          ],
        },
      ],
    };

    expect(validateOrganizationConfig(configuration)).toBe(false);
  });

  it('rejects non-object input safely', () => {
    expect(validateOrganizationConfig(null)).toBe(false);
    expect(validateOrganizationConfig('organization')).toBe(false);
  });
});
