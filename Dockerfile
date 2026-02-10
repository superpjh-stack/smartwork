FROM node:18-alpine

# better-sqlite3 네이티브 빌드에 필요한 도구 설치
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 앱 소스 복사
COPY . .

# Cloud Run이 PORT 환경변수를 자동 설정
EXPOSE 8080

CMD ["node", "server.js"]
