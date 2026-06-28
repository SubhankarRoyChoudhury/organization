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
ARG NEXT_PUBLIC_HOSPITAL_MANAGEMENT_ORIGIN=""
ENV NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_API_ORIGIN=http://backend:8000 \
    NEXT_PUBLIC_API_BASE_URL=/api/ \
    NEXT_PUBLIC_HOSPITAL_MANAGEMENT_ORIGIN=${NEXT_PUBLIC_HOSPITAL_MANAGEMENT_ORIGIN}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -- --webpack 2>/dev/null || npx next build --webpack

FROM node:20-alpine AS runner
WORKDIR /app
ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_NETWORK_TIMEOUT=120000

# ENV NODE_ENV=production
# ENV PORT=3013

ARG NEXT_PUBLIC_HOSPITAL_MANAGEMENT_ORIGIN=""
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3020 \
    BACKEND_API_ORIGIN=http://backend:8000 \
    NEXT_PUBLIC_API_BASE_URL=/api/ \
    NEXT_PUBLIC_HOSPITAL_MANAGEMENT_ORIGIN=${NEXT_PUBLIC_HOSPITAL_MANAGEMENT_ORIGIN}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev || npm ci --omit=dev

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3020

CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3020"]
