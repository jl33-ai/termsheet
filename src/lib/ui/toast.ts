import toast from 'svelte-hot-french-toast';

// error: ToastHandler;
// success: ToastHandler;
// loading: ToastHandler;
// custom: ToastHandler;
// warning: ToastHandler;
// info: ToastHandler;

// toast.promise(
// 	saveSettings(settings),
// 	{
// 		loading: 'Saving...',
// 		success: 'Settings saved!',
// 		error: 'Could not save.',
// 	}
// );

// toast('Good Job!', {
// 	icon: '👏',
// });

// toast('Hello Darkness!', {
// 	icon: '👏',
// 	style: 'border-radius: 200px; background: #333; color: #fff;'
// });

// toast.success('Look at me!', {
// 	style: 'border: 1px solid #713200; padding: 16px; color: #713200;',
// 	iconTheme: {
// 		primary: '#713200',
// 		secondary: '#FFFAEE'
// 	}
// });
// Provide a thin wrapper that applies sensible defaults
// across all toast usages in the app.

const DEFAULTS = {
	position: 'bottom-end',
	// Slightly longer duration than library defaults
	duration: 4000,
	style: 'font-size: 0.875rem;'
} as const;

// Create a callable wrapper function and copy over helpers
const withDefaults = Object.assign(
	((message: unknown, opts?: Record<string, unknown>) =>
		toast(message as any, { ...DEFAULTS, ...(opts ?? {}) })) as typeof toast,
	{
		success: (message: unknown, opts?: Record<string, any>) => {
			const iconTheme = { ...(opts?.iconTheme ?? {}), primary: 'var(--c-green)' };
			return toast.success(message as any, { ...DEFAULTS, ...(opts ?? {}), iconTheme });
		},
		error: (message: unknown, opts?: Record<string, any>) => {
			const iconTheme = { ...(opts?.iconTheme ?? {}), primary: 'var(--c-red)' };
			return toast.error(message as any, { ...DEFAULTS, ...(opts ?? {}), iconTheme });
		},
		info: (message: unknown, opts?: Record<string, any>) => {
			const iconTheme = { ...(opts?.iconTheme ?? {}), primary: 'var(--c-title)' };
			return toast.info(message as any, { ...DEFAULTS, ...(opts ?? {}), iconTheme });
		},
		warning: (message: unknown, opts?: Record<string, unknown>) =>
			toast.warning(message as any, { ...DEFAULTS, ...(opts ?? {}) }),
		loading: (message: unknown, opts?: Record<string, unknown>) =>
			toast.loading(message as any, { ...DEFAULTS, ...(opts ?? {}) }),
		custom: (renderer: unknown, opts?: Record<string, unknown>) =>
			toast.custom(renderer as any, { ...DEFAULTS, ...(opts ?? {}) }),
		promise: (
			promise: Promise<unknown>,
			messages: { loading: unknown; success: unknown; error: unknown },
			opts?: Record<string, unknown>
		) => toast.promise(promise, messages as any, { ...DEFAULTS, ...(opts ?? {}) }),
		dismiss: (...args: unknown[]) => toast.dismiss(...(args as any)),
		remove: (...args: unknown[]) => toast.remove(...(args as any))
	}
);

export const appToast = withDefaults;
