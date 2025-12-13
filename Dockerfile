FROM node:20-bullseye

# Native deps (canvas, ffmpeg, puppeteer)
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

# Copy npm manifests
COPY package*.json ./

# Match your local behavior
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Compile TS → lib/
RUN npm run t

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["dumb-init", "node", "lib/main.js"]
