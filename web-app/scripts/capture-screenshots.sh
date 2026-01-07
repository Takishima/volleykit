#!/bin/bash
# Script to capture help site screenshots
# Usage: ./scripts/capture-screenshots.sh [options]
#
# Options:
#   --all           Capture all screenshots (default)
#   --travel        Capture travel screenshots (requires internet access)
#   --single NAME   Capture a specific screenshot by name
#   --production    Use production URL for travel screenshots

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$WEB_APP_DIR"

# Default values
CAPTURE_MODE="all"
PRODUCTION_URL="${PRODUCTION_URL:-https://takishima.github.io/volleykit/}"
SINGLE_TEST=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      CAPTURE_MODE="all"
      shift
      ;;
    --travel)
      CAPTURE_MODE="travel"
      shift
      ;;
    --single)
      CAPTURE_MODE="single"
      SINGLE_TEST="$2"
      shift 2
      ;;
    --production)
      export PRODUCTION_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --all           Capture all screenshots (default)"
      echo "  --travel        Capture travel screenshots (requires internet)"
      echo "  --single NAME   Capture specific screenshot (e.g., 'assignment-detail')"
      echo "  --production URL Set production URL for travel screenshots"
      echo "  -h, --help      Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                          # Capture all standard screenshots"
      echo "  $0 --travel                 # Capture travel screenshots"
      echo "  $0 --single assignment-list # Capture only assignment list"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

echo "📸 Help Site Screenshot Capture"
echo "================================"
echo ""

# Check if Playwright is installed
if ! npx playwright --version &> /dev/null; then
  echo "⚠️  Playwright not found. Installing..."
  npm install
fi

# Check if Chromium is installed
if ! npx playwright install --dry-run chromium 2>&1 | grep -q "already installed"; then
  echo "📦 Installing Chromium browser..."
  npx playwright install chromium
fi

# Build the app
echo "🔨 Building the app..."
npm run build

# Determine which tests to run
case $CAPTURE_MODE in
  all)
    echo "📷 Capturing all screenshots..."
    npx playwright test e2e/capture-screenshots.spec.ts --project=chromium
    ;;
  travel)
    echo "🚂 Capturing travel screenshots..."
    echo "   Using production URL: $PRODUCTION_URL"
    export PRODUCTION_URL
    # Remove test.skip for travel tests temporarily by using grep pattern that includes them
    npx playwright test e2e/capture-screenshots.spec.ts --project=chromium -g "travel-time|journey-details"
    ;;
  single)
    echo "📷 Capturing screenshot: $SINGLE_TEST"
    npx playwright test e2e/capture-screenshots.spec.ts --project=chromium -g "$SINGLE_TEST"
    ;;
esac

echo ""
echo "✅ Screenshots saved to:"
echo "   help-site/public/images/screenshots/"
echo ""

# List captured screenshots
echo "📂 Captured files:"
ls -la ../help-site/public/images/screenshots/*.png 2>/dev/null | awk '{print "   " $NF}'
