# Build the standalone browser app. Hosting-specific build configuration is unused.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build:local

# Runtime is only Node + our server + static assets. No npm install or Wrangler.
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8788 ASSET_DIRECTORY=/app/dist-local
COPY --from=build --chown=node:node /app/dist-local ./dist-local
COPY --chown=node:node package.json server.ts ./
COPY --chown=node:node lib/catalog.ts lib/sports.ts lib/prime.ts lib/provider-catalogs.ts lib/http-server.ts ./lib/
USER node
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
 CMD node -e "fetch('http://127.0.0.1:8788/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--experimental-strip-types", "server.ts"]
