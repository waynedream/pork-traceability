<template>
  <div class="dashboard">
    <h2 class="page-title">数据概览</h2>
    
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #409eff">
            <el-icon :size="30"><ShoppingCart /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">今日进货量</div>
            <div class="stat-value">{{ stats.todayPurchase?.weight || 0 }} <span class="unit">公斤</span></div>
            <div class="stat-desc">今日进货 {{ stats.todayPurchase?.count || 0 }} 头</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #67c23a">
            <el-icon :size="30"><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">今日销售额</div>
            <div class="stat-value">¥{{ stats.todaySales?.amount || 0 }}</div>
            <div class="stat-desc">今日订单 {{ stats.todaySales?.count || 0 }} 单</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" style="background: #e6a23c">
            <el-icon :size="30"><Wallet /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">待回款金额</div>
            <div class="stat-value">¥{{ stats.unpaid?.total || 0 }}</div>
            <div class="stat-desc">请及时催收</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card" :class="{ 'warning': stats.lowStock?.count > 0 }">
          <div class="stat-icon" :style="{ background: stats.lowStock?.count > 0 ? '#f56c6c' : '#909399' }">
            <el-icon :size="30"><WarningFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">库存预警</div>
            <div class="stat-value">{{ stats.lowStock?.count || 0 }} <span class="unit">项</span></div>
            <div class="stat-desc">低于50公斤</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>销售趋势 (近7天)</span>
            </div>
          </template>
          <div class="chart-placeholder">
            <el-table :data="stats.salesTrend" height="300" style="width: 100%">
              <el-table-column prop="date" label="日期" width="120" />
              <el-table-column prop="count" label="订单数" width="100" />
              <el-table-column prop="amount" label="销售金额">
                <template #default="{ row }">
                  ¥{{ row.amount }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/request'

const stats = ref<any>({})

async function fetchStats() {
  try {
    const res = await api.get('/dashboard/stats')
    if (res.success) {
      stats.value = res.data
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.page-title {
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
}

.stat-card.warning {
  border-color: #f56c6c;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 15px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-value .unit {
  font-size: 14px;
  font-weight: normal;
  color: #999;
}

.stat-desc {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.card-header {
  font-weight: 600;
}

.chart-placeholder {
  min-height: 300px;
}
</style>
