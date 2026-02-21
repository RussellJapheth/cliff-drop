import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getMessage } from '$lib/server/messages';
import { getThumbnailStream, thumbnailExists } from '$lib/server/files';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ params, locals }) => {
    if (!locals.authenticated) {
        throw error(401, 'Unauthorized');
    }

    try {
        const { id } = params;

        // Get message metadata
        const message = await getMessage(id);

        if (!message) {
            throw error(404, 'File not found');
        }

        if (message.type !== 'file') {
            throw error(400, 'Not a file message');
        }

        // Check thumbnail exists
        if (!(await thumbnailExists(id))) {
            throw error(404, 'Thumbnail not found');
        }

        // Stream the thumbnail
        const stream = await getThumbnailStream(id);
        const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

        return new Response(webStream, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'private, max-age=31536000, immutable'
            }
        });
    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        console.error('Thumbnail download error:', e);
        throw error(500, 'Failed to download thumbnail');
    }
};
