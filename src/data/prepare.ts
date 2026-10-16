/**
 * Data Preparation Module
 *
 * Transforms the raw platform -> Building Block JSON mapping into the
 * structured node/link format needed for visualization.
 *
 * @module data/prepare
 */

import * as d3 from "d3";
import type {
  VisualizationNode,
  LinkData,
  LinkStatus,
  PlatformData,
  BuildingBlockData,
  PreparedData,
  NetworkData,
  BuildingBlockEntry,
} from "../types";

/** Normalizes a network.json Building Block entry to {name, status}. */
function normalizeEntry(entry: BuildingBlockEntry): { name: string; status: LinkStatus } {
  if (typeof entry === "string") {
    return { name: entry, status: "active" };
  }
  return { name: entry.name, status: entry.status };
}

interface PrepareConfig {
  COLOR_PLATFORM: string;
  COLOR_BUILDING_BLOCK: string;
  MAX_PLATFORM_LABEL_WIDTH: number;
  context: CanvasRenderingContext2D;
  setPlatformFont: (ctx: CanvasRenderingContext2D) => void;
  getLines: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ) => [string[], number];
}

interface PrepareScales {
  scale_platform_radius: d3.ScaleContinuousNumeric<number, number>;
  scale_buildingBlock_radius: d3.ScaleContinuousNumeric<number, number>;
}

/**
 * Prepare data for visualization from the raw platform -> Building Blocks map.
 *
 * - Creates one node per platform (ring) and one node per unique Building
 *   Block referenced by any platform (center).
 * - A Building Block referenced by multiple platforms gets one link per
 *   referencing platform; one referenced by a single platform still gets
 *   exactly one link (no special-casing — see centralSimulation).
 * - Node radius scales with how many Building Blocks a platform lists /
 *   how many platforms a Building Block is referenced by.
 */
export function prepareData(
  data: NetworkData,
  config: PrepareConfig,
  scales: PrepareScales,
): PreparedData {
  const {
    COLOR_PLATFORM,
    COLOR_BUILDING_BLOCK,
    MAX_PLATFORM_LABEL_WIDTH,
    context,
    setPlatformFont,
    getLines,
  } = config;
  const { scale_platform_radius, scale_buildingBlock_radius } = scales;

  const platformNames = Object.keys(data).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );

  const buildingBlockNameSet = new Set<string>();
  platformNames.forEach((platform) => {
    (data[platform] || []).forEach((entry) =>
      buildingBlockNameSet.add(normalizeEntry(entry).name),
    );
  });
  const buildingBlockNames = Array.from(buildingBlockNameSet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );

  const platforms: PlatformData[] = platformNames.map((name) => ({
    platform_name: name,
    color: COLOR_PLATFORM,
    platform_lines: [],
    platform_max_width: 0,
    links_original: [],
    buildingBlocks: [],
    index: 0,
  }));
  const platformByName = new Map(platforms.map((p) => [p.platform_name, p]));

  const buildingBlocks: BuildingBlockData[] = buildingBlockNames.map(
    (name) => ({
      name,
      color: COLOR_BUILDING_BLOCK,
      links_original: [],
      platforms: [],
      index: 0,
    }),
  );
  const buildingBlockByName = new Map(buildingBlocks.map((b) => [b.name, b]));

  platforms.forEach((p) => {
    setPlatformFont(context);
    [p.platform_lines, p.platform_max_width] = getLines(
      context,
      p.platform_name,
      MAX_PLATFORM_LABEL_WIDTH,
    );
  });

  const links: LinkData[] = [];
  platformNames.forEach((platformName) => {
    const platform = platformByName.get(platformName)!;
    (data[platformName] || []).forEach((entry) => {
      const { name: buildingBlockName, status } = normalizeEntry(entry);
      const buildingBlock = buildingBlockByName.get(buildingBlockName);
      if (!buildingBlock) return;

      const link: LinkData = {
        source: platformName,
        target: buildingBlockName,
        platform: platformName,
        buildingBlock: buildingBlockName,
        status,
      };
      links.push(link);
      platform.links_original.push(link);
      buildingBlock.links_original.push(link);
      platform.buildingBlocks.push(buildingBlock);
      buildingBlock.platforms.push(platform);
    });
  });

  const nodes: VisualizationNode[] = [];
  platforms.forEach((p) => {
    nodes.push({
      id: p.platform_name,
      type: "platform",
      label: p.platform_name,
      data: p,
    } as VisualizationNode);
  });
  buildingBlocks.forEach((b) => {
    nodes.push({
      id: b.name,
      type: "buildingBlock",
      label: b.name,
      data: b,
    } as VisualizationNode);
  });

  const platformCounts = platforms
    .map((p) => p.buildingBlocks.length)
    .filter((c) => c > 0);
  scale_platform_radius.domain(
    platformCounts.length > 0
      ? (d3.extent(platformCounts) as [number, number])
      : [1, 10],
  );

  const buildingBlockCounts = buildingBlocks
    .map((b) => b.platforms.length)
    .filter((c) => c > 0);
  scale_buildingBlock_radius.domain(
    buildingBlockCounts.length > 0
      ? (d3.extent(buildingBlockCounts) as [number, number])
      : [1, 10],
  );

  nodes.forEach((d, i) => {
    d.index = i;
    (d.data as { index: number }).index = i;

    d.degree = links.filter((l) => l.source === d.id || l.target === d.id)
      .length;

    d.x = 0;
    d.y = 0;

    if (d.type === "platform") {
      const count = (d.data as PlatformData).buildingBlocks.length;
      d.r =
        count > 0
          ? scale_platform_radius(count)
          : scale_platform_radius.range()[0];
    } else {
      const count = (d.data as BuildingBlockData).platforms.length;
      d.r =
        count > 0
          ? scale_buildingBlock_radius(count)
          : scale_buildingBlock_radius.range()[0];
    }

    d.color = (d.data as { color: string }).color;
  });

  nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    }
    return a.type < b.type ? -1 : 1;
  });

  return {
    nodes,
    nodes_central: nodes,
    links,
  };
}
