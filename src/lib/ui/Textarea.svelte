<script lang="ts">
	let {
		value = $bindable(),
		placeholder = '',
		rows = 4,
		required = false,
		name,
		...rest
	}: {
		value?: any;
		placeholder?: string;
		rows?: number;
		required?: boolean;
		name?: string;
		id?: string;
		oninput?: (e: Event) => any;
		onchange?: (e: Event) => any;
		onkeydown?: (e: KeyboardEvent) => any;
		[key: string]: any;
	} = $props();
</script>

<textarea class="w-full" {rows} {placeholder} {required} {name} bind:value {...rest}></textarea>
