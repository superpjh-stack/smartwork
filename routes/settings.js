const express = require('express');
const router = express.Router();

// 설정 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 설정 조회
router.get('/:key', (req, res) => {
  const db = req.app.locals.db;

  try {
    const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);

    if (!setting) {
      return res.status(404).json({ error: '설정을 찾을 수 없습니다.' });
    }

    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 설정 저장/수정
router.put('/:key', (req, res) => {
  const db = req.app.locals.db;
  const { value } = req.body;

  try {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, value);
    res.json({ message: '설정이 저장되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 일괄 설정 저장
router.post('/bulk', (req, res) => {
  const db = req.app.locals.db;
  const settings = req.body;

  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    Object.entries(settings).forEach(([key, value]) => {
      stmt.run(key, value);
    });

    res.json({ message: '설정이 저장되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 설정 삭제
router.delete('/:key', (req, res) => {
  const db = req.app.locals.db;

  try {
    const result = db.prepare('DELETE FROM settings WHERE key = ?').run(req.params.key);

    if (result.changes === 0) {
      return res.status(404).json({ error: '설정을 찾을 수 없습니다.' });
    }

    res.json({ message: '설정이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
