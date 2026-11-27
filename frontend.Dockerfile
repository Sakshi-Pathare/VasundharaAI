# ==============================================================================
# Vasundhara AI (EcoWatch AI) — Frontend Production Dockerfile
# Multi-stage, high-performance static SPA with Nginx reverse proxy
# ==============================================================================

# STAGE 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package installation
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy source code and build production bundle
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# STAGE 2: Lightweight Nginx runtime
FROM nginx:alpine AS runtime

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy production Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
