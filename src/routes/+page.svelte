<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import MessageItem from "$lib/components/MessageItem.svelte";
    import InputBar from "$lib/components/InputBar.svelte";
    import Header from "$lib/components/Header.svelte";
    import type { Message } from "$lib/types";

    let messages = $state<Message[]>([]);
    let loading = $state(true);
    let loadingMore = $state(false);
    let hasMore = $state(true);
    let feedContainer: HTMLDivElement;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDragging = $state(false);

    onMount(() => {
        loadMessages();
        connectWebSocket();
    });

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
                    // Add new message if not already present (optimistic update)
                    const exists = messages.some(
                        (m) => m.id === data.payload.id,
                    );
                    if (!exists) {
                        messages = [...messages, data.payload];
                        scrollToBottom();
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
            const response = await fetch("/api/messages");
            const data = await response.json();

            if (response.ok) {
                messages = data.messages;
                hasMore = data.messages.length >= 50;
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
        if (loadingMore || !hasMore || messages.length === 0) return;

        loadingMore = true;
        const oldestMessage = messages[0];
        const before = new Date(oldestMessage.createdAt).getTime();

        try {
            const response = await fetch(`/api/messages?before=${before}`);
            const data = await response.json();

            if (response.ok) {
                if (data.messages.length > 0) {
                    messages = [...data.messages, ...messages];
                }
                hasMore = data.messages.length >= 50;
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

    async function handleFileUpload(
        file: File,
        onProgress: (progress: number) => void,
    ) {
        const formData = new FormData();
        formData.append("file", file);

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            type: "file",
            content: null,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            createdAt: new Date().toISOString(),
        };
        messages = [...messages, tempMessage];
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
                        // Replace temp message with real one
                        messages = messages.map((m) =>
                            m.id === tempId ? data.message : m,
                        );
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
            // Remove temp message on error
            messages = messages.filter((m) => m.id !== tempId);
        }
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
            for (const file of Array.from(files)) {
                await handleFileUpload(file, () => {});
            }
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

            {#if loading}
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
            {:else}
                {#each messages as message (message.id)}
                    <MessageItem {message} onDelete={handleDelete} />
                {/each}
            {/if}
        </div>
    </div>

    <!-- Input bar -->
    <InputBar onSendText={handleSendText} onFileUpload={handleFileUpload} />
</div>
