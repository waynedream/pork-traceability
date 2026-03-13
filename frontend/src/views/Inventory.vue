<template>
  <div class="inventory">
    <h2 class="page-title">库存管理</h2>
    <el-tabs v-model="activeTab" @tab-change="fetchList">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="整猪库存" name="whole" />
      <el-tab-pane label="分割品库存" name="cut" />
    </el-tabs>
    
    <el-card shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="batch_no" label="批次号" width="150" />
        <el-table-column prop="item_type" label="类型" width="100">
          <template #default="{ row }">{{ row.item_type === 'whole' ? '整猪' : '分割品' }}</template>
        </el-table-column>
        <el-table-column prop="part_name" label="部位" width="100" />
        <el-table-column prop="quantity" label="库存(kg)" width="100" />
        <el-table-column prop="locked_quantity" label="锁定(kg)" width="100" />
        <el-table-column prop="supplier_name" label="供应商" min-width="120" />
        <el-table-column prop="entry_date" label="进场日期" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'in_stock' ? 'success' : row.status === 'locked' ? 'warning' : 'info'">
              {{ row.status === 'in_stock' ? '在库' : row.status === 'locked' ? '已锁定' : '已出库' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10,20,50]" layout="total,sizes,prev,pager,next" @change="fetchList" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '@/utils/request'

const loading = ref(false)
const tableData = ref<any[]>([])
const activeTab = ref('all')

const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

async function fetchList() {
  loading.value = true
  try {
    const res = await api.get('/inventory', { type: activeTab.value, page: pagination.page, pageSize: pagination.pageSize })
    if (res.success) { tableData.value = res.data.list; pagination.total = res.data.total }
  } finally { loading.value = false }
}

onMounted(fetchList)
</script>

<style scoped>
.page-title { margin-bottom: 20px; font-size: 20px; font-weight: 600; color: #333; }
.pagination { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
