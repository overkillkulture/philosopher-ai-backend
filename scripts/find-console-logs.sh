#!/bin/bash
# ================================================
# FIND CONSOLE.LOG STATEMENTS
# For production cleanup
# ================================================
# Usage: ./scripts/find-console-logs.sh [--count-only]
# ================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Finding console.log statements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Exclude directories
EXCLUDE="--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=test --exclude-dir=tests"

if [ "$1" == "--count-only" ]; then
    # Just count
    COUNT=$(grep -r "console\.\(log\|warn\|error\|debug\|info\)" $EXCLUDE --include="*.js" . 2>/dev/null | wc -l)
    echo -e "${YELLOW}Found $COUNT console statements${NC}"
    echo ""
    echo "Breakdown:"
    echo "  console.log:   $(grep -r "console\.log" $EXCLUDE --include="*.js" . 2>/dev/null | wc -l)"
    echo "  console.warn:  $(grep -r "console\.warn" $EXCLUDE --include="*.js" . 2>/dev/null | wc -l)"
    echo "  console.error: $(grep -r "console\.error" $EXCLUDE --include="*.js" . 2>/dev/null | wc -l)"
    echo "  console.debug: $(grep -r "console\.debug" $EXCLUDE --include="*.js" . 2>/dev/null | wc -l)"
    echo "  console.info:  $(grep -r "console\.info" $EXCLUDE --include="*.js" . 2>/dev/null | wc -l)"
else
    # Show all occurrences grouped by file
    echo "Console statements by file:"
    echo ""

    for file in $(grep -rl "console\.\(log\|warn\|error\)" $EXCLUDE --include="*.js" . 2>/dev/null | sort); do
        count=$(grep -c "console\.\(log\|warn\|error\)" "$file" 2>/dev/null || echo "0")
        echo -e "${GREEN}$file${NC} ($count)"
        grep -n "console\.\(log\|warn\|error\)" "$file" 2>/dev/null | head -5 | sed 's/^/  /'
        remaining=$((count - 5))
        if [ $remaining -gt 0 ]; then
            echo "  ... and $remaining more"
        fi
        echo ""
    done
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "TIP: Use logger instead of console.log in production"
echo "     See server-production.js for winston logger example"
echo ""
