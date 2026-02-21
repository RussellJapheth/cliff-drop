<script lang="ts">
    let password = $state("");
    let error = $state("");
    let loading = $state(false);

    async function handleLogin(event: Event) {
        event.preventDefault();
        error = "";
        loading = true;

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (!response.ok) {
                error = data.error || "Login failed";
                return;
            }

            // Redirect to home
            window.location.href = "/";
        } catch {
            error = "An error occurred. Please try again.";
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Login - Drop</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-[var(--color-text)]">Drop</h1>
            <p class="text-[var(--color-text-muted)] mt-2">
                Cross-device sharing
            </p>
        </div>

        <form onsubmit={handleLogin} class="space-y-4">
            <div>
                <label
                    for="password"
                    class="block text-sm font-medium text-[var(--color-text-muted)] mb-2"
                >
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    placeholder="Enter your password"
                    required
                    autocomplete="current-password"
                    class="w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
            </div>

            {#if error}
                <div class="text-red-500 text-sm text-center">{error}</div>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="w-full py-3 px-4 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? "Signing in..." : "Sign in"}
            </button>
        </form>
    </div>
</div>
