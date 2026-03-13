import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import purchaseRoutes from './routes/purchase';
import { query, execute } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件 - 上传目录
app.use('/uploads', express.static('uploads'));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/purchases', purchaseRoutes);

// 分割品部位列表
app.get('/api/cut-parts', async (req: Request, res: Response) => {
  try {
    const list = await query<any[]>('SELECT * FROM cut_parts WHERE status = 1 ORDER BY id');
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 库存管理
app.get('/api/inventory', async (req: Request, res: Response) => {
  try {
    const { type = 'all', page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let where = ' WHERE 1=1';
    if (type === 'whole') where += " AND i.item_type = 'whole'";
    if (type === 'cut') where += " AND i.item_type = 'cut'";

    const [list, countResult] = await Promise.all([
      query<any[]>(`
        SELECT i.*, p.batch_no, p.entry_date, p.supplier_id, s.name as supplier_name, cp.name as part_name
        FROM inventory i
        LEFT JOIN purchases p ON i.purchase_id = p.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN cut_parts cp ON i.part_id = cp.id
        ${where}
        ORDER BY i.id DESC
        LIMIT ? OFFSET ?
      `, [Number(pageSize), offset]),
      query<any[]>(`SELECT COUNT(*) as total FROM inventory i ${where}`)
    ]);

    res.json({ success: true, data: { list, total: countResult[0].total } });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 溯源查询
app.get('/api/traceability/:batchNo', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    
    // 获取进货信息
    const purchases = await query<any[]>(`
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.batch_no = ?
    `, [batchNo]);

    if (purchases.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该批次号信息' });
    }

    const purchase = purchases[0];

    // 获取分割记录
    const cutRecords = await query<any[]>(`
      SELECT cr.*, cp.name as part_name
      FROM cut_records cr
      LEFT JOIN cut_parts cp ON cr.part_id = cp.id
      WHERE cr.purchase_id = ?
    `, [purchase.id]);

    // 获取销售记录
    const salesRecords = await query<any[]>(`
      SELECT oi.*, o.order_no, o.order_date, c.name as customer_name, o.status as order_status
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE oi.batch_no = ?
    `, [batchNo]);

    res.json({
      success: true,
      data: {
        purchase,
        cutRecords,
        salesRecords
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 仪表盘统计
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // 今日进货
    const [todayPurchase] = await query<any[]>(`
      SELECT COUNT(*) as count, COALESCE(SUM(net_weight), 0) as weight
      FROM purchases WHERE entry_date = ? AND status != 'cancelled'
    `, [today]);

    // 今日销售
    const [todaySales] = await query<any[]>(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders WHERE order_date = ? AND status NOT IN ('cancelled')
    `, [today]);

    // 待回款
    const [unpaid] = await query<any[]>(`
      SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total FROM orders WHERE status IN ('unpaid', 'partial')
    `);

    // 库存预警 (少于50公斤)
    const [lowStock] = await query<any[]>(`
      SELECT COUNT(*) as count FROM inventory WHERE quantity < 50 AND status = 'in_stock'
    `);

    // 销售趋势 (最近7天)
    const [salesTrend] = await query<any[]>(`
      SELECT order_date as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders 
      WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('cancelled')
      GROUP BY order_date
      ORDER BY order_date
    `);

    res.json({
      success: true,
      data: {
        todayPurchase,
        todaySales,
        unpaid,
        lowStock,
        salesTrend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 健康检查
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动
app.listen(PORT, () => {
  console.log(`🐷 猪肉溯源系统后端服务运行在: http://localhost:${PORT}`);
});
