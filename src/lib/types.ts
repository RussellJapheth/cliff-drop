export interface Message {
    id: string;
    type: 'text' | 'file' | 'link';
    content: string | null;
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    groupId: string | null;
    createdAt: string;
    hasThumbnail?: boolean;
    // Client-side only: blob URL for preview during upload
    localPreviewUrl?: string;
}
