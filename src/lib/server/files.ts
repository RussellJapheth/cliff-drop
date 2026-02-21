import { existsSync, mkdirSync, createReadStream, createWriteStream, unlinkSync, statSync } from 'fs';
import { join, basename, normalize } from 'path';
import type { Readable } from 'stream';
import { env } from '$env/dynamic/private';

const STORAGE_PATH = env.STORAGE_PATH || './storage/files';
const DEFAULT_MAX_FILE_SIZE = 52428800; // 50MB default

function getMaxFileSizeValue(): number {
    return parseInt(env.MAX_FILE_SIZE || String(DEFAULT_MAX_FILE_SIZE));
}

// Allowed MIME types (add more as needed)
const ALLOWED_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
    // Documents
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
    'application/json', 'application/xml',
    // Archives
    'application/zip', 'application/x-tar', 'application/gzip',
    'application/x-7z-compressed', 'application/x-rar-compressed',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
    // Video
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    // Other
    'application/octet-stream'
]);

export function ensureStorageDirectory(): void {
    if (!existsSync(STORAGE_PATH)) {
        mkdirSync(STORAGE_PATH, { recursive: true });
    }
}

export function getFilePath(fileId: string): string {
    // Prevent directory traversal
    const safeId = basename(fileId);
    const normalizedPath = normalize(join(STORAGE_PATH, safeId));

    // Ensure path stays within storage directory
    if (!normalizedPath.startsWith(normalize(STORAGE_PATH))) {
        throw new Error('Invalid file path');
    }

    return normalizedPath;
}

export function validateMimeType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.has(mimeType);
}

export function validateFileSize(size: number): boolean {
    return size > 0 && size <= getMaxFileSizeValue();
}

export function getMaxFileSize(): number {
    return getMaxFileSizeValue();
}

export async function saveFile(fileId: string, buffer: Buffer): Promise<void> {
    ensureStorageDirectory();
    const filePath = getFilePath(fileId);

    return new Promise((resolve, reject) => {
        const writeStream = createWriteStream(filePath);
        writeStream.write(buffer);
        writeStream.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

export function getFileStream(fileId: string): Readable {
    const filePath = getFilePath(fileId);

    if (!existsSync(filePath)) {
        throw new Error('File not found');
    }

    return createReadStream(filePath);
}

export function getFileSize(fileId: string): number {
    const filePath = getFilePath(fileId);

    if (!existsSync(filePath)) {
        throw new Error('File not found');
    }

    return statSync(filePath).size;
}

export function deleteFile(fileId: string): void {
    const filePath = getFilePath(fileId);

    if (existsSync(filePath)) {
        unlinkSync(filePath);
    }
}

export function fileExists(fileId: string): boolean {
    try {
        const filePath = getFilePath(fileId);
        return existsSync(filePath);
    } catch {
        return false;
    }
}
