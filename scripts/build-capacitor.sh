#!/bin/bash
set -e

# Build HabitWire for Capacitor
# This script builds the Nuxt app with Capacitor-specific settings
# and syncs the output to the native platforms

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building HabitWire for Capacitor..."

# Build the Nuxt app with Capacitor flag
cd "$PROJECT_ROOT/src"
CAPACITOR_BUILD=true npm run generate

# Sync with Capacitor
cd "$PROJECT_ROOT/capacitor"
npx cap sync

echo "Build complete!"
echo ""
echo "To run on Android: cd capacitor && npx cap run android"
echo "To run on iOS:     cd capacitor && npx cap run ios"
echo ""
echo "To open in IDE:"
echo "  Android Studio: cd capacitor && npx cap open android"
echo "  Xcode:          cd capacitor && npx cap open ios"
