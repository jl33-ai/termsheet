import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		marketLink: {
			setMarketLink: (attrs: { outcome_id: string }) => ReturnType;
			unsetMarketLink: () => ReturnType;
			setLastPriceForOutcome: (attrs: {
				outcome_id: string;
				last_price: string | null;
			}) => ReturnType;
		};
	}
}

export const MarketLink = Mark.create({
	name: 'marketLink',

	addOptions() {
		return {
			HTMLAttributes: { class: 'market-mark' }
		};
	},

	addAttributes() {
		return {
			outcome_id: {
				default: null,
				parseHTML: (element) => (element as HTMLElement).getAttribute('data-outcome-id'),
				renderHTML: (attributes) => {
					const v = (attributes as any)?.outcome_id;
					return v ? { 'data-outcome-id': v } : {};
				}
			},
			last_price: {
				default: null,
				parseHTML: (element) => (element as HTMLElement).getAttribute('data-last-price'),
				renderHTML: (attributes) => {
					const v = (attributes as any)?.last_price;
					return v ? { 'data-last-price': v } : {};
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-outcome-id]'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
		return ['span', attrs, 0];
	},

	addCommands() {
		return {
			setMarketLink:
				(attrs) =>
				({ commands }) => {
					return commands.setMark(this.name, attrs);
				},
			unsetMarketLink:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name),
			setLastPriceForOutcome:
				({ outcome_id, last_price }) =>
				({ state, tr, dispatch }) => {
					if (!outcome_id) return false;
					let changed = false;
					state.doc.descendants((node, pos) => {
						if (!node.isText) return true;
						const textLen = node.nodeSize;
						for (const mark of node.marks) {
							if (mark.type === this.type && mark.attrs?.outcome_id === outcome_id) {
								const from = pos;
								const to = pos + textLen;
								const oldMark = mark;
								const newAttrs = { ...mark.attrs, last_price } as any;
								const newMark = this.type.create(newAttrs);
								tr.removeMark(from, to, oldMark);
								tr.addMark(from, to, newMark);
								changed = true;
							}
						}
						return true;
					});
					if (changed && dispatch) dispatch(tr);
					return changed;
				}
		};
	}
});
