FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS development
USER node

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api/prisma apps/api/prisma
RUN npx prisma generate --schema apps/api/prisma/schema.prisma

FROM dependencies AS build
COPY . .
RUN npm run quality
RUN cp -R apps/api/dist/test /tmp/api-tests && npm run compile

FROM build AS production-dependencies
RUN npm prune --omit=dev

FROM base AS api
ENV NODE_ENV=production
ENV API_TEST_ROOT=apps/api/test-build/test/integration
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /tmp/api-tests ./apps/api/test-build
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node apps/api/prisma ./apps/api/prisma
COPY --chown=node:node scripts/check-db.mjs scripts/smoke.mjs ./scripts/
USER node
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma && exec node apps/api/dist/main.js"]

FROM nginxinc/nginx-unprivileged:stable-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
