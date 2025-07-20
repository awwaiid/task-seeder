# Multi-stage build for TaskSeeder
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Build the server
RUN npm run build:server

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1000 -S nodejs
RUN adduser -S taskseeder -u 1000

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --silent && npm cache clean --force

# Copy built assets from builder stage
COPY --from=builder --chown=taskseeder:nodejs /app/dist ./dist
COPY --from=builder --chown=taskseeder:nodejs /app/dist-server ./dist-server

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown taskseeder:nodejs /app/data

# Switch to non-root user
USER taskseeder

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist-server/index.js"]
