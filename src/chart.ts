// This file was adapted from Development Seed's contributor-network, which
// was itself copied-and-modified from
// https://github.com/nbremer/ORCA/blob/77745774d9d189818ab1ba27e07979897434abf9/top-contributor-network/createORCAVisual.js,
// and is licensed under the same (MPL).
//
// Adapted for the EOEPCA+ platform / Building Block domain:
// - Contributors -> platforms (ring), repositories -> Building Blocks (center)
// - Owner grouping and single-item "cloud" pinning removed entirely — every
//   Building Block, regardless of how many platforms reference it, is routed
//   through the same central force simulation
// - Commit-count/date-driven link gradients, arcs, and stats removed — links
//   here just mean "interested in", with no weight or time dimension
// - Filtering UI removed for this first version
//
/////////////////////////////////////////////////////////////////////
/////////////// Original visualization designed & developed by //////
/////////////////////////// Nadieh Bremer ///////////////////////////
///////////////////////// VisualCinnamon.com ////////////////////////
/////////////////////////////////////////////////////////////////////

import * as d3 from "d3";
import type {
  VisualizationNode,
  LinkData,
  InteractionState,
  ZoomState,
  NetworkData,
} from "./types";
import { COLORS, LAYOUT } from "./config/theme";
import { resolveLinkReferences } from "./utils/validation";
import {
  createPlatformRadiusScale,
  createBuildingBlockRadiusScale,
  createLinkDistanceScale,
  createLinkWidthScale,
} from "./config/scales";
import { setPlatformFont, getLines } from "./render/text";
import { runCentralSimulation } from "./simulations/index";
import { prepareData } from "./data/prepare";
import { positionPlatformNodes } from "./layout/positioning";
import { draw as drawVisualization } from "./render/draw";
import {
  createInteractionState,
  setHovered,
  clearHover,
  setClicked,
  clearClick,
  setDelaunay,
} from "./state/interactionState";
import { setupHover as setupHoverInteraction } from "./interaction/hover";
import { setupClick as setupClickInteraction } from "./interaction/click";
import { setupTouch } from "./interaction/touch";
import {
  setupZoom as setupZoomModule,
  applyZoomTransform,
} from "./interaction/zoom";
import {
  drawNode,
  drawHoverRing,
  drawNodeGlow,
  drawLink,
} from "./render/shapes";
import { drawTooltip as drawTooltipModule } from "./render/tooltip";
import { drawNodeLabel } from "./render/labels";
import { handleResize, calculateScaleFactor } from "./layout/resize";

const DEFAULT_SIZE = LAYOUT.defaultSize;

interface ChartFunction {
  (values: NetworkData): void;
  width(): number;
  width(value: number): ChartFunction;
  height(): number;
  height(value: number): ChartFunction;
  resize(): void;
  getNodes(): VisualizationNode[];
  getLinks(): LinkData[];
  getDebugState(): Record<string, unknown>;
}

