import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, execute } from './db';
import { authenticateToken, authorize, JWT_SECRET, AuthRequest } from './auth';

const router = Router();

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    const users = await query<any[]>(
      'SELECT id, username, password, role, real_name FROM users WHERE username = ? AND status = 1',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          realName: user.real_name
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const users = await query<any[]>(
      'SELECT id, username, role, real_name, phone FROM users WHERE id = ?',
      [req.user!.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const user = users[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        realName: user.real_name,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取用户菜单权限
router.get('/menus', authenticateToken, async (req: AuthRequest, res: Response) => {
  const roleMenus: Record<string, any[]> = {
    super_admin: [
      { path: '/dashboard', name: '首页', icon: 'HomeFilled' },
      { path: '/users', name: '用户管理', icon: 'User' },
      { path: '/suppliers', name: '供应商管理', icon: 'OfficeBuilding' },
      { path: '/purchase', name: '进货管理', icon: 'ShoppingCart' },
      { path: '/cut', name: '分割管理', icon: 'Cut' },
      { path: '/inventory', name: '库存管理', icon: 'Box' },
      { path: '/orders', name: '订单管理', icon: 'Document' },
      { path: '/delivery', name: '配送管理', icon: 'Van' },
      { path: '/payment', name: '回款管理', icon: 'Money' },
      { path: '/traceability', name: '溯源查询', icon: 'Search' },
    ],
    purchaser: [
      { path: '/dashboard', name: '首页', icon: 'HomeFilled' },
      { path: '/purchase', name: '进货管理', icon: 'ShoppingCart' },
      { path: '/inventory', name: '库存查看', icon: 'Box' },
    ],
    processor: [
      { path: '/dashboard', name: '首页', icon: 'HomeFilled' },
      { path: '/cut', name: '分割管理', icon: 'Cut' },
    ],
    sales: [
      { path: '/dashboard', name: '首页', icon: 'HomeFilled' },
      { path: '/orders', name: '订单管理', icon: 'Document' },
      { path: '/delivery', name: '配送管理', icon: 'Van' },
    ],
    finance: [
      { path: '/dashboard', name: '首页', icon: 'HomeFilled' },
      { path: '/payment', name: '回款管理', icon: 'Money' },
    ],
  };

  const menus = roleMenus[req.user!.role] || [];
  res.json({ success: true, data: menus });
});

// 用户管理 - 列表
router.get('/users', authenticateToken, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, keyword = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let where = '';
    const params: any[] = [];
    
    if (keyword) {
      where = ' WHERE username LIKE ? OR real_name LIKE ?';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [users, countResult] = await Promise.all([
      query<any[]>(`SELECT * FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]),
      query<any[]>(`SELECT COUNT(*) as total FROM users ${where}`, params)
    ]);

    res.json({
      success: true,
      data: {
        list: users,
        total: countResult[0].total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 用户管理 - 创建
router.post('/users', authenticateToken, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role, realName, phone } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: '请填写必填项' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await execute(
      'INSERT INTO users (username, password, role, real_name, phone) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, role, realName || '', phone || '']
    );

    res.json({ success: true, message: '创建成功', data: { id: result.insertId } });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 供应商管理 - 列表
router.get('/suppliers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, keyword = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let where = ' WHERE 1=1';
    const params: any[] = [];
    
    if (keyword) {
      where += ' AND (name LIKE ? OR contact_person LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [list, countResult] = await Promise.all([
      query<any[]>(`SELECT * FROM suppliers ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]),
      query<any[]>(`SELECT COUNT(*) as total FROM suppliers ${where}`, params)
    ]);

    res.json({ success: true, data: { list, total: countResult[0].total } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 供应商管理 - 创建
router.post('/suppliers', authenticateToken, authorize('super_admin', 'purchaser'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, contactPerson, phone, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '请填写供应商名称' });
    }

    const result = await execute(
      'INSERT INTO suppliers (name, contact_person, phone, address) VALUES (?, ?, ?, ?)',
      [name, contactPerson || '', phone || '', address || '']
    );

    res.json({ success: true, message: '创建成功', data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
