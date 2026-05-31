###############################################################################
# Stage 1 : build Vite -> dist/ (HTML + JS + CSS statiques)
###############################################################################
FROM node:22-bookworm AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Copie le reste (tsconfig, vite.config, src/, public/, index.html...)
COPY . .

# Build prod : minification, tree-shaking, hashing des assets
RUN npm run build


###############################################################################
# Stage 2 : nginx serve les statiques + proxy /api vers backend
###############################################################################
FROM nginx:alpine

# Remplace le default.conf de nginx par le nôtre (cf. nginx.conf à côté du Dockerfile)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://localhost/ || exit 1
