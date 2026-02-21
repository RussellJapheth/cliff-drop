#!/bin/bash
set -e

# Drop - Deployment Script for Ubuntu

INSTALL_DIR="/opt/drop"
SERVICE_USER="drop"

echo "=== Drop Deployment Script ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo ./deploy.sh)"
    exit 1
fi

# Install Node.js 22 if not present
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
    echo "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# Install build dependencies
echo "Installing build dependencies..."
apt-get install -y python3 make g++

# Create service user
if ! id "$SERVICE_USER" &>/dev/null; then
    echo "Creating service user..."
    useradd -r -s /bin/false -d "$INSTALL_DIR" "$SERVICE_USER"
fi

# Create install directory
echo "Setting up install directory..."
mkdir -p "$INSTALL_DIR"
cp -r . "$INSTALL_DIR/"
cd "$INSTALL_DIR"

# Create data directories
mkdir -p data storage/files

# Install dependencies and build
echo "Installing dependencies..."
npm install

echo "Building app..."
npm run build

# Set ownership
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

# Install systemd service
echo "Installing systemd service..."
cp drop.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable drop
systemctl start drop

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Drop is now running at http://localhost:3000"
echo "Default password: changeme"
echo ""
echo "Commands:"
echo "  sudo systemctl status drop   - Check status"
echo "  sudo systemctl restart drop  - Restart service"
echo "  sudo journalctl -u drop -f   - View logs"
echo ""
echo "IMPORTANT: Change the default password after first login!"
