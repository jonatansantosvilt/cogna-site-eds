import {
  buildBlock,
  decorateBlock,
  loadBlock,
  toClassName,
} from '../../scripts/aem.js';
import loadSVG from '../../scripts/loader.js';
import { loadFragment } from '../fragment/fragment.js';

function getTabId(tabElement) {
  return toClassName(tabElement.textContent);
}

function createTabList() {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-orientation', 'horizontal');
  return tablist;
}

function decorateTabPanel(panel, id, isActive, tabContentStyle) {
  panel.className = 'tabs-panel';
  panel.id = `tabpanel-${id}`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `tab-${id}`);
  panel.setAttribute('aria-hidden', String(!isActive));
  panel.setAttribute('tab-content-style', tabContentStyle);
}

function extractPath(url) {
  const match = url.match(/^https?:\/\/[^/]+(\/.*)?$/);
  return match?.[1] ?? url;
}

function extractPanelMetadata(panel) {
  const extras = Array.from(panel.children);
  const iconElement = extras[1];
  const tabContentStyleElement = extras[2];
  const linkElement = extras[3];

  return {
    iconName: iconElement?.textContent.trim(),
    iconSource: iconElement,
    fragmentPath: extractPath(linkElement?.querySelector('a')?.href),
    fragmentSource: linkElement,
    tabContentStyle: tabContentStyleElement?.textContent.trim(),
    tabContentStyleSource: tabContentStyleElement,
  };
}

function createTabButton(tabElement, id, isActive) {
  const button = document.createElement('button');
  button.className = 'tabs-tab';
  button.id = `tab-${id}`;
  button.type = 'button';
  button.innerHTML = tabElement.innerHTML;
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-controls', `tabpanel-${id}`);
  button.setAttribute('aria-selected', String(isActive));
  button.setAttribute('tabindex', isActive ? '0' : '-1');
  return button;
}

async function attachIcon(button, iconSource, iconName) {
  if (!iconSource) return;
  if (!iconName) {
    iconSource.remove();
    return;
  }
  const svg = await loadSVG(`icons/${iconName}`);
  if (!svg) {
    iconSource.remove();
    return;
  }
  svg.classList.add('tabs-tab-icon');
  svg.setAttribute('aria-hidden', 'true');
  iconSource.remove();
  button.append(svg);
}

async function loadPanelContent(panel, fragmentPath) {
  const fragment = await loadFragment(fragmentPath);
  if (!fragment) return;
  const tabContentStyle = panel.getAttribute('tab-content-style');
  if (tabContentStyle && tabContentStyle === 'card-carousel') {
    const cardsBlock = fragment.querySelector('[data-block-name="cards"]');
    const cardsWrapper = cardsBlock?.closest('.cards-wrapper');
    const cardCarouselBlock = buildBlock('card-carousel', cardsBlock.innerHTML);
    cardsWrapper.replaceChildren(cardCarouselBlock);
    decorateBlock(cardCarouselBlock);
    await loadBlock(cardCarouselBlock);
    panel.append(cardCarouselBlock);

    return;
  }
  panel.append(...fragment.childNodes);
}

function createTabsState() {
  const buttonToPanel = new WeakMap();
  const panelLoaders = new WeakMap();
  const buttons = [];
  let activeButton = null;
  let activePanel = null;

  function loadOnce(panel) {
    const loader = panelLoaders.get(panel);
    if (!loader) return;
    panelLoaders.delete(panel);
    loader();
  }

  return {
    buttons,
    register(button, panel, loader, isActive) {
      buttons.push(button);
      buttonToPanel.set(button, panel);
      if (loader) panelLoaders.set(panel, loader);
      if (isActive) {
        activeButton = button;
        activePanel = panel;
        loadOnce(panel);
      }
    },
    activate(button) {
      if (button === activeButton) return;
      const panel = buttonToPanel.get(button);
      if (!panel) return;

      if (activeButton) {
        activeButton.setAttribute('aria-selected', 'false');
        activeButton.setAttribute('tabindex', '-1');
        activePanel.setAttribute('aria-hidden', 'true');
      }

      button.setAttribute('aria-selected', 'true');
      button.setAttribute('tabindex', '0');
      panel.setAttribute('aria-hidden', 'false');

      activeButton = button;
      activePanel = panel;

      loadOnce(panel);
    },
  };
}

async function buildTab(panel, fragment, state) {
  const tabElement = panel.firstElementChild;
  if (!tabElement) return;

  const id = getTabId(tabElement);
  if (!id) return;

  const {
    iconName,
    iconSource,
    fragmentPath,
    fragmentSource,
    tabContentStyle,
    tabContentStyleSource,
  } = extractPanelMetadata(panel);

  if (tabContentStyleSource) tabContentStyleSource.remove();

  const isActive = state.buttons.length === 0;
  decorateTabPanel(panel, id, isActive, tabContentStyle);

  const button = createTabButton(tabElement, id, isActive);

  const loader = fragmentPath
    ? () => loadPanelContent(panel, fragmentPath)
    : null;

  state.register(button, panel, loader, isActive);
  fragment.append(button);
  tabElement.remove();

  if (fragmentSource) fragmentSource.remove();

  await attachIcon(button, iconSource, iconName);
}

function setupClickDelegation(tablist, state) {
  tablist.addEventListener('click', (event) => {
    const button = event.target.closest('button[role="tab"]');
    if (button && tablist.contains(button)) state.activate(button);
  });
}

export default async function decorate(block) {
  const tablist = createTabList();
  const fragment = document.createDocumentFragment();
  const state = createTabsState();
  await Promise.all(
    [...block.children].map((panel) => buildTab(panel, fragment, state)),
  );
  tablist.append(fragment);
  setupClickDelegation(tablist, state);
  block.prepend(tablist);
}
