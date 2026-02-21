<script lang="ts">
    import type { Message } from "$lib/types";

    interface Props {
        files: Message[];
        onDelete: (id: string) => void;
        onPreview: (files: Message[], index: number) => void;
    }

    let { files, onDelete, onPreview }: Props = $props();

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

    function formatTotalSize(): string {
        const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
        if (totalBytes < 1024) return `${totalBytes} B`;
        if (totalBytes < 1024 * 1024)
            return `${(totalBytes / 1024).toFixed(1)} KB`;
        return `${(totalBytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function isImage(file: Message): boolean {
        return file.mimeType?.startsWith("image/") ?? false;
    }

    function handleDeleteAll() {
        for (const file of files) {
            onDelete(file.id);
        }
    }

    function downloadFile(file: Message) {
        const link = document.createElement("a");
        link.href = `/api/files/${file.id}`;
        link.download = file.fileName || "file";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 hover:border-[var(--color-text-muted)]/30"
>
    <!-- Timestamp and count -->
    <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-[var(--color-text-muted)]">
            {formatTime(files[0].createdAt)}
        </span>
        <span class="text-xs text-[var(--color-text-muted)]">
            {files.length} files • {formatTotalSize()}
        </span>
    </div>

    <!-- File list -->
    <div class="space-y-1.5">
        {#each files as file, index}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
                class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
                onclick={() => onPreview(files, index)}
            >
                <!-- Icon -->
                <div
                    class="flex-shrink-0 w-7 h-7 rounded bg-[var(--color-bg)] flex items-center justify-center"
                >
                    {#if isImage(file)}
                        <img
                            src={`/api/files/${file.id}`}
                            alt={file.fileName || "Image"}
                            class="w-full h-full object-cover rounded"
                            loading="lazy"
                        />
                    {:else if file.mimeType?.startsWith("video/")}
                        <svg
                            class="w-3.5 h-3.5 text-[var(--color-text-muted)]"
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
                    {:else if file.mimeType?.startsWith("audio/")}
                        <svg
                            class="w-3.5 h-3.5 text-[var(--color-text-muted)]"
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
                    {:else if file.mimeType === "application/pdf"}
                        <svg
                            class="w-3.5 h-3.5 text-[var(--color-text-muted)]"
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
                            class="w-3.5 h-3.5 text-[var(--color-text-muted)]"
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

                <!-- File info -->
                <div class="flex-1 min-w-0">
                    <p class="text-xs text-[var(--color-text)] truncate">
                        {file.fileName}
                    </p>
                </div>

                <!-- Size -->
                <span
                    class="text-[10px] text-[var(--color-text-muted)] flex-shrink-0"
                >
                    {formatSize(file.size)}
                </span>

                <!-- Download button -->
                <button
                    type="button"
                    onclick={(e) => {
                        e.stopPropagation();
                        downloadFile(file);
                    }}
                    class="flex-shrink-0 p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    aria-label="Download"
                    title="Download"
                >
                    <svg
                        class="w-3.5 h-3.5"
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

                <!-- Delete button -->
                <button
                    type="button"
                    onclick={(e) => {
                        e.stopPropagation();
                        onDelete(file.id);
                    }}
                    class="flex-shrink-0 p-1 rounded hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-500"
                    aria-label="Delete"
                    title="Delete"
                >
                    <svg
                        class="w-3.5 h-3.5"
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
        {/each}
    </div>

    <!-- Delete all button -->
    <div
        class="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
    >
        <button
            onclick={handleDeleteAll}
            class="p-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-red-500/10 hover:border-red-500/30 text-[var(--color-text-muted)] hover:text-red-500"
            aria-label="Delete all"
            title="Delete all"
        >
            <svg
                class="w-3.5 h-3.5"
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
