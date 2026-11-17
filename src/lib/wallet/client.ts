import {
	createConfig,
	connect,
	disconnect,
	getAccount,
	reconnect,
	watchAccount,
	writeContract,
	waitForTransactionReceipt,
	type Config
} from '@wagmi/core';
import { injected } from '@wagmi/connectors';
import { http, parseUnits } from 'viem';
import type { Address } from 'viem';
import { DEFAULT_CHAIN, USDC_ADDRESS, USDC_DECIMALS } from './constants';

// Minimal ERC20 ABI for transfer
const ERC20_ABI = [
	{
		type: 'function',
		name: 'transfer',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'to', type: 'address' },
			{ name: 'value', type: 'uint256' }
		],
		outputs: [{ name: '', type: 'bool' }]
	}
] as const;

let config: Config | null = null;

export function getConfig() {
	if (!config) {
		config = createConfig({
			chains: [DEFAULT_CHAIN],
			connectors: [injected()],
			transports: { [DEFAULT_CHAIN.id]: http() }
		});
	}
	return config;
}

export async function ensureReconnected() {
	await reconnect(getConfig());
}

export function onAccountChange(cb: (account: ReturnType<typeof getAccount>) => void) {
	const unwatch = watchAccount(getConfig(), { onChange: cb });
	return unwatch;
}

export async function connectInjected() {
	return connect(getConfig(), { connector: injected() });
}

export async function disconnectWallet() {
	return disconnect(getConfig());
}

export function currentAccount() {
	return getAccount(getConfig());
}

export async function transferUsdc({ to, amountDecimal }: { to: Address; amountDecimal: number }) {
	if (!to) throw new Error('Recipient is required');
	if (!amountDecimal || amountDecimal <= 0) throw new Error('Amount must be > 0');

	const token = USDC_ADDRESS[DEFAULT_CHAIN.id];
	const value = parseUnits(String(amountDecimal), USDC_DECIMALS);

	const hash = await writeContract(getConfig(), {
		address: token,
		abi: ERC20_ABI,
		functionName: 'transfer',
		args: [to, value]
	});

	const receipt = await waitForTransactionReceipt(getConfig(), { hash });
	return { hash, receipt };
}
