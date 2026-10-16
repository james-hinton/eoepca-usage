import { createPlatformNetworkVisual } from "./chart";
import { MOBILE_BREAKPOINT, LAYOUT, applyBranding, type BrandingColors } from './config/theme';
import type { NetworkData } from './types';

interface Config {
  title?: string;
  description?: string;
  network_name?: string;
  ring_node_padding?: number;
  branding?: BrandingColors;
}

const configResponse = await fetch("data/config.json");
if (!configResponse.ok) {
  document.getElementById("chart-container")!.innerHTML =
    '<p style="color: red; padding: 20px;">Error: Could not load config.json. Create public/data/config.json for local development.</p>';
  throw new Error("Failed to load config.json");
}
const config: Config = await configResponse.json();

if (config.branding) {
  applyBranding(config.branding);
}

const networkName = config.network_name || "";
const ringNodePadding = config.ring_node_padding || LAYOUT.ringNodePadding;

document.getElementById("title-network-name")!.textContent = networkName;
if (config.title) document.title = config.title;
if (config.description)
  document.getElementById("chart-description")!.textContent =
    config.description;
if (config.branding?.primary_color) {
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', config.branding.primary_color);
}

const container = document.getElementById("chart-container")!;
const wrapper = document.getElementById("chart-wrapper")!;

function getChartDimensions(): { width: number; height: number } {
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    // Square canvas sized to viewport height — overflows width, user pans to explore
    return { width: window.innerHeight, height: window.innerHeight };
  }
  const wrapperRect = wrapper.getBoundingClientRect();
  let availableWidth = wrapperRect.width - 40;
  if (availableWidth < 400) {
    availableWidth = Math.min(window.innerWidth - 40, 1400 - 40);
  }
  const s = Math.max(availableWidth, 320);
  return { width: s, height: s };
}

let dims = getChartDimensions();
container.style.height = dims.height + "px";

const platformNetworkVisual = createPlatformNetworkVisual(container, ringNodePadding);
platformNetworkVisual.width(dims.width).height(dims.height);

document.fonts.ready.then(() => {
  fetch("data/network.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load network.json: ${res.status}`);
      return res.json();
    })
    .then((data: NetworkData) => {
      const loadingEl = document.getElementById("chart-loading");
      if (loadingEl) loadingEl.remove();
      platformNetworkVisual(data);
      handleLayoutResize();
      window.addEventListener('resize', handleLayoutResize);
    })
    .catch((err) => {
      console.error("Error loading data:", err);
      document.getElementById("chart-container")!.innerHTML =
        '<p style="color: red; padding: 20px;">Error loading data/network.json.</p>';
    });
});

let isMobileLayout = false;

function handleLayoutResize(): void {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  if (isMobile && !isMobileLayout) {
    setupMobileLayout();
  } else if (!isMobile && isMobileLayout) {
    restoreDesktopLayout();
  }
}

function restoreDesktopLayout(): void {
  const chartIntro = document.getElementById('chart-introduction');
  const chartTitle = document.getElementById('chart-title');
  const chartIntroText = document.getElementById('chart-intro-text');

  if (chartIntro && chartTitle) chartIntro.insertBefore(chartTitle, chartIntro.firstChild);
  if (chartIntro && chartIntroText) chartIntro.appendChild(chartIntroText);
  const chartWrapper = document.getElementById('chart-wrapper');
  const chartLegend = document.getElementById('chart-legend');
  const mobileInfoOverlay = document.getElementById('mobile-info-overlay');
  if (chartWrapper && chartLegend && mobileInfoOverlay) {
    chartWrapper.insertBefore(chartLegend, mobileInfoOverlay);
  }

  isMobileLayout = false;
}

function setupMobileLayout(): void {
  if (window.innerWidth > MOBILE_BREAKPOINT) return;

  // Move intro content into info overlay
  const infoContent = document.getElementById('mobile-info-content')!;
  const chartTitle = document.getElementById('chart-title')!;
  const chartIntroText = document.getElementById('chart-intro-text')!;
  infoContent.appendChild(chartTitle);
  infoContent.appendChild(chartIntroText);
  const chartLegend = document.getElementById('chart-legend');
  if (chartLegend) infoContent.appendChild(chartLegend);

  // Info overlay open/close
  const infoBtn = document.getElementById('mobile-info-btn')!;
  const infoOverlay = document.getElementById('mobile-info-overlay')!;
  const infoClose = document.getElementById('mobile-info-close')!;

  infoBtn.addEventListener('click', () => infoOverlay.classList.add('active'));
  infoClose.addEventListener('click', () => infoOverlay.classList.remove('active'));
  infoOverlay.addEventListener('click', (e) => {
    if (e.target === infoOverlay) infoOverlay.classList.remove('active');
  });

  // Pan hint — show once on first visit
  const PAN_HINT_KEY = 'eoepca-network-pan-hint-v1';
  if (!localStorage.getItem(PAN_HINT_KEY)) {
    const hint = document.getElementById('mobile-pan-hint');
    if (hint) {
      hint.style.display = 'flex';
      localStorage.setItem(PAN_HINT_KEY, '1');
      setTimeout(() => hint.remove(), 3000);
    }
  }

  isMobileLayout = true;
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
window.addEventListener("resize", function () {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (platformNetworkVisual) {
      const newDims = getChartDimensions();
      container.style.height = newDims.height + "px";
      platformNetworkVisual.width(newDims.width).height(newDims.height).resize();
    }
  }, 300);
});
