<script lang="ts">
    let showMenu = $state(false);
    let showPasswordModal = $state(false);
    let currentPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let passwordError = $state("");
    let passwordLoading = $state(false);

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
        } catch {
            console.error("Logout failed");
        }
    }

    async function handlePasswordChange(event: Event) {
        event.preventDefault();
        passwordError = "";

        if (newPassword !== confirmPassword) {
            passwordError = "Passwords do not match";
            return;
        }

        if (newPassword.length < 8) {
            passwordError = "Password must be at least 8 characters";
            return;
        }

        passwordLoading = true;

        try {
            const response = await fetch("/api/auth/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                passwordError = data.error || "Failed to change password";
                return;
            }

            showPasswordModal = false;
            currentPassword = "";
            newPassword = "";
            confirmPassword = "";
        } catch {
            passwordError = "An error occurred";
        } finally {
            passwordLoading = false;
        }
    }

    function closeMenu() {
        showMenu = false;
    }
</script>

<header class="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
    <div class="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 class="text-xl font-bold text-[var(--color-text)]">Drop</h1>

        <div class="relative">
            <button
                onclick={() => (showMenu = !showMenu)}
                class="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                aria-label="Menu"
            >
                <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                </svg>
            </button>

            {#if showMenu}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="fixed inset-0 z-40" onclick={closeMenu}></div>
                <div
                    class="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50"
                >
                    <button
                        onclick={() => {
                            showPasswordModal = true;
                            showMenu = false;
                        }}
                        class="w-full px-4 py-2 text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded-t-lg"
                    >
                        Change Password
                    </button>
                    <button
                        onclick={handleLogout}
                        class="w-full px-4 py-2 text-left text-red-500 hover:bg-[var(--color-surface-hover)] rounded-b-lg"
                    >
                        Sign Out
                    </button>
                </div>
            {/if}
        </div>
    </div>
</header>

<!-- Password change modal -->
{#if showPasswordModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onclick={() => (showPasswordModal = false)}
    >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 w-full max-w-sm"
            onclick={(e) => e.stopPropagation()}
        >
            <h2 class="text-lg font-semibold text-[var(--color-text)] mb-4">
                Change Password
            </h2>

            <form onsubmit={handlePasswordChange} class="space-y-4">
                <div>
                    <label
                        for="current-password"
                        class="block text-sm text-[var(--color-text-muted)] mb-1"
                        >Current Password</label
                    >
                    <input
                        type="password"
                        id="current-password"
                        bind:value={currentPassword}
                        required
                        class="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                </div>

                <div>
                    <label
                        for="new-password"
                        class="block text-sm text-[var(--color-text-muted)] mb-1"
                        >New Password</label
                    >
                    <input
                        type="password"
                        id="new-password"
                        bind:value={newPassword}
                        required
                        minlength="8"
                        class="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                </div>

                <div>
                    <label
                        for="confirm-password"
                        class="block text-sm text-[var(--color-text-muted)] mb-1"
                        >Confirm Password</label
                    >
                    <input
                        type="password"
                        id="confirm-password"
                        bind:value={confirmPassword}
                        required
                        class="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                </div>

                {#if passwordError}
                    <p class="text-red-500 text-sm">{passwordError}</p>
                {/if}

                <div class="flex gap-3">
                    <button
                        type="button"
                        onclick={() => (showPasswordModal = false)}
                        class="flex-1 py-2 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={passwordLoading}
                        class="flex-1 py-2 px-4 rounded-lg bg-[var(--color-primary)] text-[var(--color-bg)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                    >
                        {passwordLoading ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
