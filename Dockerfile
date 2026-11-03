FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY server.js ./
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
