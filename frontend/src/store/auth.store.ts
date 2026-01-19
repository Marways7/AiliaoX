/**
 * 认证状态管理 - Zustand Store
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/@types'
import { STORAGE_KEYS } from '@/utils/constants'
import * as authApi from '@/api/auth.api'

interface AuthState {
  // 状态
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (username: string, password: string) => Promise<void>
  register: (data: authApi.RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      isAuthenticated: !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      isLoading: false,
      error: null,

      // 登录
      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null })

          const response = await authApi.login({ username, password })

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.message || '登录失败，请重试',
            isLoading: false,
          })
          throw error
        }
      },

      // 注册
      register: async (data: authApi.RegisterRequest) => {
        try {
          set({ isLoading: true, error: null })

          await authApi.register(data)

          // 注册成功后自动登录
          await get().login(data.username, data.password)
        } catch (error: any) {
          set({
            error: error.response?.data?.message || '注册失败，请重试',
            isLoading: false,
          })
          throw error
        }
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          })
        }
      },

      // 刷新用户信息
      refreshUser: async () => {
        try {
          const user = await authApi.getCurrentUser()
          set({ user })
        } catch (error) {
          console.error('Failed to refresh user:', error)
          // 如果刷新失败，可能是token过期，执行登出
          await get().logout()
        }
      },

      // 清除错误
      clearError: () => {
        set({ error: null })
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
