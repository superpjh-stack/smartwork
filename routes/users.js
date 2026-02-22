const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// 비밀번호 해싱
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// 회사 목록 (사용자 생성 시 필요 - /:id보다 먼저 정의해야 함)
router.get('/companies/list', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const companies = await prisma.company.findMany({
      select: { id: true, companyCode: true, name: true },
      orderBy: { name: 'asc' },
    });

    res.json(companies.map(c => ({
      id: c.id,
      company_code: c.companyCode,
      name: c.name,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const currentUser = req.user;

  try {
    const where = currentUser.role === 'super_admin' ? {} : { companyId: currentUser.company_id };

    const users = await prisma.user.findMany({
      where,
      include: { company: { select: { name: true, companyCode: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      company_id: u.companyId,
      is_active: u.isActive,
      created_at: u.createdAt,
      company_name: u.company?.name ?? null,
      company_code: u.company?.companyCode ?? null,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 상세 조회
router.get('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const currentUser = req.user;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { company: { select: { name: true, companyCode: true } } },
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // company_admin은 자기 회사 소속만 조회 가능
    if (currentUser.role !== 'super_admin' && user.companyId !== currentUser.company_id) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      company_id: user.companyId,
      is_active: user.isActive,
      created_at: user.createdAt,
      company_name: user.company?.name ?? null,
      company_code: user.company?.companyCode ?? null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 생성 (super_admin만)
router.post('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
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
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        role: role || 'company_admin',
        companyId: company_id || null,
        isActive: is_active !== undefined ? Boolean(is_active) : true,
      },
    });

    res.status(201).json({
      id: user.id,
      message: '사용자가 등록되었습니다.',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 수정
router.put('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
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
    const data = {};

    if (currentUser.role === 'super_admin') {
      data.username = username;
      data.name = name;
      data.role = role || 'company_admin';
      data.companyId = company_id || null;
      data.isActive = is_active !== undefined ? Boolean(is_active) : true;
    } else {
      data.username = username;
      data.name = name;
    }

    if (password && password.length > 0) {
      if (password.length < 4) {
        return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
      }
      data.passwordHash = await hashPassword(password);
    }

    await prisma.user.update({ where: { id: targetId }, data });

    res.json({ message: '사용자가 수정되었습니다.' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 삭제 (super_admin만)
router.delete('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
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
    await prisma.user.delete({ where: { id: targetId } });
    res.json({ message: '사용자가 삭제되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
