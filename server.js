require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const prisma = require('./lib/prisma');
const { initScheduler, stopScheduler } = require('./lib/kpi-scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// 미들웨어
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiLimiter);

// Prisma를 라우터에서 사용할 수 있도록 설정
app.locals.prisma = prisma;

// 인증 미들웨어
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const token = authHeader.slice(7);

  try {
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return res.status(401).json({ error: '유효하지 않은 세션입니다.' });
    }

    if (!session.user.isActive) {
      return res.status(403).json({ error: '비활성화된 계정입니다.' });
    }

    req.user = {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
      company_id: session.user.companyId,
    };

    next();
  } catch (error) {
    res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

// 인증 불필요 라우트
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));

// 인증 필요 라우트
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/products', authMiddleware, require('./routes/products'));
app.use('/api/inventory', authMiddleware, require('./routes/inventory'));
app.use('/api/customers', authMiddleware, require('./routes/customers'));
app.use('/api/orders', authMiddleware, require('./routes/orders'));
app.use('/api/productions', authMiddleware, require('./routes/productions'));
app.use('/api/shipments', authMiddleware, require('./routes/shipments'));
app.use('/api/reports', authMiddleware, require('./routes/reports'));
app.use('/api/settings', authMiddleware, require('./routes/settings'));
app.use('/api/kpi/external', authMiddleware, require('./routes/kpi-external'));
app.use('/api/kpi', authMiddleware, require('./routes/kpi'));

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

const server = app.listen(PORT, () => {
  console.log(`스마트공방 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  initScheduler(prisma);
});

// Graceful shutdown
async function shutdown() {
  console.log('서버 종료 중...');
  stopScheduler();
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
