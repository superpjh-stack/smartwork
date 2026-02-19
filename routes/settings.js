const express = require('express');
const router = express.Router();

// 설정 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const settings = await prisma.setting.findMany();
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 설정 조회
router.get('/:key', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });

    if (!setting) {
      return res.status(404).json({ error: '설정을 찾을 수 없습니다.' });
    }

    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 설정 저장/수정
router.put('/:key', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { value } = req.body;

  try {
    await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value },
      create: { key: req.params.key, value },
    });
    res.json({ message: '설정이 저장되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 일괄 설정 저장
router.post('/bulk', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const settings = req.body;

  try {
    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    res.json({ message: '설정이 저장되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 설정 삭제
router.delete('/:key', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    await prisma.setting.delete({ where: { key: req.params.key } });
    res.json({ message: '설정이 삭제되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '설정을 찾을 수 없습니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
