#!/bin/bash
# Script to install git hooks for agent-console repository

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
GIT_DIR="$SCRIPT_DIR/.git"
HOOKS_SRC="$SCRIPT_DIR/hooks"
HOOKS_DEST="$GIT_DIR/hooks"

echo "Installing git hooks..."

if [ ! -d "$GIT_DIR" ]; then
    echo "Error: .git directory not found. Are you in the repository root?"
    exit 1
fi

if [ ! -d "$HOOKS_SRC" ]; then
    echo "Error: hooks directory not found at $HOOKS_SRC"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DEST"

# Install each hook
for hook_file in "$HOOKS_SRC"/*; do
    if [ -f "$hook_file" ]; then
        hook_name=$(basename "$hook_file")
        echo "Installing $hook_name..."
        cp "$hook_file" "$HOOKS_DEST/$hook_name"
        chmod +x "$HOOKS_DEST/$hook_name"
        echo "  ✓ Installed $hook_name"
    fi
done

echo ""
echo "Git hooks installed successfully!"
echo ""
echo "The following hooks are now active:"
echo "  - commit-msg: Removes AI attributions from commit messages"
