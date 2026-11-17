import { getContext, setContext } from 'svelte';

export const UI_BREAKPOINT_CONTEXT = 'UI_BREAKPOINT_CONTEXT';

export class BreakpointStore {
  isMobile = $state(false);

  private mql: MediaQueryList | null = null;
  private handler = (e: MediaQueryListEvent | MediaQueryList) => {
    this.isMobile = 'matches' in e ? e.matches : false;
  };

  start() {
    if (typeof window === 'undefined') return;
    try {
      this.mql = window.matchMedia('(max-width: 767px)');
      this.isMobile = this.mql.matches;
      const cb = (e: MediaQueryListEvent) => this.handler(e);
      // Safari still uses addListener/removeListener
      // @ts-ignore
      if (this.mql.addEventListener) this.mql.addEventListener('change', cb);
      else this.mql.addListener(cb);
    } catch {
      this.isMobile = false;
    }
  }
}

export const setBreakpoint = () => {
  const store = new BreakpointStore();
  store.start();
  setContext(UI_BREAKPOINT_CONTEXT, store);
  return store;
};

export const getBreakpoint = (): BreakpointStore | undefined => getContext(UI_BREAKPOINT_CONTEXT);

