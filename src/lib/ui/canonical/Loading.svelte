<script lang="ts">
	let { size = 14 } = $props();
</script>

<div class="svg-spinner-container" style="width: {size}px; height: {size}px;">
	<svg viewBox="0 0 24 24" width="100%" height="100%">
		<circle
			class="svg-spinner-circle"
			cx="12"
			cy="12"
			r="10"
			fill="none"
			stroke="var(--c-faint)"
			stroke-width="2"
			stroke-dasharray="56.5487"
			stroke-dashoffset="15.7"
			stroke-linecap="round"
		/>
	</svg>
</div>

<style>
    .svg-spinner-container {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .svg-spinner-circle {
        transform-origin: center;
        animation: svg-spin 0.71s linear infinite;
    }

    @keyframes svg-spin {
        100% {
            transform: rotate(360deg);
        }
    }
</style>
