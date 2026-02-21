export interface Message {
    id: string;
    type: 'text' | 'file' | 'link';
    content: string | null;
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    createdAt: string;
}
