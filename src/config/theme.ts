export const MOBILE_BREAKPOINT = 768;

interface RadiusRange {
  min: number;
  max: number;
}

interface LinkWidthRange {
  min: number;
  max: number;
}

interface LinkDistanceRange {
  min: number;
  max: number;
}

export interface ColorsConfig {
  background: string;
  platform: string;
  buildingBlock: string;
  link: string;
  linkHover: string;
  ring: string;
  text: string;
  accent: string;
  highlightFill: string;
  shadow: string;
}

export interface FontsConfig {
  family: string;
  familyCondensed: string;
  familyMono: string;
  normal: number;
  bold: number;
  baseSizePlatform: number;
  baseSizeBuildingBlock: number;
}

export interface SizesConfig {
  defaultCanvas: number;
  platformRadius: RadiusRange;
  buildingBlockRadius: RadiusRange;
  linkWidth: LinkWidthRange;
  linkDistance: LinkDistanceRange;
}

export interface LayoutConfig {
  innerRadiusFactor: number;
  ringNodePadding: number;
  maxPlatformLabelWidth: number;
  defaultSize: number;
  linkDistanceDomain: [number, number];
  linkWidthDomain: [number, number];
  bboxPadding: number;
  centralChargeStrength: number;
  centralLinkMultiplier: number;
  centralCollideStrength: number;
  ringWidthMultiplier: number;
  absoluteMinRingRadius: number;
  minRadiusPerPlatform: number;
}

export interface ThemeConfig {
  colors: ColorsConfig;
  fonts: FontsConfig;
  sizes: SizesConfig;
  layout: LayoutConfig;
}

/**
 * "ESA mission-control": deep space navy background, cyan (platforms) +
 * amber (Building Blocks) accents, evoking mission-ops telemetry displays
 * without copying any specific agency's branding.
 */
export const COLORS: ColorsConfig = {
  background: '#0A1128',
  platform: '#22D3EE',
  buildingBlock: '#F5A623',
  link: 'rgba(148, 197, 214, 0.22)',
  linkHover: 'rgba(245, 166, 35, 0.75)',
  ring: 'rgba(148, 197, 214, 0.35)',
  text: '#E6EDF3',
  accent: '#F5A623',

  highlightFill: '#F5A62330',
  shadow: '#0A1128',
};

export interface BrandingColors {
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
}

export function applyBranding(branding: BrandingColors): void {
  if (branding.primary_color) {
    COLORS.buildingBlock = branding.primary_color;
    COLORS.accent = branding.primary_color;
    COLORS.highlightFill = branding.primary_color + '30';
  }
  if (branding.secondary_color) {
    COLORS.platform = branding.secondary_color;
  }
  if (branding.text_color) {
    COLORS.text = branding.text_color;
  }
  if (branding.background_color) {
    COLORS.background = branding.background_color;
    COLORS.shadow = branding.background_color;
  }
}

export const FONTS: FontsConfig = {
  family: 'Roboto',
  familyCondensed: 'Roboto Condensed',
  familyMono: 'Fira Code',

  normal: 400,
  bold: 700,

  baseSizePlatform: 14,
  baseSizeBuildingBlock: 13,
};

// Tuned for ~10-20 platforms / 40-70 Building Blocks — far fewer nodes than
// the GitHub-scale original (dozens of contributors, hundreds of repos), so
// radii and canvas scale are pulled in to avoid a sparse, oversized ring.
export const SIZES: SizesConfig = {
  defaultCanvas: 900,

  platformRadius: { min: 12, max: 30 },
  buildingBlockRadius: { min: 8, max: 20 },

  linkWidth: { min: 1, max: 3 },
  linkDistance: { min: 12, max: 70 },
};

export const LAYOUT: LayoutConfig = {
  innerRadiusFactor: 0.75,

  ringNodePadding: 26,
  maxPlatformLabelWidth: 90,

  defaultSize: 900,

  linkDistanceDomain: [1, 20],
  linkWidthDomain: [1, 10],

  bboxPadding: 4,

  centralChargeStrength: -260,
  centralLinkMultiplier: 9,
  centralCollideStrength: 0.85,

  ringWidthMultiplier: 2.3,
  absoluteMinRingRadius: 170,
  minRadiusPerPlatform: 24,
};

export const THEME: ThemeConfig = {
  colors: COLORS,
  fonts: FONTS,
  sizes: SIZES,
  layout: LAYOUT,
};

export default THEME;
