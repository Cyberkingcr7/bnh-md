# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV=production
ARG YARN_VERSION=1.22.21
RUN npm install -g yarn@${YARN_VERSION} --force


# =========================
# Build stage
# =========================
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    git && \
    rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn run build


# =========================
# Runtime stage
# =========================
FROM base

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    chromium \
    chromium-sandbox \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives

COPY --from=build /app /app

# SQLite persistence
RUN mkdir -p /data
VOLUME /data

ENV DATABASE_URL="file:///data/sqlite.db" \
    PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium"

EXPOSE 3000
CMD ["yarn", "run", "start"]
