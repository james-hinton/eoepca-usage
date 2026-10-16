import * as d3 from 'd3';

import { SIZES, LAYOUT } from './theme';

export function createPlatformRadiusScale(): d3.ScalePower<number, number> {
  return d3
    .scaleSqrt()
    .range([SIZES.platformRadius.min, SIZES.platformRadius.max]);
}

export function createBuildingBlockRadiusScale(): d3.ScalePower<number, number> {
  return d3
    .scaleSqrt()
    .range([SIZES.buildingBlockRadius.min, SIZES.buildingBlockRadius.max]);
}

export function createLinkDistanceScale(): d3.ScaleLinear<number, number> {
  return d3
    .scaleLinear()
    .domain(LAYOUT.linkDistanceDomain)
    .range([SIZES.linkDistance.min, SIZES.linkDistance.max]);
}

export function createLinkWidthScale(): d3.ScaleLinear<number, number> {
  return d3
    .scaleLinear()
    .domain(LAYOUT.linkWidthDomain)
    .range([SIZES.linkWidth.min, SIZES.linkWidth.max])
    .clamp(true);
}

export interface VisualizationScales {
  platformRadius: d3.ScalePower<number, number>;
  buildingBlockRadius: d3.ScalePower<number, number>;
  linkDistance: d3.ScaleLinear<number, number>;
  linkWidth: d3.ScaleLinear<number, number>;
}

export function createAllScales(): VisualizationScales {
  return {
    platformRadius: createPlatformRadiusScale(),
    buildingBlockRadius: createBuildingBlockRadiusScale(),
    linkDistance: createLinkDistanceScale(),
    linkWidth: createLinkWidthScale(),
  };
}
