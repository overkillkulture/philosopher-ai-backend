#!/bin/bash

###############################################################################
# Railway Deployment Script
#
# Automated deployment to Railway with pre-flight checks
# Built during Autonomous Work Session #2 (2025-11-01)
###############################################################################

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚂 Railway Deployment Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Pre-flight checks
echo "📋 Running pre-flight checks..."

# 1. Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install: npm install -g @railway/cli"
    exit 1
fi
echo -e "${GREEN}✅ Railway CLI installed${NC}"

# 2. Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Run: railway login"
    exit 1
fi
echo -e "${GREEN}✅ Logged in to Railway${NC}"

# 3. Check if project is linked
if ! railway status &> /dev/null; then
    echo -e "${RED}❌ No Railway project linked${NC}"
    echo "Run: railway link"
    exit 1
fi
echo -e "${GREEN}✅ Railway project linked${NC}"

# 4. Check if tests pass
echo ""
echo "🧪 Running tests..."
if npm test; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    echo -e "${YELLOW}Continue anyway? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 5. Check required environment variables
echo ""
echo "🔑 Checking environment variables..."
REQUIRED_VARS=(
    "ANTHROPIC_API_KEY"
    "JWT_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if railway variables get "$var" &> /dev/null; then
        echo -e "${GREEN}✅ $var is set${NC}"
    else
        echo -e "${YELLOW}⚠️  $var is NOT set${NC}"
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Missing variables: ${MISSING_VARS[*]}${NC}"
    echo "Set them in Railway dashboard or continue without them?"
    echo -e "${YELLOW}Continue anyway? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deployment
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying to Railway..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

railway up

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get deployment URL
DEPLOY_URL=$(railway status --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
if [ -n "$DEPLOY_URL" ]; then
    echo "🌐 Your app is live at:"
    echo -e "${GREEN}   $DEPLOY_URL${NC}"
    echo ""
    echo "Test health endpoint:"
    echo -e "${YELLOW}   curl $DEPLOY_URL/api/health${NC}"
else
    echo "Run 'railway status' to see deployment details"
fi

echo ""
echo "📊 View logs:"
echo "   railway logs"
echo ""
