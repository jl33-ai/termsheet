import { mainnet } from 'viem/chains';

export const DEFAULT_CHAIN = mainnet;

// Canonical USDC (Ethereum Mainnet)
export const USDC_DECIMALS = 6;
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
	[mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};
