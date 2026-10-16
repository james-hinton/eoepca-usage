/**
 * Node label rendering
 * @module render/labels
 */

import { setPlatformFont, setBuildingBlockFont, renderText } from './text';
import type { VisualizationNode, PlatformData } from '../types';

interface LabelConfig {
  SF: number;
  COLOR_TEXT: string;
  COLOR_BACKGROUND: string;
  PI: number;
}

/**
 * Draws a label for a node: a radial label following the ring for
 * platforms, a simple label above the node for Building Blocks.
 */
export function drawNodeLabel(
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
  config: LabelConfig,
): void {
  const { SF, COLOR_TEXT, COLOR_BACKGROUND, PI } = config;

  context.fillStyle = COLOR_TEXT;
  context.lineWidth = 2 * SF;
  context.textAlign = 'center';

  if (d.type === 'platform') {
    setPlatformFont(context, SF);
    context.textBaseline = 'middle';

    const ring_angle = d.ring_angle!;
    const max_radius = d.max_radius!;
    const platformData = d.data as PlatformData;

    context.save();
    context.translate(d.x * SF, d.y * SF);
    context.rotate(ring_angle + (ring_angle > PI / 2 ? PI : 0));
    context.translate(
      (ring_angle > PI / 2 ? -1 : 1) * (max_radius + 14) * SF,
      0,
    );
    context.textAlign = ring_angle > PI / 2 ? 'right' : 'left';

    const n = platformData.platform_lines.length;
    const label_line_height = 1.2;
    const font_size = 13;
    platformData.platform_lines.forEach((l: string, i: number) => {
      const x = 0;
      const y =
        (0 -
          ((n - 1) * font_size * label_line_height) / 2 +
          i * font_size * label_line_height) *
        SF;

      renderText(context, l, x, y, 1.25 * SF);
    });

    context.restore();
  } else {
    setBuildingBlockFont(context, SF);
    context.textBaseline = 'bottom';
    context.strokeStyle = COLOR_BACKGROUND;
    context.lineWidth = 4 * SF;
    renderText(
      context,
      d.label,
      d.x * SF,
      (d.y - d.r - 5) * SF,
      1.25 * SF,
      true,
    );
  }
}
