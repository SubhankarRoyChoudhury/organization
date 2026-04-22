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
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3021 \
    HOSTNAME=0.0.0.0 \
    BACKEND_API_ORIGIN=http://backend:8000 \
    NEXT_PUBLIC_API_BASE_URL=/api/

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3021

CMD ["node", "server.js"]
