# ==============================================================================
# Production Dockerfile for NexCourt API Server
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and server dependencies
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY server/prisma ./server/prisma/

RUN npm ci --workspace=server

COPY server ./server

# Generate Prisma Client & Build TypeScript
RUN npm run prisma:generate --workspace=server
RUN npm run build:server

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install OpenSSL for Prisma on Alpine
RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules

EXPOSE 5000

CMD ["npm", "run", "start:server"]
