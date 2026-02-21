<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import MessageItem from "$lib/components/MessageItem.svelte";
    import FileGroupItem from "$lib/components/FileGroupItem.svelte";
    import FilePreviewModal from "$lib/components/FilePreviewModal.svelte";
    import InputBar from "$lib/components/InputBar.svelte";
    import Header from "$lib/components/Header.svelte";
    import type { Message } from "$lib/types";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let maxFileSize = $derived(data.maxFileSize);

    let messages = $state<Message[]>([]);
    let loading = $state(true);
    let loadingMore = $state(false);
    let hasMore = $state(true);
    let feedContainer: HTMLDivElement;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDragging = $state(false);

    // Preview modal state
    let previewFiles = $state<Message[]>([]);
    let previewIndex = $state(0);
    let showPreview = $state(false);

    // Search and filter state
    let searchQuery = $state("");
    let activeFilter = $state<"all" | "text" | "link" | "file">("all");
    let isSearching = $state(false);
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;

    // Track if we're in search mode (filtering by query or type)
    let isSearchMode = $derived(
        searchQuery.trim() !== "" || activeFilter !== "all",
    );

    // In search mode, messages are already filtered from the server
    // In normal mode, messages are loaded with lazy loading
    let filteredMessages = $derived(messages);

    // Group messages by day
    type MessageOrGroup =
        | { kind: "single"; message: Message }
        | { kind: "group"; groupId: string; files: Message[] };

    type GroupedMessages = {
        date: string;
        label: string;
        items: MessageOrGroup[];
    }[];

    let groupedMessages = $derived.by(() => {
        // First, group file messages by their groupId
        const fileGroups: Map<string, Message[]> = new Map();
        const processedGroupIds: Set<string> = new Set();

        for (const message of filteredMessages) {
            if (message.type === "file" && message.groupId) {
                if (!fileGroups.has(message.groupId)) {
                    fileGroups.set(message.groupId, []);
                }
                fileGroups.get(message.groupId)!.push(message);
            }
        }

        // Now group by day, replacing grouped files with single group entries
        const dayGroups: Map<string, MessageOrGroup[]> = new Map();

        for (const message of filteredMessages) {
            const date = new Date(message.createdAt);
            const dateKey = date.toISOString().split("T")[0];

            if (!dayGroups.has(dateKey)) {
                dayGroups.set(dateKey, []);
            }

            if (message.type === "file" && message.groupId) {
                // Only add the group once (when we encounter the first file in the group)
                if (!processedGroupIds.has(message.groupId)) {
                    processedGroupIds.add(message.groupId);
                    const files = fileGroups.get(message.groupId)!;
                    dayGroups.get(dateKey)!.push({
                        kind: "group",
                        groupId: message.groupId,
                        files,
                    });
                }
            } else {
                dayGroups.get(dateKey)!.push({
                    kind: "single",
                    message,
                });
            }
        }

        // Convert to array and format labels
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const result: GroupedMessages = [];
        const sortedKeys = Array.from(dayGroups.keys()).sort();

        for (const dateKey of sortedKeys) {
            const date = new Date(dateKey + "T00:00:00");
            let label: string;

            if (dateKey === today.toISOString().split("T")[0]) {
                label = "Today";
            } else if (dateKey === yesterday.toISOString().split("T")[0]) {
                label = "Yesterday";
            } else {
                label = date.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year:
                        date.getFullYear() !== today.getFullYear()
                            ? "numeric"
                            : undefined,
                });
            }

            result.push({
                date: dateKey,
                label,
                items: dayGroups.get(dateKey)!,
            });
        }

        return result;
    });

    onMount(() => {
        loadMessages();
        connectWebSocket();
    });

    // Watch for search query and filter changes
    $effect(() => {
        const query = searchQuery;
        const filter = activeFilter;

        // Clear any pending search timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Debounce the search
        searchTimeout = setTimeout(() => {
            performSearch(query, filter);
        }, 300);

        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    });

    async function performSearch(
        query: string,
        filter: "all" | "text" | "link" | "file",
    ) {
        // If no search criteria, reload normal messages
        if (!query.trim() && filter === "all") {
            await loadMessages();
            return;
        }

        isSearching = true;
        try {
            const params = new URLSearchParams();
            params.set("limit", "100"); // Get more results for search
            if (query.trim()) {
                params.set("query", query.trim());
            }
            if (filter !== "all") {
                params.set("type", filter);
            }

            const response = await fetch(`/api/messages?${params.toString()}`);
            const data = await response.json();

            if (response.ok) {
                messages = data.messages;
                hasMore = false; // Disable lazy loading in search mode
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            console.error("Failed to search messages:", error);
        } finally {
            isSearching = false;
        }
    }

    onDestroy(() => {
        if (ws) {
            ws.close();
        }
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
    });

    function connectWebSocket() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

        ws.onopen = () => {
            console.log("WebSocket connected");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "message") {
                    // Don't add new messages in search mode - they may not match the search
                    if (isSearchMode) return;

                    // Check if user is near bottom before adding message
                    const isNearBottom =
                        feedContainer &&
                        feedContainer.scrollHeight -
                            feedContainer.scrollTop -
                            feedContainer.clientHeight <
                            100;

                    // Add new message if not already present (optimistic update)
                    const exists = messages.some(
                        (m) => m.id === data.payload.id,
                    );
                    if (!exists) {
                        messages = [...messages, data.payload];
                        // Only scroll to bottom if user was already at bottom
                        if (isNearBottom) {
                            setTimeout(scrollToBottom, 0);
                        }
                    }
                } else if (data.type === "delete") {
                    messages = messages.filter((m) => m.id !== data.payload.id);
                } else if (data.type === "heartbeat") {
                    // Respond to heartbeat
                    ws?.send(JSON.stringify({ type: "ping" }));
                }
            } catch {
                // Ignore invalid messages
            }
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
            // Attempt to reconnect after 3 seconds
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    }

    async function loadMessages() {
        loading = true;
        try {
            const response = await fetch("/api/messages?limit=10");
            const data = await response.json();

            if (response.ok) {
                messages = data.messages;
                hasMore = data.messages.length >= 10;
                // Wait for DOM update then scroll
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
        } finally {
            loading = false;
        }
    }

    async function loadMoreMessages() {
        // Don't load more when in search mode or conditions not met
        if (loadingMore || !hasMore || messages.length === 0 || isSearchMode)
            return;

        loadingMore = true;
        const oldestMessage = messages[0];
        const before = new Date(oldestMessage.createdAt).getTime();

        // Store current scroll state to preserve position after prepending
        const previousScrollHeight = feedContainer?.scrollHeight || 0;
        const previousScrollTop = feedContainer?.scrollTop || 0;

        try {
            const response = await fetch(
                `/api/messages?before=${before}&limit=10`,
            );
            const data = await response.json();

            if (response.ok) {
                if (data.messages.length > 0) {
                    messages = [...data.messages, ...messages];

                    // Restore scroll position after DOM update
                    setTimeout(() => {
                        if (feedContainer) {
                            const newScrollHeight = feedContainer.scrollHeight;
                            feedContainer.scrollTop =
                                previousScrollTop +
                                (newScrollHeight - previousScrollHeight);
                        }
                    }, 0);
                }
                hasMore = data.messages.length >= 10;
            }
        } catch (error) {
            console.error("Failed to load more messages:", error);
        } finally {
            loadingMore = false;
        }
    }

    function scrollToBottom() {
        if (feedContainer) {
            feedContainer.scrollTop = feedContainer.scrollHeight;
        }
    }

    function handleScroll() {
        if (
            feedContainer &&
            feedContainer.scrollTop < 100 &&
            hasMore &&
            !loadingMore
        ) {
            loadMoreMessages();
        }
    }

    async function handleSendText(content: string) {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            type: content.match(/^https?:\/\//) ? "link" : "text",
            content,
            fileName: null,
            mimeType: null,
            size: null,
            groupId: null,
            createdAt: new Date().toISOString(),
        };
        messages = [...messages, tempMessage];
        scrollToBottom();

        try {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });

            const data = await response.json();

            if (response.ok) {
                // Replace temp message with real one
                messages = messages.map((m) =>
                    m.id === tempId ? data.message : m,
                );
            } else {
                // Remove temp message on error
                messages = messages.filter((m) => m.id !== tempId);
            }
        } catch {
            // Remove temp message on error
            messages = messages.filter((m) => m.id !== tempId);
        }
    }

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async function handleFilesUpload(
        files: File[],
        onProgress: (progress: number) => void,
    ) {
        // Validate file sizes
        const oversizedFiles = files.filter((f) => f.size > maxFileSize);
        if (oversizedFiles.length > 0) {
            const names = oversizedFiles.map((f) => f.name).join(", ");
            alert(
                `File(s) exceed the maximum size of ${formatFileSize(maxFileSize)}: ${names}`,
            );
            return;
        }

        const formData = new FormData();
        const tempIds: string[] = [];
        const blobUrls: string[] = [];
        const tempGroupId =
            files.length > 1 ? `temp-group-${Date.now()}` : null;

        // Add all files to form data and create temp messages
        for (const file of files) {
            formData.append("file", file);
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            tempIds.push(tempId);

            // Create local blob URL for image preview during upload
            let localPreviewUrl: string | undefined;
            if (file.type.startsWith("image/")) {
                localPreviewUrl = URL.createObjectURL(file);
                blobUrls.push(localPreviewUrl);
            }

            const tempMessage: Message = {
                id: tempId,
                type: "file",
                content: null,
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                groupId: tempGroupId,
                createdAt: new Date().toISOString(),
                localPreviewUrl,
            };
            messages = [...messages, tempMessage];
        }
        scrollToBottom();

        try {
            // Using XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            await new Promise<void>((resolve, reject) => {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = JSON.parse(xhr.responseText);
                        // Remove all temp messages and revoke blob URLs
                        messages = messages.filter(
                            (m) => !tempIds.includes(m.id),
                        );
                        blobUrls.forEach((url) => URL.revokeObjectURL(url));
                        // Add real messages
                        if (data.messages) {
                            messages = [...messages, ...data.messages];
                        }
                        // Scroll to show new messages
                        setTimeout(scrollToBottom, 0);
                        resolve();
                    } else {
                        reject(new Error("Upload failed"));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error"));

                xhr.open("POST", "/api/upload");
                xhr.send(formData);
            });
        } catch (error) {
            console.error("Upload failed:", error);
            // Remove temp messages on error and revoke blob URLs
            messages = messages.filter((m) => !tempIds.includes(m.id));
            blobUrls.forEach((url) => URL.revokeObjectURL(url));
        }
    }

    function openPreview(files: Message[], index: number) {
        previewFiles = files;
        previewIndex = index;
        showPreview = true;
    }

    function closePreview() {
        showPreview = false;
        previewFiles = [];
        previewIndex = 0;
    }

    async function handleDelete(id: string) {
        // Optimistic update
        const deletedMessage = messages.find((m) => m.id === id);
        messages = messages.filter((m) => m.id !== id);

        try {
            const response = await fetch(`/api/messages?id=${id}`, {
                method: "DELETE",
            });

            if (!response.ok && deletedMessage) {
                // Restore on error
                messages = [...messages, deletedMessage].sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime(),
                );
            }
        } catch {
            if (deletedMessage) {
                messages = [...messages, deletedMessage].sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime(),
                );
            }
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        isDragging = true;
    }

    function handleDragLeave(event: DragEvent) {
        event.preventDefault();
        isDragging = false;
    }

    async function handleDrop(event: DragEvent) {
        event.preventDefault();
        isDragging = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            await handleFilesUpload(Array.from(files), () => {});
        }
    }
