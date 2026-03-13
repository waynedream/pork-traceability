-- 猪肉批发溯源系统 - MySQL 数据库建表语句
-- 创建数据库
CREATE DATABASE IF NOT EXISTS pork_traceability DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pork_traceability;

-- =============================================
-- 1. 用户与权限管理
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码(加密存储)',
    role ENUM('super_admin', 'purchaser', 'processor', 'sales', 'finance') NOT NULL DEFAULT 'sales' COMMENT '角色',
    real_name VARCHAR(50) COMMENT '真实姓名',
    phone VARCHAR(20) COMMENT '手机号',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- =============================================
-- 2. 供应商管理
-- =============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '供应商名称',
    contact_person VARCHAR(50) COMMENT '联系人',
    phone VARCHAR(20) COMMENT '联系电话',
    address VARCHAR(255) COMMENT '地址',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商表';

-- =============================================
-- 3. 进货管理（整猪入库）
-- =============================================
CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_no VARCHAR(50) NOT NULL UNIQUE COMMENT '溯源批次号(如:20260312-001)',
    supplier_id BIGINT NOT NULL COMMENT '供应商ID',
    entry_date DATE NOT NULL COMMENT '进场日期',
    gross_weight DECIMAL(10,2) NOT NULL COMMENT '毛重(公斤)',
    net_weight DECIMAL(10,2) NOT NULL COMMENT '净重(公斤)',
    unit_price DECIMAL(10,2) NOT NULL COMMENT '单价(元/公斤)',
    total_amount DECIMAL(12,2) NOT NULL COMMENT '总金额',
    quarantine_cert_no VARCHAR(100) COMMENT '检疫合格证号',
    ear_tag_no VARCHAR(100) COMMENT '耳标号',
    status ENUM('pending', 'processing', 'processed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态',
    remark TEXT COMMENT '备注',
    created_by BIGINT COMMENT '操作人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_batch_no (batch_no),
    INDEX idx_supplier (supplier_id),
    INDEX idx_entry_date (entry_date),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='进货表(整猪入库)';

-- =============================================
-- 4. 分割品定义
-- =============================================
CREATE TABLE IF NOT EXISTS cut_parts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '部位名称(如:里脊/五花/排骨)',
    description VARCHAR(100) COMMENT '描述',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分割品部位表';

-- 插入默认部位数据
INSERT INTO cut_parts (name, description) VALUES 
('里脊', '猪里脊肉'),
('五花', '五花肉'),
('排骨', '猪排骨'),
('瘦肉', '瘦肉/后腿肉'),
('肥肉', '肥膘'),
('猪蹄', '猪蹄'),
('猪头', '猪头肉'),
('内脏', '内脏类'),
('损耗', '分割损耗/碎肉');

-- =============================================
-- 5. 分割记录
-- =============================================
CREATE TABLE IF NOT EXISTS cut_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    purchase_id BIGINT NOT NULL COMMENT '进货记录ID',
    part_id BIGINT NOT NULL COMMENT '部位ID',
    weight DECIMAL(10,2) NOT NULL COMMENT '重量(公斤)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_purchase (purchase_id),
    INDEX idx_part (part_id),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES cut_parts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分割记录表';

-- =============================================
-- 6. 库存管理
-- =============================================
CREATE TABLE IF NOT EXISTS inventory (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    item_type ENUM('whole', 'cut') NOT NULL COMMENT '类型: whole=整猪, cut=分割品',
    purchase_id BIGINT COMMENT '进货记录ID(整猪库存时使用)',
    part_id BIGINT COMMENT '部位ID(分割品库存时使用)',
    batch_no VARCHAR(50) COMMENT '溯源批次号',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '库存数量(公斤)',
    locked_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '锁定数量(公斤)',
    status ENUM('in_stock', 'locked', 'out_stock') NOT NULL DEFAULT 'in_stock' COMMENT '库存状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (item_type),
    INDEX idx_batch_no (batch_no),
    INDEX idx_purchase (purchase_id),
    INDEX idx_part (part_id),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
    FOREIGN KEY (part_id) REFERENCES cut_parts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表';

-- =============================================
-- 7. 客户管理
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '客户名称',
    contact_person VARCHAR(50) COMMENT '联系人',
    phone VARCHAR(20) COMMENT '联系电话',
    address VARCHAR(255) COMMENT '地址',
    payment_type ENUM('cash', 'credit') NOT NULL DEFAULT 'credit' COMMENT '付款方式: cash=现结, credit=赊账',
    credit_limit DECIMAL(12,2) DEFAULT 0 COMMENT '信用额度',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户表';

-- =============================================
-- 8. 订单管理
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
    customer_id BIGINT NOT NULL COMMENT '客户ID',
    order_date DATE NOT NULL COMMENT '订单日期',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '订单总金额',
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '已付金额',
    status ENUM('unpaid', 'partial', 'paid', 'processing', 'delivering', 'completed', 'cancelled') NOT NULL DEFAULT 'unpaid' COMMENT '订单状态',
    remark TEXT COMMENT '备注',
    created_by BIGINT COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_no (order_no),
    INDEX idx_customer (customer_id),
    INDEX idx_order_date (order_date),
    INDEX idx_status (status),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- =============================================
-- 9. 订单明细
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    inventory_id BIGINT NOT NULL COMMENT '库存ID',
    part_id BIGINT NOT NULL COMMENT '部位ID',
    batch_no VARCHAR(50) NOT NULL COMMENT '溯源批次号',
    quantity DECIMAL(10,2) NOT NULL COMMENT '销售数量(公斤)',
    unit_price DECIMAL(10,2) NOT NULL COMMENT '单价(元/公斤)',
    subtotal DECIMAL(12,2) NOT NULL COMMENT '小计',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order (order_id),
    INDEX idx_inventory (inventory_id),
    INDEX idx_batch_no (batch_no),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT,
    FOREIGN KEY (part_id) REFERENCES cut_parts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- =============================================
-- 10. 配送管理
-- =============================================
CREATE TABLE IF NOT EXISTS deliveries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    delivery_no VARCHAR(50) NOT NULL UNIQUE COMMENT '配送单号',
    order_ids VARCHAR(500) NOT NULL COMMENT '关联订单ID列表(逗号分隔)',
    driver_name VARCHAR(50) COMMENT '配送员',
    vehicle_no VARCHAR(20) COMMENT '车牌号',
    delivery_date DATE NOT NULL COMMENT '配送日期',
    status ENUM('pending', 'delivering', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态',
    remark TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_delivery_no (delivery_no),
    INDEX idx_delivery_date (delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配送单表';

-- =============================================
-- 11. 回款管理
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL COMMENT '订单ID',
    amount DECIMAL(12,2) NOT NULL COMMENT '回款金额',
    payment_date DATE NOT NULL COMMENT '回款日期',
    payment_method ENUM('cash', 'transfer', 'wechat', 'alipay', 'other') NOT NULL DEFAULT 'cash' COMMENT '付款方式',
    voucher_image VARCHAR(255) COMMENT '回款凭证图片路径',
    remark TEXT COMMENT '备注',
    created_by BIGINT COMMENT '操作人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order (order_id),
    INDEX idx_payment_date (payment_date),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回款记录表';

-- =============================================
-- 初始化管理员账号 (密码: admin123)
-- =============================================
INSERT INTO users (username, password, role, real_name) VALUES 
('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'super_admin', '系统管理员');

-- 说明: 密码 bcrypt 加密后为 admin123
