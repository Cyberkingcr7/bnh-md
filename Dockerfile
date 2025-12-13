FROM node:20 AS build

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Compile TypeScript
RUN npx tsc --skipLibCheck

# Stage 2: Production
FROM node:20

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

ENV PORT=8080
EXPOSE $PORT

USER node

CMD ["node", "dist/main.js"]
