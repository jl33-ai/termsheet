<script lang="ts">
    // When this page opens (after OAuth callback), notify the opener and try to close.
    $effect(() => {
        try {
            const bc = new BroadcastChannel('auth');
            bc.postMessage({ t: 'complete' });
            // Give the message a tick to flush before closing
            setTimeout(() => {
                try { window.close(); } catch {}
            }, 50);
        } catch {}
    });
</script>

<div class="mx-auto max-w-md px-4 py-6">
    <div class="rounded-sm border border-border p-4">
        <h1 class="mb-2 text-lg font-medium text-title">Login complete</h1>
        <p class="mb-3 text-sm text-muted">You can return to your previous tab. This window will close automatically.</p>
        <a href="/" class="text-sm text-accent">Go to home</a>
    </div>
    
</div>

