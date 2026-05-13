// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';

function createTabList() {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');
  return tablist;
}

function getTabId(tabElement) {
  return toClassName(tabElement.textContent);
}

function decorateTabPanel(panel, id, isActive) {
  panel.className = 'tabs-panel';
  panel.id = `tabpanel-${id}`;
  panel.setAttribute('aria-hidden', !isActive);
  panel.setAttribute('aria-labelledby', `tab-${id}`);
  panel.setAttribute('role', 'tabpanel');
}

function createTabButton(tabElement, id, isActive) {
  const button = document.createElement('button');
  button.className = 'tabs-tab';
  button.id = `tab-${id}`;
  button.innerHTML = tabElement.innerHTML;
  button.setAttribute('aria-controls', `tabpanel-${id}`);
  button.setAttribute('aria-selected', isActive);
  button.setAttribute('role', 'tab');
  button.setAttribute('type', 'button');
  return button;
}

function activateTab(block, tablist, button, panel) {
  block.querySelectorAll('[role=tabpanel]').forEach((p) => {
    p.setAttribute('aria-hidden', true);
  });
  tablist.querySelectorAll('button').forEach((btn) => {
    btn.setAttribute('aria-selected', false);
  });
  panel.setAttribute('aria-hidden', false);
  button.setAttribute('aria-selected', true);
}

function buildTab(block, tablist, panel, isActive) {
  const tabElement = panel.firstElementChild;
  if (!tabElement) return false;

  const id = getTabId(tabElement);
  if (!id) return false;

  decorateTabPanel(panel, id, isActive);
  const button = createTabButton(tabElement, id, isActive);

  button.addEventListener('click', () => {
    activateTab(block, tablist, button, panel);
  });

  tablist.append(button);
  tabElement.remove();
  return true;
}

export default async function decorate(block) {
  const tablist = createTabList();
  const panels = [...block.children];

  let activeAssigned = false;
  panels.forEach((panel) => {
    const shouldBeActive = !activeAssigned;
    const built = buildTab(block, tablist, panel, shouldBeActive);
    if (built && shouldBeActive) activeAssigned = true;
  });

  block.prepend(tablist);
}
