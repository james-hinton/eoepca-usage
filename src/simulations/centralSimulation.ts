/**
 * Central force simulation for Building Block nodes
 *
 * Every Building Block — whether referenced by one platform or many — is
 * routed through this single simulation and kept within the platform ring.
 * There is no separate "pin next to its one platform" path: unlike the
 * source codebase this was adapted from (which special-cased single-link
 * repos), every Building Block gets the same treatment here.
 *
 * @module simulations/centralSimulation
 */

import * as d3 from 'd3';
import { bboxCollide } from 'd3-bboxCollide';
import { setBuildingBlockFont } from '../render/text';
import { getLinkNodeId } from '../utils/validation';
import { sqrt, max } from '../utils/helpers';
import { LAYOUT } from '../config/theme';
import type { VisualizationNode, LinkData } from '../types';

export interface CentralSimulationConfig {
  context: CanvasRenderingContext2D;
  scale_link_distance: d3.ScaleContinuousNumeric<number, number>;
  RADIUS_RING: number;
  INNER_RADIUS_FACTOR: number;
}

/**
 * Run the force simulation that positions platform + Building Block nodes.
 * Platform nodes are already ring-fixed (fx/fy); this settles Building
 * Block nodes among them, bounded by the ring's inner radius.
 *
 * @returns Array of central nodes used in the simulation
 */
export function runCentralSimulation(
  nodes: VisualizationNode[],
  links: LinkData[],
  config: CentralSimulationConfig,
): VisualizationNode[] {
  const { context, scale_link_distance, RADIUS_RING, INNER_RADIUS_FACTOR } = config;

  const simulation = d3
    .forceSimulation<VisualizationNode>()
    .force(
      'link',
      d3
        .forceLink<VisualizationNode, LinkData>()
        .id((d) => d.id)
        .distance((d) => scale_link_distance((d.target as VisualizationNode).degree) * LAYOUT.centralLinkMultiplier),
    )
    .force(
      'collide',
      bboxCollide<VisualizationNode>((d) => d.bbox!)
        .strength(0)
        .iterations(3),
    )
    .force('charge', d3.forceManyBody().strength(LAYOUT.centralChargeStrength));

  // All platform nodes (ring-fixed) and all Building Block nodes
  // (regardless of how many platforms reference them) participate.
  const nodes_central = nodes.filter(
    (d) => d.type === 'platform' || d.type === 'buildingBlock',
  );
  nodes_central.forEach((d) => {
    d.node_central = true;
  });

  nodes_central.forEach((d) => {
    if (d.type === 'platform') {
      d.bbox = [
        [-d.max_radius!, -d.max_radius!],
        [d.max_radius!, d.max_radius!],
      ];
      return;
    }

    setBuildingBlockFont(context, 1);
    const text_size = context.measureText(d.label);
    const text_height = text_size.fontBoundingBoxAscent + text_size.fontBoundingBoxDescent;

    const r = d.r;
    const top = max(r, r + text_height);
    const w = max(r * 2, text_size.width * 1.25) + 14;

    d.bbox = [
      [-w / 2, -top],
      [w / 2, r],
    ];
  });

  const links_central = links.filter(
    (d) =>
      nodes_central.find((n) => n.id === getLinkNodeId(d.source)) &&
      nodes_central.find((n) => n.id === getLinkNodeId(d.target)),
  );

  // Building Block nodes all start at the exact origin (see prepareData).
  // Nodes with identical connectivity (e.g. two Building Blocks referenced
  // by the same single platform) would otherwise feel identical forces
  // every tick and never separate — a classic force-simulation symmetry
  // lock. A tiny nudge breaks the tie; platform nodes are unaffected since
  // they're already ring-fixed via fx/fy.
  nodes_central.forEach((d) => {
    if (d.type === 'buildingBlock') {
      d.x += (Math.random() - 0.5) * 2;
      d.y += (Math.random() - 0.5) * 2;
    }
  });

  simulation.nodes(nodes_central).stop();

  (simulation.force('link') as d3.ForceLink<VisualizationNode, LinkData>).links(links_central);

  const n_ticks = 400;
  for (let i = 0; i < n_ticks; ++i) {
    simulation.tick();
    simulationPlacementConstraints(nodes_central, RADIUS_RING, INNER_RADIUS_FACTOR);
    (simulation.force('collide') as ReturnType<typeof bboxCollide>).strength(
      Math.pow(i / n_ticks, 2) * LAYOUT.centralCollideStrength,
    );
  }

  nodes_central.forEach((d) => {
    d.fx = d.x;
    d.fy = d.y;
  });

  function simulationPlacementConstraints(
    nodes: VisualizationNode[],
    RADIUS_RING: number,
    INNER_RADIUS_FACTOR: number,
  ): void {
    nodes.forEach((d) => {
      if (d.type === 'buildingBlock') {
        const dist = sqrt(d.x ** 2 + d.y ** 2);
        if (dist > RADIUS_RING * INNER_RADIUS_FACTOR) {
          d.x = (d.x / dist) * RADIUS_RING * INNER_RADIUS_FACTOR;
          d.y = (d.y / dist) * RADIUS_RING * INNER_RADIUS_FACTOR;
        }
      }
    });
  }

  return nodes_central;
}
