# 猪肉批发溯源管理系统

## 项目结构

```
pork-traceability/
├── backend/           # NestJS 后端
│   ├── src/
│   │   ├── db.ts           # 数据库连接
│   │   ├── auth.ts         # JWT认证中间件
│   │   ├── main.ts         # 入口文件
│   │   └── routes/         # 路由模块
│   ├── database.sql        # MySQL建表语句
│   └── package.json
│
├── frontend/          # Vue3 前端
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # Pinia状态管理
│   │   └── utils/          # 工具函数
│   └── package.json
│
└── README.md
```

## 快速开始

### 1. 初始化数据库

```bash
# 登录 MySQL
mysql -u root -p

# 执行建表脚本
SOURCE /path/to/database.sql;
```

**修改数据库配置：**
```bash
cp backend/.env.example backend/.env
# 编辑 .env 文件，设置数据库连接信息
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

后端服务将在 http://localhost:3001 启动

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 http://localhost:3000 启动

### 4. 登录系统

- **用户名：** admin
- **密码：** admin123

## 功能模块

| 模块 | 说明 |
|------|------|
| 进货管理 | 整猪入库，生成溯源批次号 |
| 分割管理 | BOM拆分，记录各部位重量 |
| 库存管理 | 实时库存，支持整猪/分割品 |
| 订单管理 | 客户下单，库存锁定 |
| 配送管理 | 配送单生成与状态跟踪 |
| 回款管理 | 应收款与回款记录 |
| 溯源查询 | 输入批次号查询肉品来源 |

## 技术栈

- **前端：** Vue3 + Element Plus + Vite
- **后端：** Node.js + Express + MySQL
- **认证：** JWT

## 界面预览

登录页 → Dashboard → 进货管理列表 → 新增进货表单

---

🐷 猪肉批发溯源管理系统 v1.0
