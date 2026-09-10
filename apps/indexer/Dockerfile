# stellariq-data: indexer service image.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/indexer/package.json apps/indexer/
COPY packages/core/package.json packages/core/
COPY packages/adapters/package.json packages/adapters/
COPY packages/models/package.json packages/models/
COPY packages/protocols/package.json packages/protocols/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json tsconfig.build.json ./
COPY apps apps
COPY packages packages
COPY database database
RUN npm run build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --create-home --uid 10001 stellariq
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER stellariq
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "import('node:fs').then((fs) => fs.promises.access('/app/dist/apps/indexer/src/index.js'))"
CMD ["node", "dist/apps/indexer/src/index.js"]
