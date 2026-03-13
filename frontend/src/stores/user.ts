import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/request'

interface User {
  id: number
  username: string
  role: string
  realName: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User>(JSON.parse(localStorage.getItem('user') || '{}'))
  const menus = ref<any[]>([])

  const isLoggedIn = computed(() => !!token.value)

  async function login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password })
    if (res.success) {
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      // 获取菜单
      await fetchMenus()
      return true
    }
    return false
  }

  async function fetchMenus() {
    const res = await api.get('/auth/menus')
    if (res.success) {
      menus.value = res.data
    }
  }

  function logout() {
    token.value = ''
    user.value = {} as User
    menus.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    token,
    user,
    menus,
    isLoggedIn,
    login,
    logout,
    fetchMenus
  }
})
