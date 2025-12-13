# Stage 1: Build
FROM node:20 AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run t   # compile TS

# Stage 2: Production
FROM node:20
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app ./
ENV PORT=8080
EXPOSE $PORT
USER node
CMD ["npm", "start"]
