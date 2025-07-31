#!/bin/bash

# Install Traker globally
INSTALL_DIR="$HOME/.local/bin"
APP_DIR="$HOME/.local/share/traker"

# Create directories if they don't exist
mkdir -p "$INSTALL_DIR"
mkdir -p "$APP_DIR"

# Copy application files
cp -r src/traker "$APP_DIR/"
cp run.py "$APP_DIR/"
cp requirements.txt "$APP_DIR/"

# Create executable script
cat > "$INSTALL_DIR/traker" << 'EOF'
#!/bin/bash
cd "$HOME/.local/share/traker"
python3 run.py "$@"
EOF

# Make executable
chmod +x "$INSTALL_DIR/traker"

echo "Traker installed successfully!"
echo "You can now run 'traker' from any terminal."
echo ""
echo "Note: Make sure $HOME/.local/bin is in your PATH."
echo "Add this line to your ~/.bashrc or ~/.zshrc if needed:"
echo "export PATH=\"\$HOME/.local/bin:\$PATH\""