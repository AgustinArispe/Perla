FROM node:24.13.0-bookworm-slim@sha256:4660b1ca8b28d6d1906fd644abe34b2ed81d15434d26d845ef0aced307cf4b6f AS development

# SQLite native bindings and git are needed for development, never a SQL server.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    BOCHA_SKIP_ELECTRON_CHECK=1 \
    BOCHA_USE_POLLING=1

WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/install-native.mjs scripts/install-native.mjs
RUN npm ci --ignore-scripts && npm run postinstall
COPY docker/entrypoint.sh /usr/local/bin/bocha-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/bocha-entrypoint && chmod +x /usr/local/bin/bocha-entrypoint
COPY . .

EXPOSE 5173
ENTRYPOINT ["bocha-entrypoint"]
CMD ["npm", "run", "dev:web"]
