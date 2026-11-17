<script lang="ts">
	import Icon from '@iconify/svelte';

	// Keep existing API, add optional snippet props to mirror example
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		closeOnEsc = true,
		closeOnOutside = true,
		onClose = null,
		minWidth = '28rem',
		header,
		children,
		footer,
		class: className = ''
	} = $props<{
		open?: boolean;
		closeOnEsc?: boolean;
		closeOnOutside?: boolean;
		onClose?: (() => void) | null;
		minWidth?: string;
		header?: Snippet;
		children?: Snippet;
		footer?: Snippet;
		class?: string;
	}>();

	let dialog = $state<HTMLDialogElement | null>(null);

	function close() {
		if (dialog?.open) dialog.close();
		open = false;
		onClose?.();
	}

	// Sync prop -> native dialog
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	// Handle ESC via dialog's cancel event
	function oncancel(e: Event) {
		if (!closeOnEsc) {
			e.preventDefault();
		}
	}

	function onclickDialog(e: MouseEvent) {
		if (!dialog) return;
		if (closeOnOutside && e.target === dialog) dialog.close();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	onclose={() => (open = false, onClose?.())}
	oncancel={oncancel}
	onclick={onclickDialog}
>
	<div class={`relative max-w-lg rounded-sm border border-border bg-white p-4 shadow-sm ${className}`}
			 style:min-width={minWidth}
	>
		<!-- Close button -->
		<button
			type="button"
			class="absolute right-2 top-2 app-text-button p-1"
			aria-label="Close"
			onclick={close}
		>
			<Icon icon="bx:x" class="text-lg" />
		</button>

		<!-- Header (snippet) -->
		<div class="mb-2">
			{@render header?.()}
		</div>

		<!-- Content (snippet) -->
		<div>
			{@render children?.()}
		</div>

		<!-- Footer (snippet, optional) -->
		{@render footer?.()}
	</div>
</dialog>

<style>
    dialog {
        border-radius: 0.2em;
        border: none;
        padding: 0;
        /* center in viewport */
        inset: 0;
        margin: auto;
    }

    dialog::backdrop {
        background: rgba(0, 0, 0, 0.3);
    }

    dialog[open] {
        animation: zoom 0.14s ease-out;
    }

    @keyframes zoom {
        from {
            transform: scale(0.95);
        }
        to {
            transform: scale(1);
        }
    }

    dialog[open]::backdrop {
        animation: fade 0.14s ease-out;
    }

    @keyframes fade {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
</style>
