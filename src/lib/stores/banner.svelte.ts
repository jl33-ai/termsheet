import { getContext, setContext } from 'svelte';

export const BANNER_CONTEXT = 'BANNER_CONTEXT';

export type BannerState = {
	content: string;
	icon?: string;
};

export class BannerStore {
	state = $state<BannerState | null>(null);

	set(content: string, icon?: string) {
		this.state = { content, icon };
	}

	clear() {
		this.state = null;
	}
}

export const setBanner = () => {
	const state = new BannerStore();
	setContext(BANNER_CONTEXT, state);
	return state;
};

export const getBanner = (): BannerStore | undefined => getContext(BANNER_CONTEXT);
