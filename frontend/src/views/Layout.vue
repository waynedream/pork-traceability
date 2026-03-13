<template>
  <el-container class="layout-container">
    <el-aside width="220px">
      <div class="logo">
        <span>🐷 猪肉溯源</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        :unique-opened="true"
        class="menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        
        <el-sub-menu index="/purchase" v-if="hasMenu('purchase')">
          <template #title>
            <el-icon><ShoppingCart /></el-icon>
            <span>进货管理</span>
          </template>
          <el-menu-item index="/purchase">进货入库</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/cut" v-if="hasMenu('cut')">
          <el-icon><Cut /></el-icon>
          <span>分割管理</span>
        </el-menu-item>

        <el-menu-item index="/inventory" v-if="hasMenu('inventory')">
          <el-icon><Box /></el-icon>
          <span>库存管理</span>
        </el-menu-item>

        <el-menu-item index="/orders" v-if="hasMenu('orders')">
          <el-icon><Document /></el-icon>
          <span>订单管理</span>
        </el-menu-item>

        <el-menu-item index="/delivery" v-if="hasMenu('delivery')">
          <el-icon><Van /></el-icon>
          <span>配送管理</span>
        </el-menu-item>

        <el-menu-item index="/payment" v-if="hasMenu('payment')">
          <el-icon><Money /></el-icon>
          <span>回款管理</span>
        </el-menu-item>

        <el-menu-item index="/traceability">
          <el-icon><Search /></el-icon>
          <span>溯源查询</span>
        </el-menu-item>

        <el-sub-menu index="/settings" v-if="hasMenu('settings')">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item index="/suppliers">供应商管理</el-menu-item>
          <el-menu-item index="/users">用户管理</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header>
        <div class="header-right">
          <span class="username">{{ userStore.user.realName || userStore.user.username }}</span>
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-icon><User /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

function hasMenu(path: string) {
  // 简单权限判断 - 实际应该根据用户角色和菜单配置
  const role = userStore.user.role
  const roleMenus: Record<string, string[]> = {
    super_admin: ['purchase', 'cut', 'inventory', 'orders', 'delivery', 'payment', 'settings'],
    purchaser: ['purchase', 'inventory'],
    processor: ['cut'],
    sales: ['orders', 'delivery'],
    finance: ['payment']
  }
  return roleMenus[role]?.includes(path) || role === 'super_admin'
}

function handleCommand(command: string) {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.el-aside {
  background: #304156;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.menu {
  border-right: none;
  background: #304156;
}

.menu .el-menu-item,
.menu .el-sub-menu__title {
  color: #bfcbd9;
}

.menu .el-menu-item:hover,
.menu .el-sub-menu__title:hover {
  background: #263445;
}

.menu .el-menu-item.is-active {
  background: #409eff !important;
  color: white;
}

.el-header {
  background: white;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0,21,41,0.08);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  color: #666;
}

.user-dropdown {
  cursor: pointer;
  padding: 5px;
}

.el-main {
  background: #f0f2f5;
  padding: 20px;
}
</style>
