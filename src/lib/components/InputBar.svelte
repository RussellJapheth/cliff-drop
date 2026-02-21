<script lang="ts">
    interface Props {
        onSendText: (content: string) => void;
        onFilesUpload: (
            files: File[],
            onProgress: (progress: number) => void,
        ) => Promise<void>;
        maxFileSize: number;
    }

    let { onSendText, onFilesUpload, maxFileSize }: Props = $props();

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    let textContent = $state("");
    let uploading = $state(false);
    let uploadProgress = $state(0);
    let uploadFileCount = $state(0);

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

    async function processFiles(files: FileList | File[]) {
        const fileArray = Array.from(files);
        if (fileArray.length === 0) return;

        // Validate file sizes
        const oversizedFiles = fileArray.filter((f) => f.size > maxFileSize);
        if (oversizedFiles.length > 0) {
            const names = oversizedFiles.map((f) => f.name).join(", ");
            alert(
                `File(s) exceed the maximum size of ${formatFileSize(maxFileSize)}: ${names}`,
            );
            return;
        }

        uploading = true;
        uploadFileCount = fileArray.length;
        uploadProgress = 0;

        try {
            await onFilesUpload(fileArray, (progress) => {
                uploadProgress = progress;
            });
        } finally {
            uploading = false;
            uploadFileCount = 0;
            uploadProgress = 0;
        }
    }

    async function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        const files = target.files;

        if (files && files.length > 0) {
            await processFiles(files);
        }

        // Reset input
        target.value = "";
    }

    async function handlePaste(event: ClipboardEvent) {
        const clipboard = event.clipboardData;
        if (!clipboard) return;

        // Detect image types in the clipboard (helps on mobile)
        const types = Array.from(clipboard.types || []);
        const hasImageType = types.some((t) => t.startsWith("image/"));

        // Collect any file items (images) from the clipboard
        const pastedFiles: File[] = [];
        for (const item of Array.from(clipboard.items)) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) pastedFiles.push(file);
            }
        }

        // If there are image types but no File objects, try the async clipboard read() API
        if (
            hasImageType &&
            pastedFiles.length === 0 &&
            (navigator as any).clipboard?.read
        ) {
            try {
                const items: any[] = await (navigator as any).clipboard.read();
                for (const it of items) {
                    for (const type of it.types || []) {
                        if (type.startsWith("image/")) {
                            try {
                                const blob: Blob = await it.getType(type);
                                const ext = (
                                    blob.type.split("/")[1] || "png"
                                ).split(";")[0];
                                pastedFiles.push(
                                    new File([blob], `pasted-image.${ext}`, {
                                        type: blob.type,
                                    }),
                                );
                            } catch (e) {
                                // ignore this type
                            }
                        }
                    }
                }
            } catch (e) {
                // read() may be unsupported or blocked by permissions on mobile — ignore
            }
        }

        if (pastedFiles.length > 0) {
            event.preventDefault();
            await processFiles(pastedFiles);
            return;
        }

        // Fallback: look for an <img src="data:..."> in HTML clipboard data
        const html = clipboard.getData("text/html");
        if (html) {
            const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) {
                const src = match[1];
                try {
                    if (src.startsWith("data:")) {
                        const res = await fetch(src);
                        const blob = await res.blob();
                        const ext = (blob.type.split("/")[1] || "png").split(
                            ";",
                        )[0];
                        const file = new File([blob], `pasted-image.${ext}`, {
                            type: blob.type,
                        });
                        event.preventDefault();
                        await processFiles([file]);
                        return;
                    } else if (/^https?:\/\//i.test(src)) {
                        const res = await fetch(src);
                        const blob = await res.blob();
                        const ext = (blob.type.split("/")[1] || "png").split(
                            ";",
                        )[0];
                        const file = new File([blob], `pasted-image.${ext}`, {
                            type: blob.type,
                        });
                        event.preventDefault();
                        await processFiles([file]);
                        return;
                    }
                } catch (e) {
                    // ignore fetch errors and allow normal paste behavior
                }
            }
        }

        // As a final fallback, check plain text for an image URL
        const text = clipboard.getData("text/plain");
        if (text) {
            const urlMatch = text.match(
                /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp)/i,
            );
            if (urlMatch) {
                try {
                    const res = await fetch(urlMatch[0]);
                    const blob = await res.blob();
                    const ext = (blob.type.split("/")[1] || "png").split(
                        ";",
                    )[0];
                    const file = new File([blob], `pasted-image.${ext}`, {
                        type: blob.type,
                    });
                    event.preventDefault();
                    await processFiles([file]);
                    return;
                } catch (e) {
                    // ignore
                }
            }
        }
    }
</script>

<div
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)]"
>
    <!-- Upload progress -->
    {#if uploading}
        <div class="px-4 py-2 border-b border-[var(--color-border)]">
            <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-[var(--color-text)] truncate">
                        Uploading {uploadFileCount} file{uploadFileCount > 1
                            ? "s"
                            : ""}...
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
                    onpaste={handlePaste}
                    bind:value={textContent}
                    onkeydown={handleKeyDown}
                    placeholder="Drop text, link, or file..."
                    rows="1"
                    class="w-full px-4 py-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent min-h-[48px] max-h-32 overflow-x-hidden break-all"
                    style="field-sizing: content; overflow-wrap: anywhere;"
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
