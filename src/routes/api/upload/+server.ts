import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { saveFile, validateMimeType, validateFileSize, getMaxFileSize } from '$lib/server/files';
import { createFileMessage } from '$lib/server/messages';
import { broadcastMessage } from '$lib/server/websocket';
import mime from 'mime-types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.authenticated) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return json({ error: 'No file provided' }, { status: 400 });
        }

        const fileName = file.name;
        const size = file.size;
        let mimeType = file.type || mime.lookup(fileName) || 'application/octet-stream';

        // Validate file size
        if (!validateFileSize(size)) {
            return json({
                error: `File size must be between 1 byte and ${Math.round(getMaxFileSize() / 1024 / 1024)}MB`
            }, { status: 400 });
        }

        // Validate MIME type
        if (!validateMimeType(mimeType)) {
            // Allow file but mark as generic binary
            mimeType = 'application/octet-stream';
        }

        // Generate unique file ID
        const fileId = uuidv4();

        // Save file to storage
        const buffer = Buffer.from(await file.arrayBuffer());
        await saveFile(fileId, buffer);

        // Create message record
        const message = createFileMessage(fileId, fileName, mimeType, size);
        broadcastMessage(message);

        return json({ message });
    } catch (error) {
        console.error('File upload error:', error);
        return json({ error: 'Failed to upload file' }, { status: 500 });
    }
};
