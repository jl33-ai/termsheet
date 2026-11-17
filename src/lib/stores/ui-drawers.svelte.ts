import { getContext, setContext } from 'svelte';

export const UI_DRAWERS_CONTEXT = 'UI_DRAWERS_CONTEXT';

export class DrawerStore {
  leftOpen = $state(false);
  rightOpen = $state(false);

  openLeft() { this.leftOpen = true; }
  closeLeft() { this.leftOpen = false; }
  openRight() { this.rightOpen = true; }
  closeRight() { this.rightOpen = false; }
}

export const setDrawers = () => {
  const store = new DrawerStore();
  setContext(UI_DRAWERS_CONTEXT, store);
  return store;
};

export const getDrawers = (): DrawerStore | undefined => getContext(UI_DRAWERS_CONTEXT);

