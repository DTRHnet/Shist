# Multi-stage Docker build for Shist Node.js/TypeScript application
# Assumptions: package.json exists, npm run build creates dist/, npm run start runs production server
# User must: Set DATABASE_URL and SESSION_SECRET environment variables
# Safety: Uses non-root user, minimal production image, healthcheck included

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files for dependency installation (layer caching optimization)
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./
COPY components.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --frozen-lockfile --no-audit --no-fund

# Copy source code
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/

# Build the application with production optimizations
ENV NODE_ENV=production
RUN npm run build && \
    npm prune --production

# Production stage
FROM node:20-alpine AS production

# Install production runtime dependencies
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S shist -u 1001

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy built application from builder stage
COPY --from=builder --chown=shist:nodejs /app/dist ./dist
COPY --from=builder --chown=shist:nodejs /app/client/dist ./client/dist

# Security hardening: remove unnecessary packages and users
RUN rm -rf /tmp/* /var/cache/apk/* && \
    chmod -R 755 /app

# Switch to non-root user
USER shist

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check with improved reliability
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e " \
        const http = require('http'); \
        const req = http.request('http://localhost:5000/', (res) => { \
            process.exit(res.statusCode === 200 ? 0 : 1); \
        }); \
        req.on('error', () => process.exit(1)); \
        req.setTimeout(8000, () => { req.destroy(); process.exit(1); }); \
        req.end();"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]