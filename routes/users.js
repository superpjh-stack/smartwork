const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// 비밀번호 해싱
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
  return salt + ':' + hash;
}

// 회사 목록 (사용자 생성 시 필요 - /:id보다 먼저 정의해야 함)
router.get('/companies/list', (req, res) => {
  const db = req.app.locals.db;

  try {
    const companies = db.prepare('SELECT id, company_code, name FROM companies ORDER BY name').all();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사용자 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const currentUser = req.user;

  try {
    let users;
    if (currentUser.role === 'super_admin') {
      users = db.prepare(`
        SELECT u.id, u.username, u.name, u.role, u.company_id, u.is_active, u.created_at,
               c.name as company_name, c.company_code
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        ORDER BY u.created_at DESC
      `).all();
    } else {
      users = db.prepare(`
        SELECT u.id, u.username, u.name, u.role, u.company_id, u.is_active, u.created_at,
               c.name as company_name, c.company_code
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.company_id = ?
        ORDER BY u.created_at DESC
      `).all(currentUser.company_id);
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사용자 상세 조회
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const currentUser = req.user;

  try {
    const user = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.company_id, u.is_active, u.created_at,
             c.name as company_name, c.company_code
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // company_admin은 자기 회사 소속만 조회 가능
    if (currentUser.role !== 'super_admin' && user.company_id !== currentUser.company_id) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사용자 생성 (super_admin만)
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const currentUser = req.user;

  if (currentUser.role !== 'super_admin') {
    return res.status(403).json({ error: '권한이 없습니다.' });
  }

  const { username, password, name, role, company_id, is_active } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: '아이디, 비밀번호, 이름은 필수입니다.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
  }

  try {
    const passwordHash = hashPassword(password);
    const stmt = db.prepare('INSERT INTO users (username, password_hash, name, role, company_id, is_active) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(username, passwordHash, name, role || 'company_admin', company_id || null, is_active !== undefined ? is_active : 1);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: '사용자가 등록되었습니다.',
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 사용자 수정
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const currentUser = req.user;
  const targetId = parseInt(req.params.id);

  // company_admin은 자기 자신만 수정 가능
  if (currentUser.role !== 'super_admin' && currentUser.id !== targetId) {
    return res.status(403).json({ error: '권한이 없습니다.' });
  }

  const { username, password, name, role, company_id, is_active } = req.body;

  if (!username || !name) {
    return res.status(400).json({ error: '아이디와 이름은 필수입니다.' });
  }

  try {
    if (password && password.length > 0) {
      if (password.length < 4) {
        return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
      }
      const passwordHash = hashPassword(password);
      if (currentUser.role === 'super_admin') {
        db.prepare('UPDATE users SET username = ?, password_hash = ?, name = ?, role = ?, company_id = ?, is_active = ? WHERE id = ?')
          .run(username, passwordHash, name, role || 'company_admin', company_id || null, is_active !== undefined ? is_active : 1, targetId);
      } else {
        db.prepare('UPDATE users SET username = ?, password_hash = ?, name = ? WHERE id = ?')
          .run(username, passwordHash, name, targetId);
      }
    } else {
      if (currentUser.role === 'super_admin') {
        db.prepare('UPDATE users SET username = ?, name = ?, role = ?, company_id = ?, is_active = ? WHERE id = ?')
          .run(username, name, role || 'company_admin', company_id || null, is_active !== undefined ? is_active : 1, targetId);
      } else {
        db.prepare('UPDATE users SET username = ?, name = ? WHERE id = ?')
          .run(username, name, targetId);
      }
    }

    res.json({ message: '사용자가 수정되었습니다.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 사용자 삭제 (super_admin만)
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const currentUser = req.user;

  if (currentUser.role !== 'super_admin') {
    return res.status(403).json({ error: '권한이 없습니다.' });
  }

  const targetId = parseInt(req.params.id);

  // 자기 자신은 삭제 불가
  if (currentUser.id === targetId) {
    return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다.' });
  }

  try {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ message: '사용자가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
