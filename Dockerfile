ARG BASE_IMAGE=oven/bun:1-slim

FROM ${BASE_IMAGE} AS build
ARG BASE_IMAGE

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN command -v bun >/dev/null 2>&1 || curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV NITRO_PRESET=bun
ENV MOUNT=/data/sb-root
RUN bun run build

FROM ${BASE_IMAGE}
ARG BASE_IMAGE

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip ca-certificates sqlite3 \
    && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN command -v bun >/dev/null 2>&1 || curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/server/database/schema.ts ./server/database/schema.ts
COPY --from=build /app/server/database/migrations ./server/database/migrations
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV MOUNT=/data/sb-root
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", ".output/server/index.mjs"]
