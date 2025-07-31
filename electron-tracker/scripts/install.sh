#!/bin/bash

# Install Tracker Electron globally
INSTALL_DIR="$HOME/.local/bin"
APP_DIR="$HOME/.local/share/tracker-electron"

echo "Installing Tracker Electron..."

# Create directories if they don't exist
mkdir -p "$INSTALL_DIR"
mkdir -p "$APP_DIR"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Copy application files
echo "Installing to $APP_DIR..."
cp -r src/ "$APP_DIR/"
cp -r bin/ "$APP_DIR/"
cp -r assets/ "$APP_DIR/" 2>/dev/null || echo "Assets directory not found, skipping..."
cp package.json "$APP_DIR/"
cp -r node_modules/ "$APP_DIR/"

# Create global executable script
cat > "$INSTALL_DIR/tracker" << 'EOF'
#!/bin/bash
cd "$HOME/.local/share/tracker-electron"
node bin/tracker "$@"
EOF

# Make executable
chmod +x "$INSTALL_DIR/tracker"

echo "Tracker Electron installed successfully!"
echo "You can now run 'tracker' from any terminal."
echo ""
echo "Commands:"
echo "  tracker          - Start Tracker in production mode"
echo "  tracker --dev    - Start Tracker in development mode"
echo ""

# Install desktop file for application launchers
DESKTOP_FILE="$HOME/.local/share/applications/tracker.desktop"
mkdir -p "$(dirname "$DESKTOP_FILE")"
cp assets/tracker.desktop "$DESKTOP_FILE"
chmod +x "$DESKTOP_FILE"
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true

echo "Desktop integration installed - Tracker now appears in:"
echo "  • dmenu/rofi (type 'tracker')"
echo "  • Application launchers"
echo "  • System menus"
echo ""
echo "Note: Make sure $HOME/.local/bin is in your PATH."
echo "Add this line to your ~/.bashrc or ~/.zshrc if needed:"
echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "To uninstall, run:"
echo "rm -rf \"$APP_DIR\" && rm \"$INSTALL_DIR/tracker\" && rm \"$DESKTOP_FILE\""