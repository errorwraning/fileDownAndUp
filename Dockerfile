FROM node:18-alpine

WORKDIR /app

# 避免 npm 产生缓存文件
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --production --no-audit --no-fund

COPY . .

EXPOSE 8081

CMD ["node", "src/app.js"]
