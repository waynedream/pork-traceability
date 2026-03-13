<template>
  <div class="purchase">
    <h2 class="page-title">进货管理</h2>
    
    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input v-model="searchForm.keyword" placeholder="搜索批次号/供应商" clearable @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="状态" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已分割" value="processed" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增进货
      </el-button>
    </div>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="batch_no" label="批次号" width="140" />
        <el-table-column prop="supplier_name" label="供应商" min-width="120" />
        <el-table-column prop="entry_date" label="进场日期" width="120" />
        <el-table-column prop="gross_weight" label="毛重(kg)" width="100" />
        <el-table-column prop="net_weight" label="净重(kg)" width="100" />
        <el-table-column prop="unit_price" label="单价(元/kg)" width="100" />
        <el-table-column prop="total_amount" label="总金额" width="120">
          <template #default="{ row }">¥{{ row.total_amount }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ear_tag_no" label="耳标号" width="120" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑进货' : '新增进货'" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="form.supplierId" placeholder="请选择供应商" filterable>
            <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="进场日期" prop="entryDate">
          <el-date-picker v-model="form.entryDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="毛重(kg)" prop="grossWeight">
          <el-input-number v-model="form.grossWeight" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="净重(kg)" prop="netWeight">
          <el-input-number v-model="form.netWeight" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="单价(元/kg)" prop="unitPrice">
          <el-input-number v-model="form.unitPrice" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="检疫合格证号">
          <el-input v-model="form.quarantineCertNo" placeholder="请输入检疫合格证号" />
        </el-form-item>
        <el-form-item label="耳标号">
          <el-input v-model="form.earTagNo" placeholder="请输入耳标号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import api from '@/utils/request'

const loading = ref(false)
const tableData = ref<any[]>([])
const suppliers = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const searchForm = reactive({
  keyword: '',
  status: '',
  dateRange: [] as string[]
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  id: 0,
  supplierId: '',
  entryDate: '',
  grossWeight: 0,
  netWeight: 0,
  unitPrice: 0,
  quarantineCertNo: '',
  earTagNo: '',
  remark: ''
})

const rules = {
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  entryDate: [{ required: true, message: '请选择进场日期', trigger: 'change' }],
  grossWeight: [{ required: true, message: '请输入毛重', trigger: 'blur' }],
  netWeight: [{ required: true, message: '请输入净重', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }]
}

async function fetchSuppliers() {
  try {
    const res = await api.get('/suppliers', { pageSize: 100 })
    if (res.success) {
      suppliers.value = res.data.list
    }
  } catch (error) {
    console.error('获取供应商失败:', error)
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      status: searchForm.status,
      startDate: searchForm.dateRange?.[0] || '',
      endDate: searchForm.dateRange?.[1] || ''
    }
    const res = await api.get('/purchases', params)
    if (res.success) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.dateRange = []
  handleSearch()
}

function handleAdd() {
  isEdit.value = false
  Object.assign(form, {
    id: 0, supplierId: '', entryDate: new Date().toISOString().slice(0, 10),
    grossWeight: 0, netWeight: 0, unitPrice: 0, quarantineCertNo: '', earTagNo: '', remark: ''
  })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  isEdit.value = true
  Object.assign(form, {
    id: row.id,
    supplierId: row.supplier_id,
    entryDate: row.entry_date,
    grossWeight: row.gross_weight,
    netWeight: row.net_weight,
    unitPrice: row.unit_price,
    quarantineCertNo: row.quarantine_cert_no,
    earTagNo: row.ear_tag_no,
    remark: row.remark
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该进货记录吗?', '提示', { type: 'warning' })
    await api.delete(`/purchases/${row.id}`)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  
  submitLoading.value = true
  try {
    const data = {
      supplierId: form.supplierId,
      entryDate: form.entryDate,
      grossWeight: form.grossWeight,
      netWeight: form.netWeight,
      unitPrice: form.unitPrice,
      quarantineCertNo: form.quarantineCertNo,
      earTagNo: form.earTagNo,
      remark: form.remark
    }
    
    if (isEdit.value) {
      await api.put(`/purchases/${form.id}`, data)
    } else {
      await api.post('/purchases', data)
    }
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    fetchList()
  } finally {
    submitLoading.value = false
  }
}

function getStatusType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning', processing: 'primary', processed: 'success', cancelled: 'info'
  }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '待处理', processing: '处理中', processed: '已分割', cancelled: '已取消'
  }
  return map[status] || status
}

onMounted(() => {
  fetchSuppliers()
  fetchList()
})
</script>

<style scoped>
.purchase { }
.page-title { margin-bottom: 20px; font-size: 20px; font-weight: 600; color: #333; }
.search-card { margin-bottom: 15px; }
.toolbar { margin-bottom: 15px; }
.pagination { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
