FROM node:23.10.0-slim AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json .
COPY package-lock.json .
RUN npm ci --silent

FROM dependencies AS migrations
CMD ["npm", "run", "migrate"]

FROM dependencies AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY tsconfig.json .
COPY src .
RUN npm run build

FROM base AS final
COPY --from=build /app/dist .
COPY --from=dependencies /app/node_modules ./node_modules
