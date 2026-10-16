/**
 * Platform Node Positioning Module
 *
 * Calculates the radius for the platform ring and positions platform nodes
 * in a circle around the viewport center (0, 0). The radius accounts for
 * both the platforms themselves (on the ring) and how much room the Building
 * Blocks will need in the center, so a data set with few platforms but many
 * (or long-named) Building Blocks still gets a ring big enough to avoid
 * them overlapping.
 *
 * @module layout/positioning
 */

import { TAU, PI, cos, sin, sqrt, max } from '../utils/helpers';
import { LAYOUT } from '../config/theme';
import { setBuildingBlockFont } from '../render/text';
import type { VisualizationNode, PlatformData } from '../types';

// Matches the (max_radius + 14) radial offset labels.ts translates platform
// labels outward by.
const LABEL_RADIAL_OFFSET = 14;
// platform_max_width underestimates the actual rendered label width — it's
// measured without the letter-spacing renderText adds per character, and
// doesn't account for the 1.25x width fudge factor used everywhere else
// text is sized in this codebase (see estimateContentRadius below,
// tooltip.ts, centralSimulation.ts). Empirically tuned against real,
// long platform names (e.g. "Digital Earth Canada") rather than derived —
// if labels start clipping again after a data or font change, this is the
// first constant to re-check.
const LABEL_FIT_PADDING = 180;

export interface PositioningData {
  nodes: VisualizationNode[];
}

export interface PositioningConfig {
  RING_NODE_PADDING: number;
  context: CanvasRenderingContext2D;
  INNER_RADIUS_FACTOR: number;
}

export interface PositioningResult {
  RADIUS_RING: number;
  RING_WIDTH: number;
}

/**
 * Estimate the minimum inner radius needed to fit all Building Block nodes
 * (with their always-on labels) without overlapping, by summing each
 * node's approximate on-screen footprint and inverting the area of a
 * circle. This is a packing *estimate*, not a guarantee — the force
 * simulation still does the actual layout — but without it the ring radius
 * would be sized purely off platform count, which has no relationship to
 * how much Building Block content needs to fit inside it.
 */
function estimateContentRadius(
  buildingBlockNodes: VisualizationNode[],
  context: CanvasRenderingContext2D,
  INNER_RADIUS_FACTOR: number,
): number {
  if (buildingBlockNodes.length === 0) return 0;

  setBuildingBlockFont(context, 1);

  let totalArea = 0;
  buildingBlockNodes.forEach((d) => {
    const textWidth = context.measureText(d.label).width * 1.25;
    const w = Math.max(d.r * 2, textWidth) + 14;
    const h = d.r * 2 + 26; // node diameter + label line above it
    totalArea += w * h;
  });

  // Rectangles of varying sizes never pack a circle at 100% density —
  // this factor trades some ring size for headroom the collide force can
  // actually resolve within its fixed tick budget.
  const PACKING_INEFFICIENCY = 2.4;
  const innerRadius = sqrt((totalArea * PACKING_INEFFICIENCY) / PI);

  return innerRadius / INNER_RADIUS_FACTOR;
}

/**
 * Position platform nodes in a ring around the viewport center (0, 0).
 *
 * This function:
 * - Calculates the optimal radius for the platform ring based on node sizes
 *   and how much room the Building Blocks in the center will need
 * - Positions platforms evenly around the circle
 * - Updates RADIUS_RING and RING_WIDTH
 */
export function positionPlatformNodes(
  data: PositioningData,
  config: PositioningConfig,
): PositioningResult {
  const { nodes } = data;
  const { RING_NODE_PADDING, context, INNER_RADIUS_FACTOR } = config;

  const CENTER_X = 0;
  const CENTER_Y = 0;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    console.warn('positionPlatformNodes: nodes array is empty or invalid');
    return {
      RADIUS_RING: LAYOUT.absoluteMinRingRadius,
      RING_WIDTH: 0,
    };
  }

  const platformNodes = nodes.filter((d) => d.type === 'platform');
  platformNodes.forEach((d) => {
    if (!d.max_radius || !isFinite(d.max_radius) || d.max_radius <= 0) {
      d.max_radius = d.r || 20;
    }
  });

  let sum_radius = platformNodes.reduce((acc, curr) => acc + curr.max_radius! * 2, 0);
  sum_radius += platformNodes.length * RING_NODE_PADDING;
  let RADIUS_RING = sum_radius / TAU;

  const buildingBlockNodes = nodes.filter((d) => d.type === 'buildingBlock');
  const contentRadius = estimateContentRadius(buildingBlockNodes, context, INNER_RADIUS_FACTOR);

  const MIN_RADIUS = Math.max(
    LAYOUT.absoluteMinRingRadius,
    platformNodes.length * LAYOUT.minRadiusPerPlatform,
    contentRadius,
  );
  let useEvenSpacing = false;
  if (!isFinite(RADIUS_RING) || RADIUS_RING < MIN_RADIUS) {
    RADIUS_RING = MIN_RADIUS;
    useEvenSpacing = true;
  }

  // Platform labels project radially outward past the ring by
  // (max_radius + offset + label width) — the canvas needs to fit that
  // reach too, not just the ring band itself, or the widest label(s) get
  // clipped by the container.
  let maxLabelReach = 0;
  platformNodes.forEach((d) => {
    const platformData = d.data as PlatformData;
    const reach = d.max_radius! + LABEL_RADIAL_OFFSET + platformData.platform_max_width;
    if (reach > maxLabelReach) maxLabelReach = reach;
  });

  const RING_WIDTH = max(
    ((RADIUS_RING * LAYOUT.ringWidthMultiplier) / 2 - RADIUS_RING) * 2,
    maxLabelReach + LABEL_FIT_PADDING,
  );

  const evenAngleIncrement = TAU / platformNodes.length;

  let angle = 0;
  platformNodes.forEach((d) => {
    const platform_arc = d.max_radius! * 2 + RING_NODE_PADDING;
    let ring_angle: number;
    if (useEvenSpacing) {
      ring_angle = evenAngleIncrement / 2;
    } else {
      ring_angle = platform_arc / RADIUS_RING / 2;
    }

    d.x = CENTER_X + RADIUS_RING * cos(angle + ring_angle - PI / 2);
    d.y = CENTER_Y + RADIUS_RING * sin(angle + ring_angle - PI / 2);
    d.ring_angle = angle + ring_angle - PI / 2;
    angle += useEvenSpacing ? evenAngleIncrement : ring_angle * 2;

    d.fx = d.x;
    d.fy = d.y;
  });

  return {
    RADIUS_RING,
    RING_WIDTH,
  };
}
