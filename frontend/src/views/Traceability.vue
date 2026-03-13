<template>
  <div class="traceability">
    <h2 class="page-title">溯源查询</h2>
    <el-card shadow="never">
      <div class="search-box">
        <el-input v-model="batchNo" placeholder="请输入批次号（如：20260312-001）" size="large" @keyup.enter="handleSearch">
          <template #append>
            <el-button type="primary" @click="handleSearch">查询</el-button>
          </template>
        </el-input>
      </div>

      <div v-if="result" class="result">
        <el-divider content-position="left">进货信息</el-divider>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="批次号">{{ result.purchase.batch_no }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ result.purchase.supplier_name }}</el-descriptions-item>
          <el-descriptions-item label="进场日期">{{ result.purchase.entry_date }}</el-descriptions-item>
          <el-descriptions-item label="毛重">{{ result.purchase.gross_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="净重">{{ result.purchase.net_weight }} kg</el-descriptions-item>
          <el-descriptions-item label="检疫合格证">{{ result.purchase.quarantine_cert_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="耳标号">{{ result.purchase.ear_tag_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ result.purchase.total_amount }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="result.purchase.status === 'processed' ? 'success' : 'warning'">
              {{ result.purchase.status === 'processed' ? '已分割' : '待分割' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider v-if="result.cutRecords?.length" content-position="left">分割记录</el-divider>
        <el-table v-if="result.cutRecords?.length" :data="result.cutRecords" stripe>
          <el-table-column prop="part_name" label="部位" />
          <el-table-column prop="weight" label="重量(kg)" />
        </el-table>

        <el-divider v-if="result.salesRecords?.length" content-position="left">销售记录</el-divider>
        <el-table v-if="result.salesRecords?.length" :data="result.salesRecords" stripe>
          <el-table-column prop="order_no" label="订单号" />
          <el-table-column prop="customer_name" label="客户" />
          <el-table-column prop="order_date" label="销售日期" />
          <el-table-column prop="quantity" label="数量(kg)" />
          <el-table-column prop="order_status" label="订单状态" />
        </el-table>
      </div>

      <el-empty v-else-if="searched" description="未找到该批次号信息" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/utils/request'

const batchNo = ref('')
const searched = ref(false)
const result = ref<any>(null)

async function handleSearch() {
  if (!batchNo.value) return ElMessage.warning('请输入批次号')
  searched.value = true
  try {
    const res = await api.get(`/traceability/${batchNo.value}`)
    if (res.success) { result.value = res.data } else { result.value = null; ElMessage.warning(res.message) }
  } catch { result.value = null }
}
</script>

<style scoped>
.page-title { margin-bottom: 20px; font-size: 20px; font-weight: 600; color: #333; }
.search-box { max-width: 500px; margin-bottom: 30px; }
.result { margin-top: 20px; }
</style>
