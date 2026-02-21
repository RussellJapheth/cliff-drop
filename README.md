# Drop

A self-hosted, cross-device text and file sharing web app inspired by Microsoft Edge Drop. Single-user, minimal, and secure.

## Features

- **Text & Link Sharing**: Send plain text or auto-detected URLs
- **File Uploads**: Drag-and-drop or click to upload (50MB limit)
- **Multi-File Upload**: Upload multiple files at once, grouped with thumbnail previews
- **File Preview Modal**: Full-screen preview with swipe navigation between files
- **Real-time Sync**: WebSocket-based instant updates across all devices
- **Search & Filter**: Find messages by content, filter by type (text/links/files)
- **Day Grouping**: Messages organized by date with sticky headers
- **Secure Auth**: Password-protected with Argon2 hashing and HTTP-only cookies
- **PWA Support**: Installable on mobile and desktop
- **Dark Mode**: Clean, minimal dark theme
- **Responsive**: Mobile-first design with touch-friendly controls

## Tech Stack

- **Framework**: SvelteKit with adapter-node
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with Drizzle ORM
- **Real-time**: Native WebSockets
- **Auth**: Argon2id password hashing, session cookies
- **Runtime**: Node.js with tsx for TypeScript

## Requirements

- Node.js 20+ (22 recommended)
- npm or bun

## Quick Start

### Development

```bash
# Clone the repository
git clone <your-repo> drop
cd drop

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Production

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Create data directories
mkdir -p data storage/files

# Set your password (optional, defaults to 'changeme')
export DEFAULT_PASSWORD="your-secure-password"

# Start the server
npm start
```

The app will be available at `http://localhost:3000`

# Create data directories
mkdir -p data storage/files

# Start the server
NODE_ENV=production node server.js
```

## Configuration

Environment variables (set in `.env` or export before running):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_PATH` | `./data/drop.db` | SQLite database path |
| `STORAGE_PATH` | `./storage/files` | File storage directory |
| `MAX_FILE_SIZE` | `52428800` | Max upload size (50MB) |
| `DEFAULT_PASSWORD` | `changeme` | Initial password |

**Important**: Change the default password after first login via the settings menu (gear icon).

## Ubuntu/Linux Deployment

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools (for native modules like better-sqlite3 and argon2)
sudo apt install -y python3 make g++
```

### Option 1: Automated Deployment (systemd)

```bash
# Clone the repo
git clone <your-repo> drop
cd drop

# Run deploy script (builds app, sets up systemd service)
chmod +x deploy.sh
sudo ./deploy.sh
```

The app will run as a systemd service, starting automatically on boot.

### Option 2: Manual Deployment with PM2

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

# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name drop -- start
pm2 save
pm2 startup
```

### Option 3: Direct Node.js

```bash
# After building...
NODE_ENV=production npm start
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
│   │   │   ├── MessageItem.svelte
│   │   │   ├── FileGroupItem.svelte
│   │   │   └── FilePreviewModal.svelte
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
│   │   │   ├── upload/      # File upload (supports batch)
│   │   │   └── ws/          # WebSocket
│   │   ├── login/           # Login page
│   │   └── +page.svelte     # Main timeline
│   └── hooks.server.ts      # Auth middleware
├── static/                  # Static assets & PWA
├── server.ts               # Custom WebSocket server
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
