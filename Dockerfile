# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY src/package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY src/ ./

# Build the application
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S habitwire -u 1001 -G nodejs

# Copy built application from builder
COPY --from=builder --chown=habitwire:nodejs /app/.output ./.output

# Switch to non-root user
USER habitwire

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Environment variables (documented, not set - must be provided at runtime)
# Required:
#   DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, NUXT_SESSION_PASSWORD
# Optional:
#   DB_PORT (default: 5432)
#   INITIAL_USER (default: admin)
#   INITIAL_PASSWORD (auto-generated if not set)
#   RATE_LIMIT_PER_MINUTE (default: 1000)
#   RUN_MIGRATIONS (default: true)

# Start the application
CMD ["node", ".output/server/index.mjs"]
