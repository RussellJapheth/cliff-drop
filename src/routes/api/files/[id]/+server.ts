import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getMessage } from '$lib/server/messages';
import { getFileStream, fileExists } from '$lib/server/files';
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

        // Check file exists
        if (!(await fileExists(id))) {
            throw error(404, 'File not found on disk');
        }

        // Stream the file
        const stream = await getFileStream(id);
        const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

        return new Response(webStream, {
            headers: {
                'Content-Type': message.mimeType || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(message.fileName || 'file')}"`,
                'Content-Length': message.size?.toString() || '',
                'Cache-Control': 'private, max-age=3600'
            }
        });
    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        console.error('File download error:', e);
        throw error(500, 'Failed to download file');
    }
};
