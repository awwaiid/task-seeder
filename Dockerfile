# Multi-stage build for TaskSeeder
FROM node:20-alpine AS builder

# Install build dependencies for native modules (like sqlite3)
RUN apk add --no-cache make gcc g++ python3

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

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

# Install only dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Use existing node user (uid 1000) as requested

# Copy built assets and node_modules from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/dist-server ./dist-server
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown node:node /app/data

# Switch to non-root user
USER node

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
