export {
  THEME,
  COLORS,
  FONTS,
  SIZES,
  LAYOUT,
} from "./config/theme";

export {
  createAllScales,
  createPlatformRadiusScale,
  createBuildingBlockRadiusScale,
  createLinkDistanceScale,
  createLinkWidthScale,
} from "./config/scales";

export {
  PI,
  TAU,
  mod,
  sq,
  isInteger,
  clamp,
  lerp,
  distance,
  toRadians,
  toDegrees,
  round,
  cos,
  sin,
  min,
  max,
  sqrt,
  abs,
  floor,
  ceil,
} from "./utils/helpers";

export {
  VALID_NODE_TYPES,
  isValidNode,
  isValidLink,
  getLinkNodeId,
  isPositioned,
  filterValidNodes,
  filterValidLinks,
  resolveLinkReferences,
} from "./utils/validation";

export {
  isDebugEnabled,
  enableDebug,
  disableDebug,
  debugLog,
  debugWarn,
  debugError,
  debugGroup,
  debugTime,
  createLogger,
} from "./utils/debug";

export {
  CANVAS_DEFAULTS,
  createCanvas,
  styleCanvas,
  styleBackgroundCanvas,
  styleHoverCanvas,
  styleContainer,
  setCanvasSize,
  scaleContext,
  clearCanvas,
  fillCanvas,
  createCanvasStack,
  resizeCanvasStack,
  getPixelRatio,
} from "./render/canvas";

export {
  setFont,
  setBuildingBlockFont,
  setPlatformFont,
  renderText,
  getLines,
  splitString,
  drawTextAlongArc,
  measureText,
  drawMultilineText,
} from "./render/text";

export type {
  NodeType,
  PlatformData,
  BuildingBlockData,
  LinkData,
  VisualizationNode,
  InteractionState,
  DelaunayData,
  ZoomState,
  PreparedData,
  NetworkData,
} from "./types";

export const VERSION = "3.0.0";
