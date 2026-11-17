import { getContext, setContext } from 'svelte';

export const UI_MODAL_CONTEXT = 'UI_MODAL_CONTEXT';

export type AddCommentModalData = {
  kind: 'addComment';
  marketId: string;
  transactionId: string;
  message?: string;
};

export type ContributeSourceModalData = {
  kind: 'contributeSource';
  marketId: string;
};

export type ModalData = AddCommentModalData | ContributeSourceModalData;
// Extendable: add 'register' modal type
export type RegisterModalData = { kind: 'register' };
export type AnyModalData = ModalData | RegisterModalData;

export class ModalStore {
  open = $state(false);
  data = $state<AnyModalData | null>(null);

  show(data: AnyModalData) {
    this.data = data;
    this.open = true;
  }

  close() {
    this.open = false;
    this.data = null;
  }
}

export const setModal = () => {
  const store = new ModalStore();
  setContext(UI_MODAL_CONTEXT, store);
  return store;
};

export const getModal = (): ModalStore | undefined => getContext(UI_MODAL_CONTEXT);
