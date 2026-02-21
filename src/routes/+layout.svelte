<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";

    let { children } = $props();

    onMount(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch(console.error);
        }
    });
</script>

<svelte:head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#171717" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
</svelte:head>

<div class="dark min-h-screen bg-[var(--color-bg)]">
    {@render children()}
</div>
