FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install prisma@7.2.0 @prisma/client@7.2.0
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install prisma@7.2.0 @prisma/client@7.2.0
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main"]
