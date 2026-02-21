<script lang="ts">
    interface Props {
        onSendText: (content: string) => void;
        onFileUpload: (
            file: File,
            onProgress: (progress: number) => void,
        ) => Promise<void>;
    }

    let { onSendText, onFileUpload }: Props = $props();

    let textContent = $state("");
    let uploading = $state(false);
    let uploadProgress = $state(0);
    let uploadFileName = $state("");

    function handleSubmit(event: Event) {
        event.preventDefault();
        const content = textContent.trim();
        if (content) {
            onSendText(content);
            textContent = "";
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
        }
    }

    async function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        const files = target.files;

        if (files && files.length > 0) {
            for (const file of Array.from(files)) {
                uploading = true;
                uploadFileName = file.name;
                uploadProgress = 0;

                try {
                    await onFileUpload(file, (progress) => {
                        uploadProgress = progress;
                    });
                } finally {
                    uploading = false;
                    uploadFileName = "";
                    uploadProgress = 0;
                }
            }
        }

        // Reset input
        target.value = "";
    }
</script>

<div class="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
    <!-- Upload progress -->
    {#if uploading}
        <div class="px-4 py-2 border-b border-[var(--color-border)]">
            <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-[var(--color-text)] truncate">
                        {uploadFileName}
                    </p>
                    <div
                        class="mt-1 h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden"
                    >
                        <div
                            class="h-full bg-[var(--color-accent)] transition-all duration-300"
                            style="width: {uploadProgress}%"
                        ></div>
                    </div>
                </div>
                <span class="text-sm text-[var(--color-text-muted)]"
                    >{uploadProgress}%</span
                >
            </div>
        </div>
    {/if}

    <form onsubmit={handleSubmit} class="max-w-2xl mx-auto p-4">
        <div class="flex flex-row items-center gap-2 justify-between">
            <!-- File upload button using label -->
            <label
                class="flex-shrink-0 p-3 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer {uploading
                    ? 'opacity-50 pointer-events-none'
                    : ''}"
                aria-label="Upload file"
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
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                </svg>
                <input
                    type="file"
                    multiple
                    onchange={handleFileSelect}
                    disabled={uploading}
                    class="hidden"
                />
            </label>

            <!-- Text input -->
            <div
                class="flex-1 relative flex flex-row items-center justify-center"
            >
                <textarea
                    bind:value={textContent}
                    onkeydown={handleKeyDown}
                    placeholder="Drop text, link, or file..."
                    rows="1"
                    class="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[48px] max-h-32"
                    style="field-sizing: content;"
                ></textarea>
            </div>

            <!-- Send button -->
            <button
                type="submit"
                disabled={!textContent.trim() || uploading}
                class="flex-shrink-0 p-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                </svg>
            </button>
        </div>
    </form>
</div>
