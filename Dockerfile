# ---- Stage 1: build the React client ----
FROM node:24-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Server dependencies (only express — node:sqlite is built in, no native build).
COPY package*.json ./
RUN npm install --omit=dev

# Server source + built client.
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

# SQLite database lives on a mounted volume.
ENV DB_PATH=/data/uetr.db
VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "server/index.js"]
