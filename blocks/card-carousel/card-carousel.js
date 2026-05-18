import createCarouselController from '../../scripts/carousel-controller.js';
import loadSVG from '../../scripts/loader.js';

const ARROW_LEFT = await loadSVG('icons/carousel-arrow-left');
const ARROW_RIGHT = await loadSVG('icons/carousel-arrow-right');

const BREAKPOINTS = [
  { minWidth: 1024, itemsPerView: 3 },
  { minWidth: 640, itemsPerView: 2 },
  { minWidth: 0, itemsPerView: 1 },
];

const CLASSES = {
  viewport: 'carousel-viewport',
  track: 'carousel-track',
  list: 'carousel-list',
  item: 'carousel-item',
  itemInner: 'carousel-item-inner',
  controls: 'carousel-controls',
  button: 'carousel-button',
  prev: 'carousel-button--prev',
  next: 'carousel-button--next',
};

function itemsPerViewFor(width, bps = BREAKPOINTS) {
  return bps.find((bp) => width >= bp.minWidth)?.itemsPerView ?? 1;
}

function translateFor({ currentIndex, itemsPerView }) {
  return `translate3d(-${(100 / itemsPerView) * currentIndex}%, 0, 0)`;
}

const createButton = (label, classes, icon) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `${CLASSES.button} ${classes}`;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `<span aria-hidden="true">${icon}</span>`;
  return btn;
};

const createControls = () => {
  const root = document.createElement('div');
  root.className = CLASSES.controls;
  const prev = createButton('Previous', CLASSES.prev, ARROW_LEFT.outerHTML);
  const next = createButton('Next', CLASSES.next, ARROW_RIGHT.outerHTML);
  root.append(prev, next);
  return { root, prev, next };
};

const wrapItem = (li) => {
  const inner = document.createElement('div');
  inner.className = CLASSES.itemInner;
  while (li.firstChild) inner.appendChild(li.firstChild);
  li.appendChild(inner);
  li.classList.add(CLASSES.item);
};

const wrapList = (list) => {
  const viewport = document.createElement('div');
  viewport.className = CLASSES.viewport;

  const track = document.createElement('div');
  track.className = CLASSES.track;

  list.classList.add(CLASSES.list);
  Array.from(list.children).forEach(wrapItem);

  list.parentNode.insertBefore(viewport, list);
  track.appendChild(list);
  viewport.appendChild(track);
  return { viewport, track };
};

const bindRender = (controller, { track, prev, next }) => controller.subscribe((state) => {
  track.style.transform = translateFor(state);
  track.style.setProperty('--items-per-view', state.itemsPerView);
  prev.disabled = !state.canGoPrev;
  next.disabled = !state.canGoNext;
});

const bindControls = (controller, { prev, next }) => {
  prev.addEventListener('click', controller.prev);
  next.addEventListener('click', controller.next);
};

const bindKeyboard = (controller, viewport) => {
  viewport.tabIndex = 0;
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      controller.next();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      controller.prev();
    }
  });
};

const bindResponsiveness = (controller, element) => {
  const update = () => controller.setItemsPerView(itemsPerViewFor(element.clientWidth));
  const observer = new ResizeObserver(update);
  observer.observe(element);
  update();
  return () => observer.disconnect();
};

export default function decorate(block) {
  const list = block.querySelector('ul');
  if (!list || list.children.length === 0) return;

  const { viewport, track } = wrapList(list);
  const { root: controls, prev, next } = createControls();
  block.appendChild(controls);

  const controller = createCarouselController({
    totalItems: list.children.length,
    itemsPerView: itemsPerViewFor(block.clientWidth || window.innerWidth),
  });

  const view = {
    viewport,
    track,
    prev,
    next,
  };

  bindRender(controller, view);
  bindControls(controller, view);
  bindKeyboard(controller, viewport);
  bindResponsiveness(controller, block);
}
