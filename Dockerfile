# syntax=docker/dockerfile:1

########## BASE IMAGE ##########
FROM node:20-bullseye AS base

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install OS deps ONCE
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    chromium \
    libgbm-dev \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    python3 \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

########## DEPENDENCIES LAYER ##########
FROM base AS deps

# Copy ONLY dependency files
COPY package.json yarn.lock ./

# Install deps (cached unless lockfile changes)
RUN yarn install --frozen-lockfile --production=false

########## BUILD LAYER ##########
FROM deps AS build

# Copy source code AFTER deps
COPY . .

# Build TypeScript
RUN npm run t

########## RUNTIME IMAGE ##########
FROM base AS runtime

WORKDIR /app

# Copy built app + node_modules ONLY
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./package.json

# Start app
CMD ["dumb-init", "node", "lib/bot.js"]
