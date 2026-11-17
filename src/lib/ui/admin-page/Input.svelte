<script lang="ts">
  import type { InputProps } from '$lib/types';

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    disabled = false,
    required = false,
    class: className = '',
    id,
    oninput,
    onkeydown,
    ...rest
  }: InputProps = $props();

	const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed';
</script>

<input
	{type}
	{id}
	bind:value
	{placeholder}
	{disabled}
	{required}
	{oninput}
	{onkeydown}
	class="{baseClasses} {className}"
	{...rest}
/>
