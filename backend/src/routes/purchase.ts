import { Router, Response } from 'express';
import { query, execute } from '../db';
import { authenticateToken, authorize, AuthRequest } from '../auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 生成批次号
function generateBatchNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${dateStr}-${random}`;
}

// 进货管理 - 列表
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 10, keyword = '', status = '', startDate = '', endDate = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let where = ' WHERE 1=1';
    const params: any[] = [];
    
    if (keyword) {
      where += ' AND (p.batch_no LIKE ? OR s.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      where += ' AND p.status = ?';
      params.push(status);
    }
    if (startDate) {
      where += ' AND p.entry_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND p.entry_date <= ?';
      params.push(endDate);
    }

    const [list, countResult] = await Promise.all([
      query<any[]>(`
        SELECT p.*, s.name as supplier_name, u.real_name as creator_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON p.created_by = u.id
        ${where} 
        ORDER BY p.id DESC 
        LIMIT ? OFFSET ?
      `, [...params, Number(pageSize), offset]),
      query<any[]>(`SELECT COUNT(*) as total FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id ${where}`, params)
    ]);

    res.json({ success: true, data: { list, total: countResult[0].total } });
  } catch (error) {
    console.error('获取进货列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 进货管理 - 详情
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const purchases = await query<any[]>(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `, [id]);

    if (purchases.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    res.json({ success: true, data: purchases[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 进货管理 - 创建
router.post('/', authenticateToken, authorize('super_admin', 'purchaser'), async (req: AuthRequest, res: Response) => {
  try {
    const { supplierId, entryDate, grossWeight, netWeight, unitPrice, quarantineCertNo, earTagNo, remark } = req.body;
    
    if (!supplierId || !entryDate || !grossWeight || !netWeight || !unitPrice) {
      return res.status(400).json({ success: false, message: '请填写必填项' });
    }

    const totalAmount = Number(netWeight) * Number(unitPrice);
    const batchNo = generateBatchNo();
    
    const result = await execute(
      `INSERT INTO purchases (batch_no, supplier_id, entry_date, gross_weight, net_weight, unit_price, total_amount, quarantine_cert_no, ear_tag_no, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [batchNo, supplierId, entryDate, grossWeight, netWeight, unitPrice, totalAmount, quarantineCertNo || '', earTagNo || '', 'pending', remark || '', req.user!.userId]
    );

    // 创建整猪库存记录
    await execute(
      `INSERT INTO inventory (item_type, purchase_id, batch_no, quantity, status) VALUES (?, ?, ?, ?, ?)`,
      ['whole', result.insertId, batchNo, netWeight, 'in_stock']
    );

    res.json({ success: true, message: '进货记录创建成功', data: { id: result.insertId, batchNo } });
  } catch (error) {
    console.error('创建进货记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 进货管理 - 更新
router.put('/:id', authenticateToken, authorize('super_admin', 'purchaser'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierId, entryDate, grossWeight, netWeight, unitPrice, quarantineCertNo, earTagNo, status, remark } = req.body;
    
    const totalAmount = Number(netWeight) * Number(unitPrice);
    
    await execute(
      `UPDATE purchases SET supplier_id = ?, entry_date = ?, gross_weight = ?, net_weight = ?, unit_price = ?, total_amount = ?, quarantine_cert_no = ?, ear_tag_no = ?, status = ?, remark = ?
       WHERE id = ?`,
      [supplierId, entryDate, grossWeight, netWeight, unitPrice, totalAmount, quarantineCertNo || '', earTagNo || '', status, remark || '', id]
    );

    // 如果状态变为已分割，更新库存
    if (status === 'processed') {
      await execute(
        `UPDATE inventory SET status = 'out_stock' WHERE purchase_id = ? AND item_type = 'whole'`,
        [id]
      );
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 进货管理 - 删除
router.delete('/:id', authenticateToken, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查是否有分割记录
    const cutRecords = await query<any[]>('SELECT COUNT(*) as count FROM cut_records WHERE purchase_id = ?', [id]);
    if (cutRecords[0].count > 0) {
      return res.status(400).json({ success: false, message: '该记录已有分割记录，无法删除' });
    }

    await execute('DELETE FROM purchases WHERE id = ?', [id]);
    await execute('DELETE FROM inventory WHERE purchase_id = ? AND item_type = ?', [id, 'whole']);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 统计 - 今日进货量
router.get('/stats/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    const [todayStats] = await query<any[]>(`
      SELECT COUNT(*) as count, COALESCE(SUM(net_weight), 0) as totalWeight, COALESCE(SUM(total_amount), 0) as totalAmount
      FROM purchases 
      WHERE entry_date = ? AND status != 'cancelled'
    `, [today]);

    const [monthStats] = await query<any[]>(`
      SELECT COUNT(*) as count, COALESCE(SUM(net_weight), 0) as totalWeight, COALESCE(SUM(total_amount), 0) as totalAmount
      FROM purchases 
      WHERE entry_date >= DATE_FORMAT(NOW(), '%Y-%m-01') AND status != 'cancelled'
    `, []);

    res.json({ 
      success: true, 
      data: {
        today: todayStats,
        month: monthStats
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

export default router;
