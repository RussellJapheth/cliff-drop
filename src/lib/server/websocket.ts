import type { Message } from './db/schema';

interface WebSocketClient {
    send: (data: string) => void;
    readyState: number;
}

const clients = new Set<WebSocketClient>();

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function addClient(client: WebSocketClient): void {
    clients.add(client);
}

export function removeClient(client: WebSocketClient): void {
    clients.delete(client);
}

export function broadcastMessage(message: Message): void {
    const data = JSON.stringify({
        type: 'message',
        payload: message
    });

    clients.forEach(client => {
        if (client.readyState === 1) { // OPEN state
            try {
                client.send(data);
            } catch {
                removeClient(client);
            }
        }
    });
}

export function broadcastDelete(messageId: string): void {
    const data = JSON.stringify({
        type: 'delete',
        payload: { id: messageId }
    });

    clients.forEach(client => {
        if (client.readyState === 1) {
            try {
                client.send(data);
            } catch {
                removeClient(client);
            }
        }
    });
}

export function sendHeartbeat(): void {
    const data = JSON.stringify({ type: 'heartbeat' });

    clients.forEach(client => {
        if (client.readyState === 1) {
            try {
                client.send(data);
            } catch {
                removeClient(client);
            }
        }
    });
}

export function getClientCount(): number {
    return clients.size;
}

// Start heartbeat interval
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(): void {
    if (!heartbeatTimer) {
        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }
}

export function stopHeartbeat(): void {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}
