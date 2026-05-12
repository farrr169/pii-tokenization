FROM node:20-alpine

RUN apk add --no-cache openssl curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/server.js"]
