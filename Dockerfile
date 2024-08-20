FROM node:22-bullseye-slim as base
WORKDIR /app

FROM base as dependencies
COPY package.json .
COPY package-lock.json .
RUN npm ci --silent

FROM dependencies as migrations
CMD ["npm", "run", "migrate"]

FROM dependencies as build
COPY --from=dependencies /app/node_modules ./node_modules
COPY tsconfig.json .
COPY src .
RUN npm run build

FROM base as final
COPY --from=build /app/dist .
COPY --from=dependencies /app/node_modules ./node_modules
