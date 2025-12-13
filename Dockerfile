# Stage 1: Build TypeScript
FROM node:20 AS build

WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for caching
COPY package*.json ./

# Install all dependencies (including dev for TS compilation)
RUN npm install

# Copy all source code
COPY . .

# Compile TypeScript
RUN npm run t   # This runs "tsc" from your package.json

# Stage 2: Production image
FROM node:20

WORKDIR /usr/src/app

# Copy only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled files from build stage
COPY --from=build /usr/src/app/lib ./lib
COPY --from=build /usr/src/app/ecosystem.config.js ./

# Expose your app port (if needed)
ENV PORT=8080
EXPOSE $PORT

# Use non-root user
USER node

# Start your bot with PM2
CMD ["pm2-runtime", "ecosystem.config.js"]
