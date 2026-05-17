const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const getMaxIndex = ({ totalItems, itemsPerView }) => Math.max(0, totalItems - itemsPerView);

const canGoNext = (state) => state.currentIndex < getMaxIndex(state);
const canGoPrev = (state) => state.currentIndex > 0;

const reducers = {
  next: (state) => ({
    currentIndex: clamp(state.currentIndex + 1, 0, getMaxIndex(state)),
  }),
  prev: (state) => ({
    currentIndex: clamp(state.currentIndex - 1, 0, getMaxIndex(state)),
  }),
  goTo: (index) => (state) => ({
    currentIndex: clamp(index, 0, getMaxIndex(state)),
  }),
  setItemsPerView: (itemsPerView) => (state) => ({
    itemsPerView,
    currentIndex: clamp(
      state.currentIndex,
      0,
      getMaxIndex({ ...state, itemsPerView }),
    ),
  }),
};

const createEmitter = () => {
  const listeners = new Set();
  return {
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    emit: (payload) => listeners.forEach((fn) => fn(payload)),
  };
};

const createCarouselController = ({
  totalItems,
  itemsPerView = 1,
  initialIndex = 0,
}) => {
  let state = {
    totalItems,
    itemsPerView,
    currentIndex: clamp(
      initialIndex,
      0,
      Math.max(0, totalItems - itemsPerView),
    ),
  };

  const { subscribe, emit } = createEmitter();

  const derive = () => ({
    ...state,
    maxIndex: getMaxIndex(state),
    canGoNext: canGoNext(state),
    canGoPrev: canGoPrev(state),
  });

  const dispatch = (reducer) => {
    const next = { ...state, ...reducer(state) };
    const unchanged = next.currentIndex === state.currentIndex
      && next.itemsPerView === state.itemsPerView;
    if (unchanged) return;
    state = next;
    emit(derive());
  };

  return {
    getState: derive,
    subscribe: (fn) => {
      fn(derive());
      return subscribe(fn);
    },
    next: () => dispatch(reducers.next),
    prev: () => dispatch(reducers.prev),
    goTo: (i) => dispatch(reducers.goTo(i)),
    setItemsPerView: (n) => dispatch(reducers.setItemsPerView(n)),
  };
};

export default createCarouselController;
