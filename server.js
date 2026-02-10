const express = require('express');
const cors = require('cors');
const path = require('path');

// 데이터베이스 초기화
const db = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 데이터베이스를 라우터에서 사용할 수 있도록 설정
app.locals.db = db;

// 인증 미들웨어
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const token = authHeader.slice(7);

  try {
    const session = db.prepare(`
      SELECT s.*, u.id as user_id, u.username, u.name, u.role, u.company_id, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);

    if (!session) {
      return res.status(401).json({ error: '유효하지 않은 세션입니다.' });
    }

    if (!session.is_active) {
      return res.status(401).json({ error: '비활성화된 계정입니다.' });
    }

    req.user = {
      id: session.user_id,
      username: session.username,
      name: session.name,
      role: session.role,
      company_id: session.company_id,
    };

    next();
  } catch (error) {
    res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

// 인증 불필요 라우트
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

app.listen(PORT, () => {
  console.log(`스마트공방 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
