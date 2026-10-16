/**
 * Shape drawing utilities (circles, rounded squares, links, ring boundary)
 * @module render/shapes
 */

import { TAU } from '../utils/helpers';
import type { VisualizationNode, InteractionState, LinkData } from '../types';

interface DrawNodeConfig {
  COLOR_BACKGROUND: string;
  max: (...values: number[]) => number;
}

interface DrawLinkConfig {
  COLOR_LINK: string;
}

interface ArcLine {
  source: { x: number; y: number };
  target: { x: number; y: number };
  center?: { x: number; y: number };
  r: number;
  sign: boolean;
}

/**
 * Draws a circle on the canvas. Used for platform nodes.
 */
export function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  SF: number,
  r: number = 10,
  begin: boolean = true,
  stroke: boolean = false,
): void {
  if (begin === true) context.beginPath();
  context.moveTo((x + r) * SF, y * SF);
  context.arc(x * SF, y * SF, r * SF, 0, TAU);
  if (begin && stroke == false) context.fill();
}

/**
 * Traces a rounded-square path centered at (x, y). Used for Building Block
 * nodes — a distinct shape from the circular platform nodes on the ring.
 */
export function traceRoundedSquare(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  SF: number,
  r: number,
): void {
  const half = r * SF;
  const cx = x * SF;
  const cy = y * SF;
  const corner = half * 0.4;

  const left = cx - half;
  const right = cx + half;
  const top = cy - half;
  const bottom = cy + half;

  context.beginPath();
  context.moveTo(left + corner, top);
  context.lineTo(right - corner, top);
  context.arcTo(right, top, right, top + corner, corner);
  context.lineTo(right, bottom - corner);
  context.arcTo(right, bottom, right - corner, bottom, corner);
  context.lineTo(left + corner, bottom);
  context.arcTo(left, bottom, left, bottom - corner, corner);
  context.lineTo(left, top + corner);
  context.arcTo(left, top, left + corner, top, corner);
  context.closePath();
}

/**
 * Draws a curved arc for a line.
 */
export function drawCircleArc(
  context: CanvasRenderingContext2D,
  SF: number,
  line: ArcLine,
): void {
  if (!line.center) {
    context.lineTo(line.target.x * SF, line.target.y * SF);
    return;
  }

  let center = line.center;
  let ang1 = Math.atan2(
    line.source.y * SF - center.y * SF,
    line.source.x * SF - center.x * SF,
  );
  let ang2 = Math.atan2(
    line.target.y * SF - center.y * SF,
    line.target.x * SF - center.x * SF,
  );
  context.arc(
    center.x * SF,
    center.y * SF,
    line.r * SF,
    ang1,
    ang2,
    line.sign,
  );
}

/**
 * Draws a line on the canvas.
 */
export function drawLine(
  context: CanvasRenderingContext2D,
  SF: number,
  line: ArcLine,
): void {
  context.beginPath();
  context.moveTo(line.source.x * SF, line.source.y * SF);
  if (line.center) drawCircleArc(context, SF, line);
  else context.lineTo(line.target.x * SF, line.target.y * SF);
  context.stroke();
}

/**
 * Draws a node on the canvas: a circle for platforms, a rounded square for
 * Building Blocks — a deliberate shape distinction rather than "everything
 * is a circle".
 */
export function drawNode(
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
  config: DrawNodeConfig,
  interactionState: InteractionState,
): void {
  const { COLOR_BACKGROUND, max } = config;

  const isActive = interactionState.hoverActive || interactionState.clickActive;
  context.shadowBlur = isActive ? 0 : max(2, d.r * 0.2) * SF;
  context.shadowColor = COLOR_BACKGROUND;

  context.fillStyle = d.color;
  if (d.type === 'buildingBlock') {
    traceRoundedSquare(context, d.x, d.y, SF, d.r);
    context.fill();
  } else {
    drawCircle(context, d.x, d.y, SF, d.r);
  }
  context.shadowBlur = 0;

  context.strokeStyle = COLOR_BACKGROUND;
  context.lineWidth = max(isActive ? 1.5 : 1, d.r * 0.07) * SF;
  if (d.type === 'buildingBlock') {
    traceRoundedSquare(context, d.x, d.y, SF, d.r);
    context.stroke();
  } else {
    drawCircle(context, d.x, d.y, SF, d.r, true, true);
    context.stroke();
  }
}

/**
 * Draws a stroked ring around a hovered/clicked node, matching its shape.
 */
export function drawHoverRing(
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
  SF: number,
): void {
  const r = d.r + (d.type === 'platform' ? 9 : 7);
  context.strokeStyle = d.color;
  context.lineWidth = 3 * SF;
  if (d.type === 'buildingBlock') {
    traceRoundedSquare(context, d.x, d.y, SF, r);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo((d.x + r) * SF, d.y * SF);
    context.arc(d.x * SF, d.y * SF, r * SF, 0, TAU);
    context.stroke();
  }
}

export function drawNodeGlow(
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
  intensity: number,
): void {
  const glowRadius = d.r * (intensity > 0.3 ? 3.0 : 2.0);
  const cx = d.x * SF;
  const cy = d.y * SF;
  const r = glowRadius * SF;

  const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, hexToRgba(d.color, intensity));
  gradient.addColorStop(1, hexToRgba(d.color, 0));

  context.save();
  context.fillStyle = gradient;
  context.fillRect(cx - r, cy - r, r * 2, r * 2);
  context.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draws a link between a platform and a Building Block. Straight,
 * uniform-treatment lines — there's no time dimension here to drive a
 * gradient, so weight/opacity only shift with hover state. The one
 * distinction that does matter: a dashed stroke for "interested" links
 * (evaluating/planning/expressed interest) vs solid for "active" (in use).
 */
export function drawLink(
  context: CanvasRenderingContext2D,
  SF: number,
  l: LinkData,
  config: DrawLinkConfig,
  interactionState: InteractionState,
  calculateEdgeCenters: (l: LinkData, factor: number) => void,
  scale_link_width: (degree: number) => number,
): void {
  const { COLOR_LINK } = config;

  const source = l.source as VisualizationNode;
  const target = l.target as VisualizationNode;

  if (
    !source ||
    !target ||
    typeof source.x !== 'number' ||
    typeof target.x !== 'number' ||
    !isFinite(source.x) ||
    !isFinite(source.y) ||
    !isFinite(target.x) ||
    !isFinite(target.y)
  ) {
    return;
  }

  calculateEdgeCenters(l, 1);

  context.strokeStyle = COLOR_LINK;
  context.lineWidth = scale_link_width(target.degree) * SF;
  context.setLineDash(l.status === 'interested' ? [5 * SF, 4 * SF] : []);
  drawLine(context, SF, l as unknown as ArcLine);
  context.setLineDash([]);
}

/**
 * Draws a dashed circle marking the boundary of the platform ring — makes
 * the "platforms on the edge, Building Blocks in the middle" structure
 * legible without relying on node placement alone to convey it.
 */
export function drawRingBoundary(
  context: CanvasRenderingContext2D,
  SF: number,
  RADIUS_RING: number,
  COLOR_RING: string,
): void {
  context.save();
  context.beginPath();
  context.setLineDash([6 * SF, 6 * SF]);
  context.strokeStyle = COLOR_RING;
  context.lineWidth = 1.5 * SF;
  context.arc(0, 0, RADIUS_RING * SF, 0, TAU);
  context.stroke();
  context.restore();
}
