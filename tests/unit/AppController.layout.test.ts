import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applySavedLayoutConfig,
  clampMargin,
  persistLayoutConfig,
} from '../../src/app/AppController';
import { defaultOrganization } from '../../src/configuration/defaultOrganization';

describe('AppController layout configuration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('clamps margins to the supported range and handles non-finite values', () => {
    expect(clampMargin(Number.NaN)).toBe(20);
    expect(clampMargin(Number.POSITIVE_INFINITY)).toBe(20);
    expect(clampMargin(-12)).toBe(0);
    expect(clampMargin(75)).toBe(60);
    expect(clampMargin(12.6)).toBe(13);
  });

  it('does nothing when there is no saved layout configuration', () => {
    const organization = structuredClone(defaultOrganization);
    const originalLayout = structuredClone(organization.layout);

    applySavedLayoutConfig(organization);

    expect(organization.layout).toEqual(originalLayout);
  });

  it('loads valid margins and branding assets while ignoring invalid margin values', () => {
    const organization = structuredClone(defaultOrganization);
    localStorage.setItem('ci:layout-config', JSON.stringify({
      marginTopMm: 8.6,
      marginRightMm: 100,
      marginBottomMm: 'invalid',
      marginLeftMm: -4,
      headerAsset: '/assets/header.png',
      footerAsset: '',
      unrelatedSetting: true,
    }));

    applySavedLayoutConfig(organization);

    expect(organization.layout.marginTopMm).toBe(9);
    expect(organization.layout.marginRightMm).toBe(60);
    expect(organization.layout.marginBottomMm).toBe(defaultOrganization.layout.marginBottomMm);
    expect(organization.layout.marginLeftMm).toBe(0);
    expect(organization.branding.headerAsset).toBe('/assets/header.png');
    expect(organization.branding.footerAsset).toBeUndefined();
  });

  it('removes malformed saved configuration after reporting the parse error', () => {
    const organization = structuredClone(defaultOrganization);
    localStorage.setItem('ci:layout-config', '{invalid json');

    expect(() => applySavedLayoutConfig(organization)).not.toThrow();
    expect(localStorage.getItem('ci:layout-config')).toBeNull();
  });

  it('persists margins and header/footer assets as a single layout configuration', () => {
    const organization = structuredClone(defaultOrganization);
    organization.layout.marginTopMm = 17;
    organization.branding.headerAsset = '/assets/header.png';
    organization.branding.footerAsset = undefined;

    persistLayoutConfig(organization);

    expect(JSON.parse(localStorage.getItem('ci:layout-config') ?? '{}')).toMatchObject({
      marginTopMm: 17,
      headerAsset: '/assets/header.png',
      footerAsset: '',
    });
  });
});
