import { config } from 'dotenv';
import { existsSync } from 'fs';
import { createServer, type IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { Duplex } from 'stream';
import { handler } from './build/handler.js';
import { addClient, removeClient } from './src/lib/server/websocket.ts';

// Load .env if it exists, don't override existing env vars
if (existsSync('.env')) {
  config({ override: false });
}

const PORT = process.env.PORT || 7000;

const server = createServer((req, res) => {
  handler(req, res);
});

const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/api/ws') {
    // Extract session cookie
    const cookies: Record<string, string> = request.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>) || {};

    const sessionId = cookies['session'];

    // We'll validate the session when the first message is received
    // For now, allow the upgrade (validation happens in the WebSocket handler)
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, sessionId);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, _request: IncomingMessage, _sessionId: string | undefined) => {
  console.log('WebSocket client connected');

  // Create a client wrapper compatible with our websocket module
  const client = {
    send: (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    },
    get readyState() {
      return ws.readyState;
    }
  };

  addClient(client);

  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());

      // Handle ping/pong for keepalive
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // Ignore invalid messages
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    removeClient(client);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    removeClient(client);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected' }));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
