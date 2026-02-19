FROM node:18-alpine

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma 스키마 복사 및 클라이언트 생성
COPY prisma ./prisma/
RUN npx prisma generate

# 앱 소스 복사
COPY . .

# Cloud Run이 PORT 환경변수를 자동 설정
EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
