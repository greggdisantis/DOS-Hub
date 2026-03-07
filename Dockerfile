# Build stage for web frontend
FROM node:22-alpine AS web-builder
WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY web ./
RUN pnpm run build

# Build stage for backend
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY server ./server
COPY tsconfig.json ./
RUN pnpm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy pre-built artifacts from build stages
COPY --from=server-builder /app/dist ./dist
COPY --from=web-builder /app/web/dist ./dist/web

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "dist/index.js"]
