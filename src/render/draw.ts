/**
 * Main Drawing Module
 *
 * Orchestrates the rendering of the entire visualization by calling
 * the appropriate render functions for links, nodes, and labels.
 *
 * @module render/draw
 */

import { drawRingBoundary } from './shapes';
import type { VisualizationNode, LinkData } from '../types';

type DrawLinkFn = (
  context: CanvasRenderingContext2D,
  SF: number,
  l: LinkData,
) => void;

type DrawNodeFn = (
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
) => void;

type DrawNodeLabelFn = (
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
) => void;

export interface DrawRenderFunctions {
  drawLink: DrawLinkFn;
  drawNode: DrawNodeFn;
  drawNodeLabel: DrawNodeLabelFn;
}

export interface DrawData {
  nodes: VisualizationNode[];
  links: LinkData[];
  nodes_central?: VisualizationNode[];
}

export interface DrawConfig {
  WIDTH: number;
  HEIGHT: number;
  SF: number;
  COLOR_BACKGROUND: string;
  COLOR_RING: string;
  RADIUS_RING?: number;
}

/**
 * Safely execute a render function with error handling.
 */
function safeRender(renderFn: Function, fnName: string, ...args: unknown[]): boolean {
  try {
    renderFn(...args);
    return true;
  } catch (error) {
    console.error(`Error in ${fnName}:`, error);
    return false;
  }
}

/**
 * Check if a node has valid, finite coordinates for rendering.
 */
function hasValidCoordinates(node: VisualizationNode | { x?: number; y?: number }): boolean {
  return (
    node != null &&
    typeof node.x === 'number' &&
    typeof node.y === 'number' &&
    isFinite(node.x) &&
    isFinite(node.y)
  );
}

/**
 * Draw the complete visualization.
 *
 * Rendering order is important for visual layering:
 * 1. Links (bottom layer)
 * 2. Ring boundary
 * 3. Node shapes (main visual)
 * 4. Labels (top layer)
 */
export function draw(
  context: CanvasRenderingContext2D,
  data: DrawData,
  config: DrawConfig,
  renderFunctions: DrawRenderFunctions,
): void {
  const { nodes, links, nodes_central } = data;
  const { WIDTH, HEIGHT, SF, COLOR_RING, RADIUS_RING } = config;
  const { drawLink, drawNode, drawNodeLabel } = renderFunctions;

  if (WIDTH === 0 || HEIGHT === 0) {
    console.warn('draw() called with invalid canvas size:', { WIDTH, HEIGHT, SF });
    return;
  }
  if (!Array.isArray(nodes) || nodes.length === 0) {
    console.warn('draw() called with no nodes');
    return;
  }

  const renderableNodes = nodes.filter((d) => {
    if (!hasValidCoordinates(d)) {
      console.warn(`Skipping node with invalid coordinates: ${d.id}`);
      return false;
    }
    return true;
  });

  context.save();

  links.forEach((l) => {
    if (
      hasValidCoordinates(l.source as VisualizationNode) &&
      hasValidCoordinates(l.target as VisualizationNode)
    ) {
      safeRender(drawLink, 'drawLink', context, SF, l);
    }
  });

  if (RADIUS_RING) {
    safeRender(drawRingBoundary, 'drawRingBoundary', context, SF, RADIUS_RING, COLOR_RING);
  }

  renderableNodes.forEach((d) => {
    safeRender(drawNode, 'drawNode', context, SF, d);
  });

  const labelNodes = nodes_central || nodes;
  labelNodes.forEach((d) => {
    if (!hasValidCoordinates(d)) return;
    safeRender(drawNodeLabel, 'drawNodeLabel', context, d);
  });

  context.restore();
}
