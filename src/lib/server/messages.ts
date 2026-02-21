import { db } from './db';
import { messages, type Message, type NewMessage } from './db/schema';
import { desc, lt, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { deleteFile } from './files';

const PAGE_SIZE = 50;

// URL regex pattern
const URL_PATTERN = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;

export function detectMessageType(content: string): 'text' | 'link' {
    if (URL_PATTERN.test(content.trim())) {
        return 'link';
    }
    return 'text';
}

export function createTextMessage(content: string): Message {
    const type = detectMessageType(content);
    const id = uuidv4();
    const createdAt = new Date();

    const newMessage: NewMessage = {
        id,
        type,
        content,
        groupId: null,
        createdAt
    };

    db.insert(messages).values(newMessage).run();

    return {
        id,
        type,
        content,
        fileName: null,
        mimeType: null,
        size: null,
        groupId: null,
        createdAt
    };
}

export function createFileMessage(
    fileId: string,
    fileName: string,
    mimeType: string,
    size: number,
    groupId: string | null = null
): Message {
    const createdAt = new Date();

    const newMessage: NewMessage = {
        id: fileId,
        type: 'file',
        content: null,
        fileName,
        mimeType,
        size,
        groupId,
        createdAt
    };

    db.insert(messages).values(newMessage).run();

    return {
        id: fileId,
        type: 'file',
        content: null,
        fileName,
        mimeType,
        size,
        groupId,
        createdAt
    };
}

export function getLatestMessages(limit: number = PAGE_SIZE): Message[] {
    return db.select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .all()
        .reverse(); // Return in chronological order
}

export function getMessagesBefore(beforeTimestamp: Date, limit: number = PAGE_SIZE): Message[] {
    return db.select()
        .from(messages)
        .where(lt(messages.createdAt, beforeTimestamp))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .all()
        .reverse(); // Return in chronological order
}

export function getMessage(id: string): Message | undefined {
    return db.select().from(messages).where(eq(messages.id, id)).get();
}

export function deleteMessage(id: string): boolean {
    const message = getMessage(id);
    if (!message) return false;

    // If it's a file message, delete the file too
    if (message.type === 'file') {
        try {
            deleteFile(id);
        } catch {
            // File might not exist, continue with message deletion
        }
    }

    db.delete(messages).where(eq(messages.id, id)).run();
    return true;
}

export function sanitizeContent(content: string): string {
    // Basic XSS sanitization
    return content
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

export function validateContent(content: string): boolean {
    // Check for reasonable length
    return content.length > 0 && content.length <= 10000;
}
