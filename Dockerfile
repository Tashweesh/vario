# ---- build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Vite inlines VITE_* vars at build time, so they must be passed as build args.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAP_TILE_URL
ARG VITE_MAP_TILE_ATTR
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_MAP_TILE_URL=$VITE_MAP_TILE_URL \
    VITE_MAP_TILE_ATTR=$VITE_MAP_TILE_ATTR

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
