const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();

// 비밀번호 검증 (bcrypt 우선, SHA-256 레거시 폴백)
async function verifyPassword(password, storedHash) {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compare(password, storedHash);
  }
  // 레거시 SHA-256 검증
  const [salt, hash] = storedHash.split(':');
  const inputHash = crypto.createHash('sha256').update(password + salt).digest('hex');
  return inputHash === hash;
}

// 세션 토큰 생성
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: '비활성화된 계정입니다.' });
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 레거시 SHA-256 해시 → bcrypt 자동 마이그레이션
    if (!user.passwordHash.startsWith('$2a$') && !user.passwordHash.startsWith('$2b$')) {
      const newHash = await bcrypt.hash(password, 12);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    }

    // 기존 세션 정리 (해당 유저)
    await prisma.session.deleteMany({ where: { userId: user.id } });

    // 새 세션 생성 (24시간 유효)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    // 회사 정보 조회
    const company = user.companyId
      ? await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { id: true, companyCode: true, name: true },
        })
      : null;

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        company_id: user.companyId,
        company: company
          ? { id: company.id, company_code: company.companyCode, name: company.name }
          : null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await prisma.session.deleteMany({ where: { token } });
  }

  res.json({ message: '로그아웃되었습니다.' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const prisma = req.app.locals.prisma;
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
      include: { user: true },
    });

    if (!session) {
      return res.status(401).json({ error: '유효하지 않은 세션입니다.' });
    }

    if (!session.user.isActive) {
      return res.status(403).json({ error: '비활성화된 계정입니다.' });
    }

    const company = session.user.companyId
      ? await prisma.company.findUnique({
          where: { id: session.user.companyId },
          select: { id: true, companyCode: true, name: true },
        })
      : null;

    res.json({
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
      company_id: session.user.companyId,
      company: company
        ? { id: company.id, company_code: company.companyCode, name: company.name }
        : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
