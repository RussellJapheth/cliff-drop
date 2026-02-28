import type { RequestHandler } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { saveFile, validateMimeType, validateFileSize, getMaxFileSize, generateAndSaveThumbnail, canGenerateThumbnail } from '$lib/server/files';
import { createFileMessage, createTextMessage, validateContent } from '$lib/server/messages';
import { broadcastMessage } from '$lib/server/websocket';
import mime from 'mime-types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.authenticated) {
        return new Response(null, {
            status: 303,
            headers: { Location: '/login' }
        });
    }

    try {
        const formData = await request.formData();

        const title = formData.get('title') as string | null;
        const text = formData.get('text') as string | null;
        const url = formData.get('url') as string | null;
        const files = formData.getAll('file') as File[];

        // Handle text/links first
        let contentToCreate = '';
        if (title) contentToCreate += title + '\n';
        if (text) contentToCreate += text + '\n';
        if (url) contentToCreate += url;

        const trimmedContent = contentToCreate.trim();
        if (trimmedContent && validateContent(trimmedContent)) {
            const message = await createTextMessage(trimmedContent);
            broadcastMessage(message);
        }

        // Handle files
        if (files.length > 0) {
            const validFiles = files.filter(f => f.name && f.size > 0);
            if (validFiles.length > 0) {
                const groupId = validFiles.length > 1 ? uuidv4() : null;

                for (const file of validFiles) {
                    const fileName = file.name;
                    const size = file.size;
                    let mimeType = file.type || mime.lookup(fileName) || 'application/octet-stream';

                    if (!validateFileSize(size)) {
                        console.warn(`File "${fileName}" size must be between 1 byte and ${Math.round(getMaxFileSize() / 1024 / 1024)}MB - skipped.`);
                        continue;
                    }

                    if (!validateMimeType(mimeType)) {
                        mimeType = 'application/octet-stream';
                    }

                    const fileId = uuidv4();
                    const buffer = Buffer.from(await file.arrayBuffer());
                    await saveFile(fileId, buffer, mimeType);

                    let hasThumbnail = false;
                    if (canGenerateThumbnail(mimeType)) {
                        hasThumbnail = await generateAndSaveThumbnail(fileId, buffer, mimeType);
                    }

                    const message = await createFileMessage(fileId, fileName, mimeType, size, groupId, hasThumbnail);
                    broadcastMessage(message);
                }
            }
        }
    } catch (error) {
        console.error('Share target error:', error);
    }

    // Always redirect back to the app home page after sharing
    return new Response(null, {
        status: 303,
        headers: { Location: '/' }
    });
};
