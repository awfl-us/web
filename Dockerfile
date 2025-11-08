# Multi-stage build: build Vite app, serve with nginx on Cloud Run

# 1) Builder: install deps and build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

# 2) Runtime: nginx serving built assets with SPA fallback
FROM nginx:1.27-alpine
# Cloud Run expects the server to listen on $PORT (default 8080)
ENV PORT=8080

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Healthcheck (optional; Cloud Run uses container port checks by default)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:${PORT}/ || exit 1

# Run
EXPOSE 8080
CMD ["/bin/sh", "-c", "nginx -g 'daemon off;'" ]