export const createPlatformNetworkVisual = (
  container: HTMLElement,
  ringNodePadding: number,
): ChartFunction => {
  const PI = Math.PI;

  const round = Math.round;
  const max = Math.max;
  const sqrt = Math.sqrt;

  let nodes: VisualizationNode[] = [];
  let nodes_central: VisualizationNode[] = [];
  let links: LinkData[] = [];

  let interactionState: InteractionState = createInteractionState();

  let delaunay: d3.Delaunay<[number, number]> | null;
  let nodes_delaunay: VisualizationNode[];

  interface DelaunayDataProxy {
    delaunay: any;
    nodesDelaunay: VisualizationNode[];
  }

  const zoomState: ZoomState = {} as ZoomState;
  const ZOOM_CLICK_SUPPRESS_MS = 150;

  let RADIUS_RING: number;
  let RING_WIDTH: number;

  const INNER_RADIUS_FACTOR = LAYOUT.innerRadiusFactor;
  const MAX_PLATFORM_LABEL_WIDTH = LAYOUT.maxPlatformLabelWidth;
  const RING_NODE_PADDING = ringNodePadding;

  const COLOR_BACKGROUND = COLORS.background;
  const COLOR_PLATFORM = COLORS.platform;
  const COLOR_BUILDING_BLOCK = COLORS.buildingBlock;
  const COLOR_LINK = COLORS.link;
  const COLOR_LINK_HOVER = COLORS.linkHover;
  const COLOR_RING = COLORS.ring;
  const COLOR_TEXT = COLORS.text;

  const canvas = document.createElement("canvas");
  canvas.id = "canvas";
  const context = canvas.getContext("2d")!;

  const canvas_click = document.createElement("canvas");
  canvas_click.id = "canvas-click";
  const context_click = canvas_click.getContext("2d")!;

  const canvas_hover = document.createElement("canvas");
  canvas_hover.id = "canvas-hover";
  const context_hover = canvas_hover.getContext("2d")!;

  container.appendChild(canvas);
  container.appendChild(canvas_click);
  container.appendChild(canvas_hover);

  container.style.position = "relative";
  container.style.backgroundColor = COLOR_BACKGROUND;

  function localStyleCanvas(c: HTMLCanvasElement): void {
    c.style.display = "block";
    c.style.margin = "0";
  }

  function localStyleBackgroundCanvas(c: HTMLCanvasElement): void {
    c.style.position = "absolute";
    c.style.top = "0";
    c.style.left = "0";
    c.style.pointerEvents = "none";
    c.style.zIndex = "0";
    c.style.transition = "opacity 200ms ease-in";
  }

  localStyleCanvas(canvas);
  localStyleCanvas(canvas_hover);
  localStyleCanvas(canvas_click);

  localStyleBackgroundCanvas(canvas);
  localStyleBackgroundCanvas(canvas_click);

  canvas_click.style.pointerEvents = "auto";
  canvas_click.style.zIndex = "1";

  canvas_hover.style.position = "absolute";
  canvas_hover.style.top = "0";
  canvas_hover.style.left = "0";
  canvas_hover.style.zIndex = "2";
  canvas_hover.style.pointerEvents = "auto";

  let WIDTH = DEFAULT_SIZE;
  let HEIGHT = DEFAULT_SIZE;
  let width = DEFAULT_SIZE;
  let height = DEFAULT_SIZE;
  let SF: number;
  let PIXEL_RATIO: number;

  const scale_platform_radius = createPlatformRadiusScale();
  const scale_buildingBlock_radius = createBuildingBlockRadiusScale();
  const scale_link_distance = createLinkDistanceScale();
  const scale_link_width = createLinkWidthScale();

  function chart(values: NetworkData): void {
    const prepared = prepareData(
      values,
      {
        COLOR_PLATFORM,
        COLOR_BUILDING_BLOCK,
        MAX_PLATFORM_LABEL_WIDTH,
        context,
        setPlatformFont,
        getLines,
      },
      {
        scale_platform_radius,
        scale_buildingBlock_radius,
      },
    );

    if (!prepared || typeof prepared !== "object") {
      throw new Error("prepareData returned invalid result: expected object");
    }
    if (!Array.isArray(prepared.nodes) || prepared.nodes.length === 0) {
      throw new Error(
        "prepareData returned invalid nodes: expected non-empty array",
      );
    }

    nodes = prepared.nodes;
    links = prepared.links;

    const positioningResult = positionPlatformNodes(
      { nodes },
      { RING_NODE_PADDING, context, INNER_RADIUS_FACTOR },
    );
    RADIUS_RING = positioningResult.RADIUS_RING;
    RING_WIDTH = positioningResult.RING_WIDTH;

    nodes_central = runCentralSimulation(nodes, links, {
      context,
      scale_link_distance,
      RADIUS_RING,
      INNER_RADIUS_FACTOR,
    });

    links = resolveLinkReferences(links, nodes);

    chart.resize();

    setupHover();
    setupClick();
    setupTouchInteraction();
    setupZoom();
  }

  function redrawAll(): void {
    draw();
    if (interactionState.clickActive && interactionState.clickedNode) {
      context_click.clearRect(0, 0, WIDTH, HEIGHT);
      context_click.save();
      applyZoomTransform(
        context_click,
        zoomState.zoomTransform || d3.zoomIdentity,
        PIXEL_RATIO,
        WIDTH,
        HEIGHT,
      );
      drawHoverState(context_click, interactionState.clickedNode, false);
      context_click.restore();
    } else {
      context_click.clearRect(0, 0, WIDTH, HEIGHT);
    }
    if (interactionState.hoverActive && interactionState.hoveredNode) {
      context_hover.clearRect(0, 0, WIDTH, HEIGHT);
      context_hover.save();
      applyZoomTransform(
        context_hover,
        zoomState.zoomTransform || d3.zoomIdentity,
        PIXEL_RATIO,
        WIDTH,
        HEIGHT,
      );
      drawHoverState(context_hover, interactionState.hoveredNode);
      context_hover.restore();
    } else {
      context_hover.clearRect(0, 0, WIDTH, HEIGHT);
    }
  }

  function draw(): void {
    context.fillStyle = COLOR_BACKGROUND;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.save();
    applyZoomTransform(
      context,
      zoomState.zoomTransform || d3.zoomIdentity,
      PIXEL_RATIO,
      WIDTH,
      HEIGHT,
    );

    drawVisualization(
      context,
      { nodes, links, nodes_central },
      {
        WIDTH,
        HEIGHT,
        SF,
        COLOR_BACKGROUND,
        COLOR_RING,
        RADIUS_RING,
      },
      {
        drawLink: drawLinkWrapper,
        drawNode: drawNodeWrapper,
        drawNodeLabel: drawNodeLabelWrapper,
      },
    );

    context.restore();
  }

  chart.resize = (): void => {
    const canvases = { canvas, canvas_click, canvas_hover };
    const contexts = { context, context_click, context_hover };
    const config = {
      width,
      height,
      DEFAULT_SIZE,
      RADIUS_RING,
      RING_WIDTH,
      round,
    };
    const state: any = {
      WIDTH,
      HEIGHT,
      PIXEL_RATIO,
      SF,
      nodes_delaunay,
      delaunay,
    };
    const data = { nodes };

    const drawWithUpdatedState = (): void => {
      WIDTH = state.WIDTH;
      HEIGHT = state.HEIGHT;
      PIXEL_RATIO = state.PIXEL_RATIO;
      SF = state.SF;
      nodes_delaunay = state.nodes_delaunay;
      delaunay = state.delaunay;
      draw();
    };

    handleResize(canvases, contexts, config, state, data, {
      setDelaunay,
      interactionState,
      draw: drawWithUpdatedState,
    });

    WIDTH = state.WIDTH;
    HEIGHT = state.HEIGHT;
    PIXEL_RATIO = state.PIXEL_RATIO;
    SF = state.SF;
    nodes_delaunay = state.nodes_delaunay;
    delaunay = state.delaunay;
  };

  function drawNodeWrapper(
    ctx: CanvasRenderingContext2D,
    sf: number,
    d: VisualizationNode,
  ): void {
    const config = { COLOR_BACKGROUND, max };
    drawNode(ctx, sf, d, config, interactionState);
  }

  function drawHoverRingWrapper(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode,
  ): void {
    drawHoverRing(ctx, d, SF);
  }

  function drawLinkWrapper(
    ctx: CanvasRenderingContext2D,
    sf: number,
    l: LinkData,
  ): void {
    drawLink(
      ctx,
      sf,
      l,
      { COLOR_LINK },
      interactionState,
      calculateEdgeCenters,
      scale_link_width,
    );
  }

  function drawLinkHighlightWrapper(
    ctx: CanvasRenderingContext2D,
    sf: number,
    l: LinkData,
  ): void {
    drawLink(
      ctx,
      sf,
      l,
      { COLOR_LINK: COLOR_LINK_HOVER },
      interactionState,
      calculateEdgeCenters,
      scale_link_width,
    );
  }

  function sq(x: number): number {
    return x * x;
  }

  function calculateEdgeCenters(
    l: LinkData,
    size: number = 2,
    sign: boolean = true,
  ): void {
    const source = l.source as VisualizationNode;
    const target = l.target as VisualizationNode;
    l.r = sqrt(sq(target.x - source.x) + sq(target.y - source.y)) * size;
    const centers = findCenters(
      l.r!,
      { x: source.x, y: source.y },
      { x: target.x, y: target.y },
    );
    l.sign = sign;
    l.center = centers ? (l.sign ? centers.c2 : centers.c1) : undefined;

    function findCenters(
      r: number,
      p1: { x: number; y: number },
      p2: { x: number; y: number },
    ): { c1: { x: number; y: number }; c2: { x: number; y: number } } | null {
      const pm = { x: 0.5 * (p1.x + p2.x), y: 0.5 * (p1.y + p2.y) };
      let perpABdx = -(p2.y - p1.y);
      let perpABdy = p2.x - p1.x;
      const norm = sqrt(sq(perpABdx) + sq(perpABdy));
      perpABdx /= norm;
      perpABdy /= norm;
      const dpmp1 = sqrt(sq(pm.x - p1.x) + sq(pm.y - p1.y));
      const sinVal = dpmp1 / r;
      if (sinVal < -1 || sinVal > 1) return null;
      const cosVal = sqrt(1 - sq(sinVal));
      const d = r * cosVal;
      const res1 = { x: pm.x + perpABdx * d, y: pm.y + perpABdy * d };
      const res2 = { x: pm.x - perpABdx * d, y: pm.y - perpABdy * d };
      return { c1: res1, c2: res2 };
    }
  }

  function setupHover(): void {
    const config = {
      get PIXEL_RATIO() { return PIXEL_RATIO; },
      get WIDTH() { return WIDTH; },
      get HEIGHT() { return HEIGHT; },
      get SF() { return SF; },
      get RADIUS_RING() { return RADIUS_RING; },
      get RING_WIDTH() { return RING_WIDTH; },
      sqrt,
    };
    const delaunayData: DelaunayDataProxy = {
      get delaunay() { return delaunay; },
      set delaunay(val) { delaunay = val; },
      get nodesDelaunay() { return nodes_delaunay; },
      set nodesDelaunay(val) { nodes_delaunay = val; },
    };

    setupHoverInteraction({
      canvasSelector: "#canvas-hover",
      config,
      delaunayData,
      interactionState,
      canvas,
      contextHover: context_hover,
      setHovered,
      clearHover,
      drawHoverState,
      zoomState,
    });
  }

  function drawHoverState(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode,
    DO_TOOLTIP: boolean = true,
  ): void {
    ctx.save();

    if (d.neighbor_links === undefined) {
      d.neighbor_links = links.filter(
        (l) =>
          (l.source as VisualizationNode).id === d.id ||
          (l.target as VisualizationNode).id === d.id,
      );
    }

    if (d.neighbors === undefined) {
      d.neighbors = nodes.filter((n) =>
        links.find(
          (l) =>
            ((l.source as VisualizationNode).id === d.id &&
              (l.target as VisualizationNode).id === n.id) ||
            ((l.target as VisualizationNode).id === d.id &&
              (l.source as VisualizationNode).id === n.id),
        ),
      );
    }

    d.neighbor_links.forEach((l: LinkData) => {
      if (l && l.source && l.target) {
        drawLinkHighlightWrapper(ctx, SF, l);
      }
    });

    d.neighbors.forEach((n) => drawNodeGlow(ctx, SF, n, 0.25));
    d.neighbors.forEach((n) => drawNodeWrapper(ctx, SF, n));
    d.neighbors.forEach((n) => drawNodeLabelWrapper(ctx, n));

    drawNodeGlow(ctx, SF, d, 0.5);
    drawNodeWrapper(ctx, SF, d);
    drawHoverRingWrapper(ctx, d);
    drawNodeLabelWrapper(ctx, d);

    if (DO_TOOLTIP) drawTooltipWrapper(ctx, d);

    ctx.restore();
  }

  function setupClick(): void {
    const config = {
      get PIXEL_RATIO() { return PIXEL_RATIO; },
      get WIDTH() { return WIDTH; },
      get HEIGHT() { return HEIGHT; },
      get SF() { return SF; },
      get RADIUS_RING() { return RADIUS_RING; },
      get RING_WIDTH() { return RING_WIDTH; },
      sqrt,
    };
    const delaunayData: DelaunayDataProxy = {
      get delaunay() { return delaunay; },
      set delaunay(val) { delaunay = val; },
      get nodesDelaunay() { return nodes_delaunay; },
      set nodesDelaunay(val) { nodes_delaunay = val; },
    };

    setupClickInteraction({
      canvasSelector: "#canvas-hover",
      config,
      delaunayData,
      interactionState,
      canvas,
      contextClick: context_click,
      contextHover: context_hover,
      getNodes: () => nodes,
      setClicked,
      clearClick,
      clearHover,
      setDelaunay,
      drawHoverState,
      zoomState,
      ZOOM_CLICK_SUPPRESS_MS,
    });
  }

  function setupTouchInteraction(): void {
    const drawer = document.getElementById('mobile-drawer');
    const tooltipContentEl = document.getElementById('mobile-drawer-tooltip-content');
    if (!drawer || !tooltipContentEl) return;
    const tooltipEl = drawer;
    const config = {
      get PIXEL_RATIO() { return PIXEL_RATIO; },
      get WIDTH() { return WIDTH; },
      get HEIGHT() { return HEIGHT; },
      get SF() { return SF; },
      get RADIUS_RING() { return RADIUS_RING; },
      get RING_WIDTH() { return RING_WIDTH; },
      sqrt,
    };
    const delaunayData: DelaunayDataProxy = {
      get delaunay() { return delaunay; },
      set delaunay(val) { delaunay = val; },
      get nodesDelaunay() { return nodes_delaunay; },
      set nodesDelaunay(val) { nodes_delaunay = val; },
    };
    setupTouch({
      canvasSelector: "#canvas-hover",
      config,
      delaunayData,
      interactionState,
      canvas,
      contextClick: context_click,
      contextHover: context_hover,
      getNodes: () => nodes,
      setClicked,
      clearClick,
      clearHover,
      setDelaunay,
      drawHoverState,
      zoomState,
      tooltipEl,
      tooltipContentEl,
      onTooltipShow: (node: VisualizationNode) => {
        drawer.dataset.mode = 'tooltip';
        container.classList.add('node-selected');
      },
      onTooltipDismiss: () => {
        drawer.dataset.mode = 'idle';
        drawer.removeAttribute('data-node-type');
        container.classList.remove('node-selected');
      },
    });
  }

  function setupZoom(): void {
    const zoomBehavior = setupZoomModule({
      canvasSelector: "#canvas-hover",
      state: zoomState,
      redrawAll,
      ZOOM_CLICK_SUPPRESS_MS,
    });

    const INITIAL_SCALE = 1.2;
    const cx = width / 2;
    const cy = height / 2;
    const tx = cx - INITIAL_SCALE * cx;
    const ty = cy - INITIAL_SCALE * cy;
    const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(INITIAL_SCALE);
    const zoomTarget = d3.select("#canvas-hover");
    zoomTarget.call(zoomBehavior as any).call(
      (zoomBehavior as any).transform,
      initialTransform,
    );
  }

  function drawTooltipWrapper(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode,
  ): void {
    const config = {
      SF,
      COLOR_BACKGROUND,
      COLOR_TEXT,
      COLOR_PLATFORM,
      COLOR_BUILDING_BLOCK,
    };
    drawTooltipModule(ctx, d, config);
  }

  function drawNodeLabelWrapper(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode,
  ): void {
    const config = { SF, COLOR_TEXT, COLOR_BACKGROUND, PI };
    drawNodeLabel(ctx, d, config);
  }

  chart.width = function (value?: number): any {
    if (value === undefined) return width;
    width = value;
    return chart;
  };

  chart.height = function (value?: number): any {
    if (value === undefined) return height;
    height = value;
    return chart;
  };

  chart.getNodes = function (): VisualizationNode[] {
    return nodes;
  };

  chart.getLinks = function (): LinkData[] {
    return links;
  };

  chart.getDebugState = function (): Record<string, unknown> {
    return {
      nodesCount: nodes.length,
      linksCount: links.length,
      nodeTypes: nodes.reduce(
        (acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  };

  return chart as unknown as ChartFunction;
};
