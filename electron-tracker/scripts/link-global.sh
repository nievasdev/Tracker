#!/bin/bash

# Link Tracker Electron globally for development
CURRENT_DIR="$(pwd)"
INSTALL_DIR="$HOME/.local/bin"

echo "Linking Tracker Electron globally for development..."

# Create ~/.local/bin if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Create symlink to the executable
ln -sf "$CURRENT_DIR/bin/tracker" "$INSTALL_DIR/tracker"

echo "Tracker has been linked globally!"
echo "You can now run 'tracker' from any terminal."
echo ""
echo "Commands:"
echo "  tracker          - Start Tracker in production mode"
echo "  tracker --dev    - Start Tracker in development mode"
echo ""
echo "Note: Make sure $HOME/.local/bin is in your PATH."
echo "Add this line to your ~/.bashrc or ~/.zshrc if needed:"
echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "To unlink, run:"
echo "rm \"$INSTALL_DIR/tracker\""