</script>

<svelte:head>
    <title>Drop</title>
</svelte:head>

<div
    class="h-screen flex flex-col"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="application"
>
    <Header />

    <!-- Search and filter bar -->
    <div
        class="border-b border-[var(--color-border)] bg-[var(--color-surface)]"
    >
        <div class="max-w-2xl mx-auto px-4 py-3">
            <!-- Search input -->
            <div class="relative mb-3">
                <svg
                    class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search messages..."
                    class="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
                {#if searchQuery}
                    <button
                        type="button"
                        onclick={() => (searchQuery = "")}
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        aria-label="Clear search"
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
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                {/if}
            </div>

            <!-- Filter buttons -->
            <div class="flex gap-2">
                <button
                    type="button"
                    onclick={() => (activeFilter = "all")}
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeFilter ===
                    'all'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
                >
                    All
                </button>
                <button
                    type="button"
                    onclick={() => (activeFilter = "text")}
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeFilter ===
                    'text'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
                >
                    Text
                </button>
                <button
                    type="button"
                    onclick={() => (activeFilter = "link")}
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeFilter ===
                    'link'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
                >
                    Links
                </button>
                <button
                    type="button"
                    onclick={() => (activeFilter = "file")}
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeFilter ===
                    'file'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
                >
                    Files
                </button>
            </div>
        </div>
    </div>

    <!-- Drop zone overlay -->
    {#if isDragging}
        <div
            class="fixed inset-0 z-50 bg-[var(--color-bg)]/90 flex items-center justify-center pointer-events-none"
        >
            <div
                class="border-2 border-dashed border-[var(--color-accent)] rounded-xl p-12 text-center"
            >
                <svg
                    class="w-16 h-16 mx-auto mb-4 text-[var(--color-accent)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                </svg>
                <p class="text-xl text-[var(--color-text)]">Drop files here</p>
            </div>
        </div>
    {/if}

    <!-- Message feed -->
    <div
        bind:this={feedContainer}
        onscroll={handleScroll}
        class="flex-1 overflow-y-auto px-4 py-4"
    >
        <div class="max-w-2xl mx-auto space-y-3">
            {#if loadingMore}
                <div class="text-center py-4">
                    <div
                        class="inline-block w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin"
                    ></div>
                </div>
            {/if}

            {#if loading || isSearching}
                <div class="flex items-center justify-center h-64">
                    <div
                        class="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin"
                    ></div>
                </div>
            {:else if messages.length === 0}
                <div
                    class="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]"
                >
                    <svg
                        class="w-16 h-16 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    <p class="text-lg">Drop something here</p>
                    <p class="text-sm mt-1">Text, links, or files</p>
                </div>
            {:else if groupedMessages.length === 0}
                <div
                    class="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]"
                >
                    <svg
                        class="w-16 h-16 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <p class="text-lg">No results found</p>
                    <p class="text-sm mt-1">Try a different search or filter</p>
                </div>
            {:else}
                {#each groupedMessages as group (group.date)}
                    <!-- Day header -->
                    <div class="sticky top-0 z-10 py-2">
                        <div class="flex items-center gap-3">
                            <div
                                class="flex-1 h-px bg-[var(--color-border)]"
                            ></div>
                            <span
                                class="text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-bg)] px-2"
                            >
                                {group.label}
                            </span>
                            <div
                                class="flex-1 h-px bg-[var(--color-border)]"
                            ></div>
                        </div>
                    </div>
                    <!-- Items for this day -->
                    {#each group.items as item}
                        {#if item.kind === "group"}
                            <FileGroupItem
                                files={item.files}
                                onDelete={handleDelete}
                                onPreview={openPreview}
                            />
                        {:else}
                            <MessageItem
                                message={item.message}
                                onDelete={handleDelete}
                                onPreview={item.message.type === "file"
                                    ? (file) => openPreview([file], 0)
                                    : undefined}
                            />
                        {/if}
                    {/each}
                {/each}
            {/if}
        </div>
    </div>

    <!-- Input bar -->
    <InputBar
        onSendText={handleSendText}
        onFilesUpload={handleFilesUpload}
        {maxFileSize}
    />
</div>

<!-- File preview modal -->
{#if showPreview}
    <FilePreviewModal
        files={previewFiles}
        initialIndex={previewIndex}
        onClose={closePreview}
        onDelete={handleDelete}
    />
{/if}
