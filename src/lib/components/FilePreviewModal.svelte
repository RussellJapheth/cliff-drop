<script lang="ts">
    import type { Message } from "$lib/types";

    interface Props {
        files: Message[];
        initialIndex?: number;
        onClose: () => void;
        onDelete?: (id: string) => void;
    }

    let { files, initialIndex = 0, onClose, onDelete }: Props = $props();

    let currentIndex = $state(0);
    let touchStartX = $state(0);
    let touchDeltaX = $state(0);
    let isSwiping = $state(false);

    // Set initial index when modal opens
    $effect(() => {
        currentIndex = initialIndex;
    });

    let currentFile = $derived(files[currentIndex]);

    function formatSize(bytes: number | null): string {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function goToPrevious() {
        if (currentIndex > 0) {
            currentIndex--;
        }
    }

    function goToNext() {
        if (currentIndex < files.length - 1) {
            currentIndex++;
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            onClose();
        } else if (event.key === "ArrowLeft") {
            goToPrevious();
        } else if (event.key === "ArrowRight") {
            goToNext();
        }
    }

    function handleTouchStart(event: TouchEvent) {
        touchStartX = event.touches[0].clientX;
        isSwiping = true;
    }

    function handleTouchMove(event: TouchEvent) {
        if (!isSwiping) return;
        touchDeltaX = event.touches[0].clientX - touchStartX;
    }

    function handleTouchEnd() {
        if (!isSwiping) return;

        const threshold = 50;
        if (touchDeltaX > threshold) {
            goToPrevious();
        } else if (touchDeltaX < -threshold) {
            goToNext();
        }

        touchDeltaX = 0;
        isSwiping = false;
    }

    function downloadFile() {
        if (!currentFile) return;
        const link = document.createElement("a");
        link.href = `/api/files/${currentFile.id}`;
        link.download = currentFile.fileName || "file";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function handleDelete() {
        if (!currentFile || !onDelete) return;
        onDelete(currentFile.id);
        if (files.length <= 1) {
            onClose();
        } else if (currentIndex >= files.length - 1) {
            currentIndex = Math.max(0, currentIndex - 1);
        }
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }

    function isImage(mimeType: string | null): boolean {
        return mimeType?.startsWith("image/") ?? false;
    }

    function isVideo(mimeType: string | null): boolean {
        return mimeType?.startsWith("video/") ?? false;
    }

    function isAudio(mimeType: string | null): boolean {
        return mimeType?.startsWith("audio/") ?? false;
    }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
    class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
>
    <!-- Close button -->
    <button
        onclick={onClose}
        class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
        aria-label="Close"
    >
        <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
            />
        </svg>
    </button>

    <!-- File counter -->
    {#if files.length > 1}
        <div
            class="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm"
        >
            {currentIndex + 1} / {files.length}
        </div>
    {/if}

    <!-- Navigation arrows -->
    {#if files.length > 1}
        <button
            onclick={goToPrevious}
            disabled={currentIndex === 0}
            class="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed hidden md:block"
            aria-label="Previous"
        >
            <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                />
            </svg>
        </button>

        <button
            onclick={goToNext}
            disabled={currentIndex === files.length - 1}
            class="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed hidden md:block"
            aria-label="Next"
        >
            <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                />
            </svg>
        </button>
    {/if}

    <!-- Content area with swipe support -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="flex flex-col items-center justify-center max-w-4xl w-full mx-4 select-none"
        ontouchstart={handleTouchStart}
        ontouchmove={handleTouchMove}
        ontouchend={handleTouchEnd}
        role="presentation"
        style="transform: translateX({touchDeltaX}px); transition: {isSwiping
            ? 'none'
            : 'transform 0.2s ease-out'};"
    >
        {#if currentFile}
            <!-- Preview -->
            <div class="mb-6 max-h-[60vh] flex items-center justify-center">
                {#if isImage(currentFile.mimeType)}
                    <img
                        src={`/api/files/${currentFile.id}`}
                        alt={currentFile.fileName || "Image"}
                        class="max-w-full max-h-[60vh] rounded-lg object-contain"
                        draggable="false"
                    />
                {:else if isVideo(currentFile.mimeType)}
                    <video
                        src={`/api/files/${currentFile.id}`}
                        controls
                        class="max-w-full max-h-[60vh] rounded-lg"
                    >
                        <track kind="captions" />
                    </video>
                {:else if isAudio(currentFile.mimeType)}
                    <div class="bg-[var(--color-surface)] rounded-xl p-8">
                        <svg
                            class="w-24 h-24 text-[var(--color-text-muted)] mb-4 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                        </svg>
                        <audio
                            src={`/api/files/${currentFile.id}`}
                            controls
                            class="w-full"
                        >
                            <track kind="captions" />
                        </audio>
                    </div>
                {:else}
                    <!-- Generic file icon -->
                    <div
                        class="bg-[var(--color-surface)] rounded-xl p-12 text-center"
                    >
                        <svg
                            class="w-24 h-24 text-[var(--color-text-muted)] mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                {/if}
            </div>

            <!-- File info -->
            <div class="text-center text-white mb-6">
                <h3 class="text-lg font-medium truncate max-w-md">
                    {currentFile.fileName}
                </h3>
                <p class="text-sm text-white/60 mt-1">
                    {formatSize(currentFile.size)} • {currentFile.mimeType}
                </p>
                <p class="text-xs text-white/40 mt-1">
                    {formatDate(currentFile.createdAt)}
                </p>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
                <button
                    onclick={downloadFile}
                    class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
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
                    Download
                </button>

                {#if onDelete}
                    <button
                        onclick={handleDelete}
                        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                        Delete
                    </button>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Mobile swipe indicator dots -->
    {#if files.length > 1}
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {#each files as _, index}
                <button
                    onclick={() => (currentIndex = index)}
                    class="w-2 h-2 rounded-full transition-colors {index ===
                    currentIndex
                        ? 'bg-white'
                        : 'bg-white/30'}"
                    aria-label="Go to file {index + 1}"
                ></button>
            {/each}
        </div>
    {/if}
</div>
