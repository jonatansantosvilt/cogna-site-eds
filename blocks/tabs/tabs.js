import { toClassName } from '../../scripts/aem.js';
import loadSVG from '../../scripts/loader.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

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

function decorateTabPanel(panel, id, isActive) {
  panel.className = 'tabs-panel';
  panel.id = `tabpanel-${id}`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `tab-${id}`);
  panel.setAttribute('aria-hidden', String(!isActive));
}

function extractIconSource(panel) {
  const iconElement = panel.children[2];
  if (!iconElement) return { name: null, source: null };
  const name = iconElement.textContent.trim();
  return { name: name || null, source: iconElement };
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
  moveInstrumentation(iconSource, svg);
  iconSource.remove();
  button.append(svg);
}

function createTabsState() {
  const buttonToPanel = new WeakMap();
  const buttons = [];
  let activeButton = null;
  let activePanel = null;

  return {
    buttons,
    register(button, panel, isActive) {
      buttons.push(button);
      buttonToPanel.set(button, panel);
      if (isActive) {
        activeButton = button;
        activePanel = panel;
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
    },
  };
}

async function buildTab(panel, fragment, state) {
  const tabElement = panel.firstElementChild;
  if (!tabElement) return;

  const id = getTabId(tabElement);
  if (!id) return;

  const { name: iconName, source: iconSource } = extractIconSource(panel);
  const isActive = state.buttons.length === 0;
  decorateTabPanel(panel, id, isActive);
  const button = createTabButton(tabElement, id, isActive);
  moveInstrumentation(tabElement, button);
  state.register(button, panel, isActive);
  fragment.append(button);
  tabElement.remove();
  await attachIcon(button, iconSource, iconName);
}

function setupClickDelegation(tablist, state) {
  tablist.addEventListener('click', (event) => {
    const button = event.target.closest('button[role="tab"]');
    if (button && tablist.contains(button)) state.activate(button);
  });
}

const KEY_HANDLERS = {
  ArrowRight: (i, last) => (i === last ? 0 : i + 1),
  ArrowLeft: (i, last) => (i === 0 ? last : i - 1),
  Home: () => 0,
  End: (_, last) => last,
};

function setupKeyboardNav(tablist, state) {
  tablist.addEventListener('keydown', (event) => {
    const handler = KEY_HANDLERS[event.key];
    if (!handler) return;

    const { buttons } = state;
    const current = buttons.indexOf(document.activeElement);
    if (current === -1) return;

    event.preventDefault();
    const next = buttons[handler(current, buttons.length - 1)];
    next.focus();
    state.activate(next);
  });
}

export default async function decorate(block) {
  // const [tab] = [...block.children];
  // const [, , pageBlock] = [...tab.children];
  // const page = await loadFragment(pageBlock.textContent);
  // console.log("🚀 ~ decorate ~ page:", page);
  const tablist = createTabList();
  const fragment = document.createDocumentFragment();
  const state = createTabsState();
  await Promise.all(
    [...block.children].map((panel) => buildTab(panel, fragment, state)),
  );
  tablist.append(fragment);
  setupClickDelegation(tablist, state);
  setupKeyboardNav(tablist, state);
  block.prepend(tablist);
}
