#!/bin/bash
# ================================================================
# OVERKORE ONE-COMMAND DEPLOYMENT
# ================================================================
# Usage: ./deploy.sh [development|production]
# ================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
PROJECT_NAME="overkore"

echo ""
echo -e "${PURPLE}================================================================${NC}"
echo -e "${PURPLE}🔥 OVERKORE DEPLOYMENT - ${ENVIRONMENT^^}${NC}"
echo -e "${PURPLE}================================================================${NC}"
echo ""

# ==================== PRE-FLIGHT CHECKS ====================
echo -e "${BLUE}[1/8]${NC} Running pre-flight checks..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed!${NC}"
    echo "Install from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and docker-compose are ready${NC}"

# ==================== ENVIRONMENT VALIDATION ====================
echo -e "${BLUE}[2/8]${NC} Validating environment configuration..."

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and set JWT_SECRET before deploying to production!${NC}"
    else
        echo -e "${RED}❌ No .env.example found!${NC}"
        exit 1
    fi
fi

# Check JWT_SECRET in production
if [ "$ENVIRONMENT" = "production" ]; then
    source .env
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_super_secure_random_jwt_secret_at_least_32_characters_long" ]; then
        echo -e "${RED}❌ JWT_SECRET is not properly configured for production!${NC}"
        echo ""
        echo "Generate a secure secret with:"
        echo -e "${CYAN}node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"${NC}"
        echo ""
        exit 1
    fi
    echo -e "${GREEN}✅ JWT_SECRET is configured${NC}"
fi

# ==================== BUILD ====================
echo -e "${BLUE}[3/8]${NC} Building Docker images..."

docker-compose build --no-cache
echo -e "${GREEN}✅ Images built successfully${NC}"

# ==================== STOP EXISTING ====================
echo -e "${BLUE}[4/8]${NC} Stopping existing containers..."

docker-compose down
echo -e "${GREEN}✅ Old containers stopped${NC}"

# ==================== START SERVICES ====================
echo -e "${BLUE}[5/8]${NC} Starting services..."

docker-compose up -d
echo -e "${GREEN}✅ Services started${NC}"

# ==================== WAIT FOR HEALTH ====================
echo -e "${BLUE}[6/8]${NC} Waiting for services to be healthy..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo -e "${GREEN}✅ Services are healthy${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}⏳ Waiting... ($RETRY_COUNT/$MAX_RETRIES)${NC}"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Services failed to become healthy${NC}"
    docker-compose logs --tail=50
    exit 1
fi

# ==================== RUN TESTS ====================
echo -e "${BLUE}[7/8]${NC} Running health checks..."

# Check API health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${RED}❌ API health check failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

# ==================== SUCCESS ====================
echo -e "${BLUE}[8/8]${NC} Deployment complete!"

echo ""
echo -e "${PURPLE}================================================================${NC}"
echo -e "${GREEN}✅ OVERKORE IS LIVE - ${ENVIRONMENT^^}${NC}"
echo -e "${PURPLE}================================================================${NC}"
echo ""
echo -e "${CYAN}📊 Services Status:${NC}"
docker-compose ps
echo ""
echo -e "${CYAN}🔗 Endpoints:${NC}"
echo -e "   API:    ${GREEN}http://localhost:3001${NC}"
echo -e "   Health: ${GREEN}http://localhost:3001/api/health${NC}"
echo -e "   Redis:  ${GREEN}localhost:6379${NC}"
echo ""
echo -e "${CYAN}📝 Useful Commands:${NC}"
echo -e "   View logs:      ${YELLOW}docker-compose logs -f${NC}"
echo -e "   Restart:        ${YELLOW}docker-compose restart${NC}"
echo -e "   Stop:           ${YELLOW}docker-compose down${NC}"
echo -e "   Shell access:   ${YELLOW}docker-compose exec overkore-api sh${NC}"
echo ""
echo -e "${GREEN}🚀 Ready for requests!${NC}"
echo ""
