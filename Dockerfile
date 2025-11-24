# ================================================================
# OVERKORE PRODUCTION DOCKERFILE
# ================================================================
# Multi-stage build for minimal image size
# Security-hardened, production-ready
# ================================================================

# ==================== STAGE 1: BUILDER ====================
FROM node:18-alpine AS node-builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install Node.js dependencies (production only)
RUN npm ci --only=production && \
    npm cache clean --force

# ==================== STAGE 2: PYTHON BUILDER ====================
FROM python:3.11-slim AS python-builder

WORKDIR /build

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# ==================== STAGE 3: PRODUCTION ====================
FROM python:3.11-slim

# Metadata
LABEL maintainer="OVERKORE Team"
LABEL description="Enterprise-grade consciousness revolution backend"
LABEL version="1.0.0"

# Create non-root user for security
RUN groupadd -r overkore && \
    useradd -r -g overkore -d /app -s /sbin/nologin overkore

# Install Node.js runtime only
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=python-builder /root/.local /home/overkore/.local

# Copy Node.js dependencies from builder
COPY --from=node-builder /build/node_modules ./node_modules

# Copy application code
COPY --chown=overkore:overkore . .

# Create necessary directories
RUN mkdir -p logs backups .trinity/WAKE_REQUESTS && \
    chown -R overkore:overkore logs backups .trinity

# Set Python path
ENV PATH=/home/overkore/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Switch to non-root user
USER overkore

# Expose ports
EXPOSE 3001

# Start command (use server-secure.js in production)
CMD ["node", "server-secure.js"]
