FROM node:20-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_NETWORK_TIMEOUT=120000

COPY package.json package-lock.json ./
RUN npm ci || npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_API_ORIGIN=http://backend:8000 \
    NEXT_PUBLIC_API_BASE_URL=/api/

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -- --webpack 2>/dev/null || npx next build --webpack

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3013 \
    BACKEND_API_ORIGIN=http://backend:8000 \
    NEXT_PUBLIC_API_BASE_URL=/api/

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3013

CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3013"]
