import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
    getLatestMessages,
    getMessagesBefore,
    searchMessages,
    createTextMessage,
    validateContent,
    deleteMessage
} from '$lib/server/messages';
import { broadcastMessage, broadcastDelete } from '$lib/server/websocket';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.authenticated) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const before = url.searchParams.get('before');
        const query = url.searchParams.get('query');
        const type = url.searchParams.get('type') as 'text' | 'link' | 'file' | null;
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

        let messages;

        // If search query or type filter is provided, use searchMessages
        if (query || type) {
            messages = await searchMessages({
                query: query || undefined,
                type: type || undefined,
                limit
            });
        } else if (before) {
            const beforeDate = new Date(parseInt(before));
            messages = await getMessagesBefore(beforeDate, limit);
        } else {
            messages = await getLatestMessages(limit);
        }

        return json({ messages });
    } catch (error) {
        console.error('Get messages error:', error);
        return json({ error: 'Failed to get messages' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.authenticated) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { content } = await request.json();

        if (!content || typeof content !== 'string') {
            return json({ error: 'Content is required' }, { status: 400 });
        }

        const trimmedContent = content.trim();

        if (!validateContent(trimmedContent)) {
            return json({ error: 'Content must be between 1 and 10000 characters' }, { status: 400 });
        }

        const message = await createTextMessage(trimmedContent);
        broadcastMessage(message);

        return json({ message });
    } catch (error) {
        console.error('Create message error:', error);
        return json({ error: 'Failed to create message' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
    if (!locals.authenticated) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const id = url.searchParams.get('id');

        if (!id) {
            return json({ error: 'Message ID is required' }, { status: 400 });
        }

        const deleted = await deleteMessage(id);

        if (!deleted) {
            return json({ error: 'Message not found' }, { status: 404 });
        }

        broadcastDelete(id);

        return json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        return json({ error: 'Failed to delete message' }, { status: 500 });
    }
};
