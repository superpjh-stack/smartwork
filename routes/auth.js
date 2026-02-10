const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// 비밀번호 검증
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const inputHash = crypto.createHash('sha256').update(password + salt).digest('hex');
  return inputHash === hash;
}

// 세션 토큰 생성
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const db = req.app.locals.db;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: '비활성화된 계정입니다.' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 기존 세션 정리 (해당 유저)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

    // 새 세션 생성 (24시간 유효)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

    // 회사 정보 조회
    const company = user.company_id
      ? db.prepare('SELECT id, company_code, name FROM companies WHERE id = ?').get(user.company_id)
      : null;

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        company: company,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const db = req.app.locals.db;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  res.json({ message: '로그아웃되었습니다.' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const db = req.app.locals.db;
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

    const company = session.company_id
      ? db.prepare('SELECT id, company_code, name FROM companies WHERE id = ?').get(session.company_id)
      : null;

    res.json({
      id: session.user_id,
      username: session.username,
      name: session.name,
      role: session.role,
      company_id: session.company_id,
      company: company,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
