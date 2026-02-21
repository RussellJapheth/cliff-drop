<script lang="ts">
    import type { Message } from "$lib/types";

    interface Props {
        message: Message;
        onDelete: (id: string) => void;
        onPreview?: (message: Message) => void;
    }

    let { message, onDelete, onPreview }: Props = $props();

    let copied = $state(false);
    let showActions = $state(false);

    function formatTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    }

    function formatSize(bytes: number | null): string {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    async function copyToClipboard() {
        if (message.content) {
            try {
                await navigator.clipboard.writeText(message.content);
                copied = true;
                setTimeout(() => (copied = false), 2000);
            } catch {
                console.error("Failed to copy");
            }
        }
    }

    function downloadFile() {
        const link = document.createElement("a");
        link.href = `/api/files/${message.id}`;
        link.download = message.fileName || "file";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function isImage(): boolean {
        return message.mimeType?.startsWith("image/") ?? false;
    }

    function handleDelete() {
        onDelete(message.id);
    }

    function handlePreview() {
        if (onPreview) {
            onPreview(message);
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-[var(--color-text-muted)]/30"
    onmouseenter={() => (showActions = true)}
    onmouseleave={() => (showActions = false)}
>
    <!-- Timestamp -->
    <div class="text-xs text-[var(--color-text-muted)] mb-2">
        {formatTime(message.createdAt)}
    </div>

    <!-- Content -->
    {#if message.type === "text"}
        <p class="text-[var(--color-text)] whitespace-pre-wrap break-words">
            {message.content}
        </p>
    {:else if message.type === "link"}
        <a
            href={message.content?.startsWith("http")
                ? message.content
                : `https://${message.content}`}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[var(--color-accent)] hover:underline break-all"
        >
            {message.content}
        </a>
    {:else if message.type === "file"}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
            class="space-y-2 {onPreview ? 'cursor-pointer' : ''}"
            onclick={onPreview ? handlePreview : undefined}
        >
            {#if isImage()}
                <img
                    src={`/api/files/${message.id}`}
                    alt={message.fileName || "Image"}
                    class="max-w-full max-h-64 rounded-lg object-contain bg-[var(--color-bg)]"
                    loading="lazy"
                />
            {/if}

            <div class="flex items-center gap-3">
                <div
                    class="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--color-bg)] flex items-center justify-center"
                >
                    {#if message.mimeType?.startsWith("image/")}
                        <svg
                            class="w-5 h-5 text-[var(--color-text-muted)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    {:else if message.mimeType?.startsWith("video/")}
                        <svg
                            class="w-5 h-5 text-[var(--color-text-muted)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                    {:else if message.mimeType?.startsWith("audio/")}
                        <svg
                            class="w-5 h-5 text-[var(--color-text-muted)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                        </svg>
                    {:else if message.mimeType === "application/pdf"}
                        <svg
                            class="w-5 h-5 text-[var(--color-text-muted)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                    {:else}
                        <svg
                            class="w-5 h-5 text-[var(--color-text-muted)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    {/if}
                </div>

                <div class="flex-1 min-w-0">
                    <p class="text-[var(--color-text)] truncate">
                        {message.fileName}
                    </p>
                    <p class="text-xs text-[var(--color-text-muted)]">
                        {formatSize(message.size)}
                    </p>
                </div>

                <button
                    onclick={downloadFile}
                    class="flex-shrink-0 p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    aria-label="Download"
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                    </svg>
                </button>
            </div>
        </div>
    {/if}

    <!-- Action buttons -->
    <div
        class="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        class:md:opacity-100={showActions}
    >
        {#if message.type !== "file"}
            <button
                onclick={copyToClipboard}
                class="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                aria-label="Copy"
                title="Copy"
            >
                {#if copied}
                    <svg
                        class="w-4 h-4 text-[var(--color-accent)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                {:else}
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                    </svg>
                {/if}
            </button>
        {/if}

        <button
            onclick={handleDelete}
            class="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-red-500/10 hover:border-red-500/30 text-[var(--color-text-muted)] hover:text-red-500"
            aria-label="Delete"
            title="Delete"
        >
            <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
            </svg>
        </button>
    </div>
</div>
