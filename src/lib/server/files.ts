import { existsSync, mkdirSync, createReadStream, createWriteStream, unlinkSync, statSync } from 'fs';
import { join, basename, normalize } from 'path';
import { Readable } from 'stream';
import { env } from '$env/dynamic/private';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const STORAGE_PATH = env.STORAGE_PATH || './storage/files';
const THUMBNAIL_PATH = env.THUMBNAIL_PATH || './storage/thumbnails';
const DEFAULT_MAX_FILE_SIZE = 52428800; // 50MB default
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;

// S3 Configuration
function isS3Configured(): boolean {
    return !!(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
    if (!s3Client) {
        const config: ConstructorParameters<typeof S3Client>[0] = {
            region: env.S3_REGION || 'us-east-1',
            credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID!,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY!
            }
        };

        // Custom endpoint for S3-compatible services (MinIO, Backblaze B2, Cloudflare R2, etc.)
        if (env.S3_ENDPOINT) {
            config.endpoint = env.S3_ENDPOINT;
            config.forcePathStyle = true; // Required for most S3-compatible services
        }

        s3Client = new S3Client(config);
    }
    return s3Client;
}

function getS3Bucket(): string {
    return env.S3_BUCKET!;
}

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

export function ensureThumbnailDirectory(): void {
    if (!existsSync(THUMBNAIL_PATH)) {
        mkdirSync(THUMBNAIL_PATH, { recursive: true });
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

export function getThumbnailPath(fileId: string): string {
    // Prevent directory traversal
    const safeId = basename(fileId);
    const normalizedPath = normalize(join(THUMBNAIL_PATH, safeId));

    // Ensure path stays within thumbnail directory
    if (!normalizedPath.startsWith(normalize(THUMBNAIL_PATH))) {
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

export async function saveFile(fileId: string, buffer: Buffer, mimeType?: string): Promise<void> {
    if (isS3Configured()) {
        const safeId = basename(fileId);
        await getS3Client().send(new PutObjectCommand({
            Bucket: getS3Bucket(),
            Key: safeId,
            Body: buffer,
            ContentType: mimeType || 'application/octet-stream'
        }));
    } else {
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
}

export async function getFileStream(fileId: string): Promise<Readable> {
    if (isS3Configured()) {
        const safeId = basename(fileId);
        const response = await getS3Client().send(new GetObjectCommand({
            Bucket: getS3Bucket(),
            Key: safeId
        }));

        if (!response.Body) {
            throw new Error('File not found');
        }

        return response.Body as Readable;
    } else {
        const filePath = getFilePath(fileId);

        if (!existsSync(filePath)) {
            throw new Error('File not found');
        }

        return createReadStream(filePath);
    }
}

export async function getFileSize(fileId: string): Promise<number> {
    if (isS3Configured()) {
        const safeId = basename(fileId);
        const response = await getS3Client().send(new HeadObjectCommand({
            Bucket: getS3Bucket(),
            Key: safeId
        }));

        return response.ContentLength || 0;
    } else {
        const filePath = getFilePath(fileId);

        if (!existsSync(filePath)) {
            throw new Error('File not found');
        }

        return statSync(filePath).size;
    }
}

export async function deleteFile(fileId: string): Promise<void> {
    if (isS3Configured()) {
        const safeId = basename(fileId);
        await getS3Client().send(new DeleteObjectCommand({
            Bucket: getS3Bucket(),
            Key: safeId
        }));
    } else {
        const filePath = getFilePath(fileId);

        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }
    }
}

export async function fileExists(fileId: string): Promise<boolean> {
    if (isS3Configured()) {
        try {
            const safeId = basename(fileId);
            await getS3Client().send(new HeadObjectCommand({
                Bucket: getS3Bucket(),
                Key: safeId
            }));
            return true;
        } catch {
            return false;
        }
    } else {
        try {
            const filePath = getFilePath(fileId);
            return existsSync(filePath);
        } catch {
            return false;
        }
    }
}

// Thumbnail functions
const THUMBNAIL_SUPPORTED_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'
]);

export function canGenerateThumbnail(mimeType: string): boolean {
    return THUMBNAIL_SUPPORTED_TYPES.has(mimeType);
}

export async function generateAndSaveThumbnail(fileId: string, buffer: Buffer, mimeType: string): Promise<boolean> {
    if (!canGenerateThumbnail(mimeType)) {
        return false;
    }

    try {
        const thumbnailBuffer = await sharp(buffer)
            .rotate() // Auto-rotate based on EXIF orientation
            .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        if (isS3Configured()) {
            const safeId = basename(fileId);
            await getS3Client().send(new PutObjectCommand({
                Bucket: getS3Bucket(),
                Key: `thumb-${safeId}`,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg'
            }));
        } else {
            ensureThumbnailDirectory();
            const thumbnailPath = getThumbnailPath(fileId);

            await new Promise<void>((resolve, reject) => {
                const writeStream = createWriteStream(thumbnailPath);
                writeStream.write(thumbnailBuffer);
                writeStream.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
        }

        return true;
    } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        return false;
    }
}

export async function getThumbnailStream(fileId: string): Promise<Readable> {
    if (isS3Configured()) {
        const safeId = basename(fileId);
        const response = await getS3Client().send(new GetObjectCommand({
            Bucket: getS3Bucket(),
            Key: `thumb-${safeId}`
        }));

        if (!response.Body) {
            throw new Error('Thumbnail not found');
        }

        return response.Body as Readable;
    } else {
        const thumbnailPath = getThumbnailPath(fileId);

        if (!existsSync(thumbnailPath)) {
            throw new Error('Thumbnail not found');
        }

        return createReadStream(thumbnailPath);
    }
}

export async function thumbnailExists(fileId: string): Promise<boolean> {
    if (isS3Configured()) {
        try {
            const safeId = basename(fileId);
            await getS3Client().send(new HeadObjectCommand({
                Bucket: getS3Bucket(),
                Key: `thumb-${safeId}`
            }));
            return true;
        } catch {
            return false;
        }
    } else {
        try {
            const thumbnailPath = getThumbnailPath(fileId);
            return existsSync(thumbnailPath);
        } catch {
            return false;
        }
    }
}

export async function deleteThumbnail(fileId: string): Promise<void> {
    if (isS3Configured()) {
        try {
            const safeId = basename(fileId);
            await getS3Client().send(new DeleteObjectCommand({
                Bucket: getS3Bucket(),
                Key: `thumb-${safeId}`
            }));
        } catch {
            // Ignore if thumbnail doesn't exist
        }
    } else {
        const thumbnailPath = getThumbnailPath(fileId);
        if (existsSync(thumbnailPath)) {
            unlinkSync(thumbnailPath);
        }
    }
}
