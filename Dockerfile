# build stage
FROM node:21.7.3-alpine3.18 AS build-stage
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci

COPY . .
RUN npm run build

RUN npm prune --production

# production stage
FROM node:21.7.3-alpine3.18
WORKDIR /app
COPY --from=build-stage /app/node_modules node_modules
COPY --from=build-stage /app/dist dist

CMD ["node", "dist/index.js"]