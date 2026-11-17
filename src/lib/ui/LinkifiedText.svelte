<script lang="ts">
	import { linkify } from '$lib/text';

    let { text, extraClass = '' } = $props<{
        text: string | null | undefined;
        extraClass?: string;
    }>();

    const html = $derived.by(() => linkify(text ?? ''));
</script>

<div class={`text-sm text-base ${extraClass}`}>
    {@html html}
</div>
