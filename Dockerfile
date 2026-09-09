FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app

# BackupService pg_dump orqali ishlaydi — node:22-alpine'da standart holda
# postgresql-client O'RNATILMAGAN, shuning uchun backup butunlay ishlamay
# turgan edi ("pg_dump ishga tushmadi" xatosi bilan). docker-compose.yml'dagi
# DB versiyasiga (postgres:15) mos client'ni o'rnatamiz, topilmasa umumiy
# paketga tushamiz.
RUN apk add --no-cache postgresql15-client || apk add --no-cache postgresql-client

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main.js"]

