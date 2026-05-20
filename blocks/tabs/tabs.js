import {
  buildBlock,
  decorateBlock,
  loadBlock,
  toClassName,
} from '../../scripts/aem.js';
import loadSVG from '../../scripts/loader.js';
import createCarouselController from '../../scripts/carousel-controller.js';
import { loadFragment } from '../fragment/fragment.js';

const ARROW_LEFT = await loadSVG('icons/carousel-arrow-left');
const ARROW_RIGHT = await loadSVG('icons/carousel-arrow-right');

const CLASSES = {
  tabListWrapper: 'tab-list-wrapper',
  tabsList: 'tabs-list',
  tabsItem: 'tabs-tab-item',
  tabsListViewport: 'tabs-list-viewport',
  tabsListButton: 'tabs-list-button',
  tabsListPrev: 'tabs-list-button--prev',
  tabsListNext: 'tabs-list-button--next',
  carouselActive: 'is-carousel',
};

const MOBILE_MEDIA_QUERY = '(max-width: 639px)';
const MOBILE_ITEMS_PER_VIEW = 3;

function getTabId(tabElement) {
  return toClassName(tabElement.textContent);
}

function createTabList() {
  const tablist = document.createElement('ul');
  tablist.className = CLASSES.tabsList;
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-orientation', 'horizontal');
  return tablist;
}

function createTabItem(button) {
  const item = document.createElement('li');
  item.className = CLASSES.tabsItem;
  item.setAttribute('role', 'presentation');
  item.append(button);
  return item;
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

  async function loadOnce(panel) {
    const loader = panelLoaders.get(panel);
    if (!loader) return;
    await loader();
    panelLoaders.delete(panel);
  }

  return {
    buttons,
    async register(button, panel, loader, isActive) {
      buttons.push(button);
      buttonToPanel.set(button, panel);
      if (loader) panelLoaders.set(panel, loader);
      if (isActive) {
        activeButton = button;
        activePanel = panel;
        await loadOnce(panel);
      }
    },
    async activate(button) {
      if (button === activeButton) return;
      const panel = buttonToPanel.get(button);
      if (!panel) return;

      await loadOnce(panel);

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
    },
  };
}

async function buildTab(panel, state) {
  const tabElement = panel.firstElementChild;
  if (!tabElement) return null;

  const id = getTabId(tabElement);
  if (!id) return null;

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
  tabElement.remove();

  if (fragmentSource) fragmentSource.remove();

  await attachIcon(button, iconSource, iconName);
  return button;
}

function setupClickDelegation(tablist, state) {
  tablist.addEventListener('click', (event) => {
    const button = event.target.closest('button[role="tab"]');
    if (button && tablist.contains(button)) state.activate(button);
  });
}

function createTabListWrapper() {
  const tabListWrapper = document.createElement('div');
  tabListWrapper.className = CLASSES.tabListWrapper;
  return tabListWrapper;
}

function createCarouselNavButton(direction, label, icon) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${CLASSES.tabsListButton} ${
    direction === 'prev' ? CLASSES.tabsListPrev : CLASSES.tabsListNext
  }`;
  button.setAttribute('aria-label', label);
  button.innerHTML = `<span aria-hidden="true">${icon}</span>`;
  button.disabled = true;
  return button;
}

function createCarouselViewport(tablist) {
  const viewport = document.createElement('div');
  viewport.className = CLASSES.tabsListViewport;
  viewport.append(tablist);
  return viewport;
}

function setupTabsCarousel({
  wrapper,
  tablist,
  totalItems,
  prevButton,
  nextButton,
}) {
  if (totalItems <= MOBILE_ITEMS_PER_VIEW) return;

  const controller = createCarouselController({
    totalItems,
    itemsPerView: MOBILE_ITEMS_PER_VIEW,
  });

  const applyState = (carouselState) => {
    const offsetPercent = (carouselState.currentIndex * 100) / carouselState.itemsPerView;
    tablist.style.transform = `translate3d(-${offsetPercent}%, 0, 0)`;
    tablist.style.setProperty('--items-per-view', carouselState.itemsPerView);
    prevButton.disabled = !carouselState.canGoPrev;
    nextButton.disabled = !carouselState.canGoNext;
  };

  prevButton.addEventListener('click', () => controller.prev());
  nextButton.addEventListener('click', () => controller.next());

  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  let unsubscribe = null;

  const activate = () => {
    if (unsubscribe) return;
    wrapper.classList.add(CLASSES.carouselActive);
    unsubscribe = controller.subscribe(applyState);
  };

  const deactivate = () => {
    wrapper.classList.remove(CLASSES.carouselActive);
    tablist.style.transform = '';
    tablist.style.removeProperty('--items-per-view');
    prevButton.disabled = true;
    nextButton.disabled = true;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const handleViewportChange = (event) => {
    if (event.matches) activate();
    else deactivate();
  };

  handleViewportChange(mediaQuery);
  mediaQuery.addEventListener('change', handleViewportChange);
}

export default async function decorate(block) {
  const tabListWrapper = createTabListWrapper();
  const tablist = createTabList();

  const state = createTabsState();

  const buttons = await Promise.all(
    [...block.children].map((panel) => buildTab(panel, state)),
  );

  const items = buttons.filter(Boolean).map(createTabItem);
  tablist.append(...items);

  const viewport = createCarouselViewport(tablist);
  const prevButton = createCarouselNavButton(
    'prev',
    'previous',
    ARROW_LEFT.outerHTML,
  );
  const nextButton = createCarouselNavButton(
    'next',
    'next',
    ARROW_RIGHT.outerHTML,
  );

  tabListWrapper.append(prevButton, viewport, nextButton);

  setupClickDelegation(tablist, state);
  setupTabsCarousel({
    wrapper: tabListWrapper,
    tablist,
    totalItems: items.length,
    prevButton,
    nextButton,
  });

  block.prepend(tabListWrapper);
}
