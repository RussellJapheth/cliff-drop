# Drop

A self-hosted, cross-device text and file sharing web app inspired by Microsoft Edge Drop. Single-user, minimal, and secure.

## Features

- **Text & Link Sharing**: Send plain text or auto-detected URLs
- **File Uploads**: Drag-and-drop or click to upload (50MB limit)
- **Real-time Sync**: WebSocket-based instant updates across all devices
- **Secure Auth**: Password-protected with Argon2 hashing and HTTP-only cookies
- **PWA Support**: Installable on mobile and desktop
- **Dark Mode**: Clean, minimal dark theme
- **Responsive**: Mobile-first design

## Tech Stack

- **Framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Database**: SQLite with Drizzle ORM
- **Real-time**: Native WebSockets
- **Auth**: Argon2 password hashing, session cookies

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production (Ubuntu)

```bash
# Quick deploy with systemd
sudo ./deploy.sh
```

Or manually:

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Create data directories
mkdir -p data storage/files

# Start the server
NODE_ENV=production node server.js
```

## Configuration

Environment variables (set in `.env` or container):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_PATH` | `./data/drop.db` | SQLite database path |
| `STORAGE_PATH` | `./storage/files` | File storage directory |
| `MAX_FILE_SIZE` | `52428800` | Max upload size (50MB) |
| `DEFAULT_PASSWORD` | `changeme` | Initial password |

**Important**: Change the default password after first login via the settings menu.

## Ubuntu Deployment

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools (for native modules)
sudo apt install -y python3 make g++
```

### Automated Deployment

```bash
# Clone the repo
git clone <your-repo> drop
cd drop

# Run deploy script (installs Node.js, builds, sets up systemd)
chmod +x deploy.sh
sudo ./deploy.sh
```

### Manual Deployment

```bash
# Clone the repo
git clone <your-repo> drop
cd drop

# Install and build
npm install
npm run build

# Create data directories
mkdir -p data storage/files

# Set environment
export DEFAULT_PASSWORD="your-secure-password"
export NODE_ENV=production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start npx --name drop -- tsx server.ts
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name drop.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name drop.example.com;

    ssl_certificate /etc/letsencrypt/live/drop.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drop.example.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── components/      # Svelte components
│   │   │   ├── Header.svelte
│   │   │   ├── InputBar.svelte
│   │   │   └── MessageItem.svelte
│   │   ├── server/
│   │   │   ├── db/          # Database schema & init
│   │   │   ├── auth.ts      # Authentication
│   │   │   ├── files.ts     # File handling
│   │   │   ├── messages.ts  # Message CRUD
│   │   │   └── websocket.ts # WebSocket management
│   │   └── types.ts         # TypeScript types
│   ├── routes/
│   │   ├── api/             # API endpoints
│   │   │   ├── auth/        # Login/logout/password
│   │   │   ├── files/[id]/  # File download
│   │   │   ├── messages/    # Message CRUD
│   │   │   ├── upload/      # File upload
│   │   │   └── ws/          # WebSocket
│   │   ├── login/           # Login page
│   │   └── +page.svelte     # Main timeline
│   └── hooks.server.ts      # Auth middleware
├── static/                  # Static assets & PWA
├── server.js               # Custom WebSocket server
├── deploy.sh               # Ubuntu deployment script
├── drop.service            # Systemd service file
└── package.json
```

## API Reference

### Authentication

```
POST /api/auth/login     { password }
POST /api/auth/logout
POST /api/auth/password  { currentPassword, newPassword }
```

### Messages

```
GET    /api/messages         ?before=timestamp&limit=50
POST   /api/messages         { content }
DELETE /api/messages         ?id=message_id
```

### Files

```
POST   /api/upload           FormData with 'file'
GET    /api/files/:id        Stream file download
```

### WebSocket

```
ws://host/api/ws

// Server events:
{ type: "message", payload: Message }
{ type: "delete", payload: { id } }
{ type: "heartbeat" }
{ type: "connected" }

// Client events:
{ type: "ping" }
```

## Security

- Password hashing with Argon2id
- HTTP-only secure cookies
- CSRF protection (SvelteKit built-in)
- Content Security Policy headers
- Input validation and XSS sanitization
- Directory traversal prevention
- No public file exposure

## License

MIT
