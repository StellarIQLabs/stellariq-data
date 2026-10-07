# stellariq-data: internal-api service image.
# The service has no external runtime dependencies (only node:http), so the
# runtime stage ships just the compiled dist.
FROM node:20-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --no-audit --no-fund
RUN npm run build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --create-home --uid 10001 stellariq
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER stellariq
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/apps/internal-api/src/index.js"]
