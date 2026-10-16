export type NodeType = "platform" | "buildingBlock";

export interface PlatformData {
  platform_name: string;
  color: string;
  platform_lines: string[];
  platform_max_width: number;
  links_original: LinkData[];
  buildingBlocks: BuildingBlockData[];
  index: number;
}

export interface BuildingBlockData {
  name: string;
  color: string;
  links_original: LinkData[];
  platforms: PlatformData[];
  index: number;
}

/**
 * "active" — the platform is using the Building Block.
 * "interested" — expressed interest, evaluating, or planning to use it, but
 * not (yet) actively using it. Rendered as a dashed line vs a solid one.
 */
export type LinkStatus = "active" | "interested";

export interface LinkData {
  source: string | VisualizationNode;
  target: string | VisualizationNode;
  platform?: string;
  buildingBlock?: string;
  /** Defaults to "active" wherever unset. */
  status?: LinkStatus;
  gradient?: CanvasGradient | string;
  center?: { x: number; y: number };
  r?: number;
  sign?: boolean;
}

export interface VisualizationNode {
  id: string;
  type: NodeType;
  label: string;
  data: PlatformData | BuildingBlockData;
  index: number;
  degree: number;
  x: number;
  y: number;
  r: number;
  color: string;
  neighbors?: VisualizationNode[];

  // Set by d3 force simulations
  fx?: number | null;
  fy?: number | null;

  // Set by layout/positioning and simulations/centralSimulation
  max_radius?: number;
  node_central?: boolean;
  bbox?: [[number, number], [number, number]];
  ring_angle?: number;
  neighbor_links?: LinkData[];
}

export interface InteractionState {
  hoverActive: boolean;
  hoveredNode: VisualizationNode | null;
  clickActive: boolean;
  clickedNode: VisualizationNode | null;
  delaunay: d3.Delaunay<[number, number]> | null;
  nodesDelaunay: VisualizationNode[] | null;
}

export interface DelaunayData {
  delaunay: d3.Delaunay<[number, number]>;
  nodesDelaunay: VisualizationNode[];
}

export interface ZoomState {
  zoomTransform: d3.ZoomTransform;
  zoomPanning: boolean;
  zoomLastInteraction: number;
  zoomMoved: boolean;
  zoomMovedAt: number;
  zoomStartTransform: d3.ZoomTransform;
}

export interface VisualizationConfig {
  PIXEL_RATIO: number;
  WIDTH: number;
  HEIGHT: number;
  SF: number;
  RADIUS_RING: number;
  RING_WIDTH: number;
  sqrt: (x: number) => number;
}

export interface PreparedData {
  nodes: VisualizationNode[];
  nodes_central: VisualizationNode[];
  links: LinkData[];
}

/**
 * A platform's Building Block entry, as authored in network.json: either a
 * bare name (shorthand for "active" — the platform is using it) or an
 * object naming an explicit status.
 */
export type BuildingBlockEntry = string | { name: string; status: LinkStatus };

/** Raw input shape: platform name -> list of Building Blocks it's active on or interested in. */
export type NetworkData = Record<string, BuildingBlockEntry[]>;
