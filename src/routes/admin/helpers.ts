import { appToast } from '$lib/ui/toast.ts';

export function copyMarketId(marketId: string) {
	navigator.clipboard.writeText(marketId);
	appToast.success('Market ID copied!');
}
