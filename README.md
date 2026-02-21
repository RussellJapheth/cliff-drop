# Drop

A self-hosted, cross-device text and file sharing web app inspired by Microsoft Edge Drop. Single-user, minimal, and secure.

## Features

- **Text & Link Sharing**: Send plain text or auto-detected URLs
- **File Uploads**: Drag-and-drop or click to upload
- **Multi-File Upload**: Upload multiple files at once, grouped with thumbnail previews
- **File Preview Modal**: Full-screen preview with swipe navigation between files
- **Real-time Sync**: WebSocket-based instant updates across all devices
- **Search & Filter**: Full-text search across all messages in the database, filter by type (text/links/files)
- **Day Grouping**: Messages organized by date with sticky headers
- **Lazy Loading**: Chat-style interface loads 10 messages initially, more on scroll up
- **Secure Auth**: Password-protected with Argon2 hashing and HTTP-only cookies
- **PWA Support**: Installable on mobile and desktop
- **Dark Mode**: Clean, minimal dark theme
- **Responsive**: Mobile-first design with touch-friendly controls

## Tech Stack

- **Framework**: SvelteKit with adapter-node
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with Drizzle ORM (local or Turso)
- **Storage**: Local filesystem or S3-compatible
- **Real-time**: Native WebSockets
- **Auth**: Argon2id password hashing, session cookies
- **Runtime**: Node.js with tsx for TypeScript (tsx not need for newer node versions which now natively support typescript files)

## Requirements

- Node.js 20+ (22 recommended)
- npm

## Quick Start

### Development

```bash
# Clone the repository
git clone https://github.com/RussellJapheth/cliff-drop.git drop
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

### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_PATH` | `./data/drop.db` | Local SQLite database path |
| `STORAGE_PATH` | `./storage/files` | Local file storage directory |
| `MAX_FILE_SIZE` | `52428800` | Max upload size (50MB) |
| `DEFAULT_PASSWORD` | `changeme` | Initial password |

### Turso Database (Optional)

For edge-hosted SQLite, configure [Turso](https://turso.tech):

| Variable | Default | Description |
|----------|---------|-------------|
| `TURSO_DATABASE_URL` | - | Turso database URL (e.g., `libsql://db-name.turso.io`) |
| `TURSO_AUTH_TOKEN` | - | Turso auth token |

If Turso is not configured, data is stored locally at `DATABASE_PATH`.

### S3 Storage (Optional)

For cloud storage, configure S3 or any S3-compatible service (MinIO, Backblaze B2, Cloudflare R2, etc.):

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_BUCKET` | - | S3 bucket name (required for S3) |
| `S3_REGION` | `us-east-1` | AWS region |
| `S3_ACCESS_KEY_ID` | - | AWS access key ID |
| `S3_SECRET_ACCESS_KEY` | - | AWS secret access key |
| `S3_ENDPOINT` | - | Custom endpoint for S3-compatible services |

If `S3_BUCKET` is not set, files are stored locally at `STORAGE_PATH`.

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

To configure cloud storage (S3) or database (Turso), edit `/etc/systemd/system/drop.service` and uncomment the relevant environment variables, then restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart drop
```

### Option 2: Manual Deployment with PM2

```bash
# Clone the repo
git clone <your-repo> drop
cd drop

# Install and build
npm install
npm run build

# Create data and log directories
mkdir -p data storage/files logs

# Install PM2 globally
npm install -g pm2

# Start with PM2 using ecosystem file
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

To configure environment variables (cloud storage, database), edit `ecosystem.config.cjs` or create a `.env` file.

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
├── ecosystem.config.cjs    # PM2 ecosystem configuration
├── deploy.sh               # Ubuntu deployment script
├── drop.service            # Systemd service (with cloud config options)
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
GET    /api/messages         ?before=timestamp&limit=10&query=search&type=text|link|file
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
