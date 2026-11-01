FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
RUN npm ci --omit=dev --workspace server && mkdir -p /app/server/data
ENV CLIENT_DIST=/app/client/dist DB_PATH=/app/server/data/studypilot.db
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "server"]
