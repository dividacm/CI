import { describe, expect, it } from 'vitest';
import { renderShell } from '../../src/app/AppView';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';

describe('template selection shell', () => {
  it('renders the configured templates and marks the active template', () => {
    const organization = {
      ...defaultOrganization,
      templates: [
        ...defaultOrganization.templates,
        {
          id: 'memorando',
          name: 'Memorando',
          fields: [],
        },
      ],
    };

    const shell = renderShell(organization, organization.templates[0]);

    expect(shell).toContain('id="template-selector"');
    expect(shell).toContain('value="comunicacao-interna-v2" selected');
    expect(shell).toContain('value="memorando"');
  });
});
