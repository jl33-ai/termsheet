import type { TooltipArg } from '$lib/types';
import tippy from 'tippy.js';
import 'tippy.js/themes/light-border.css';

	export function tooltip(node: HTMLElement, arg: TooltipArg) {
		let instance: any = null;

		let lastArg: TooltipArg = arg;

		function resolve(argIn: TooltipArg) {
			const content = typeof argIn === 'string' ? argIn : argIn?.content;
			const placement = typeof argIn === 'object' && argIn?.placement ? argIn.placement : 'bottom';
			const interactive = typeof argIn === 'object' && argIn?.interactive ? true : false;
			return {
				content,
				placement,
				interactive
			} as {
				content?: string;
				placement: 'top' | 'bottom' | 'left' | 'right';
				interactive: boolean;
			};
		}

		function hasContent(v?: string) {
			return v !== undefined && v !== null && v !== '';
		}

		function initIfReady() {
			if (instance) return;
			// Avoid touching DOM in SSR
			if (typeof window === 'undefined') return;
			const initial = resolve(lastArg);
			if (!hasContent(initial.content)) return;
			instance = tippy(node, {
				content: initial.content,
				allowHTML: true,
				theme: 'light-border',
				placement: initial.placement,
				interactive: initial.interactive,
				maxWidth: 200,
				delay: [0, 0],
				arrow: false,
				appendTo: () => document.body
			});
		}

	// Try to init immediately on client
	initIfReady();

	return {
		update(newArg: TooltipArg) {
			lastArg = newArg;
			const next = resolve(newArg);
			// If no content provided, ensure tooltip is not shown
			if (!hasContent(next.content)) {
				if (instance) {
					instance.hide?.();
					instance.destroy?.();
					instance = null;
				}
				return;
			}
			// Ensure instance exists when content is present
			if (!instance) {
				initIfReady();
				if (!instance) return;
			}
			instance.setProps?.({ placement: next.placement, interactive: next.interactive });
			if (typeof next.content === 'string') instance.setContent?.(next.content);
		},
		destroy() {
			instance?.destroy?.();
			instance = null;
		}
	};
}

export function esc(s: string | null | undefined): string {
	return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build standardized tooltip HTML content with title and subtitle. */
export function tooltipContent(title: string, subtitle: string, actionHtml?: string): string {
	const t = esc(title);
	const s = esc(subtitle);
	// Include semantic hooks; styled via global tooltip.css
	const titleHtml = t ? `<div class=\"tooltip-title\">${t}</div>` : '';
	const action = actionHtml ? `<div class=\"mt-2\">${actionHtml}</div>` : '';
	return `<div>${titleHtml}<div class=\"tooltip-body\">${s}</div>${action}</div>`;
}
