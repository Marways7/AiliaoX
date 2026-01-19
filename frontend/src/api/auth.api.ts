/**
 * 认证相关API服务
 */
import { get, post } from '@/api/client'
import type { User } from '@/@types'
import { STORAGE_KEYS } from '@/utils/constants'

/**
 * 登录请求参数
 */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * 登录响应数据
 */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

/**
 * 注册请求参数
 */
export interface RegisterRequest {
  username: string
  email: string
  password: string
  name?: string
  phone?: string
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/auth/login', data)

  // 保存token到localStorage
  if (response.success && response.data) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken)
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(response.data.user))
  }

  return response.data
}

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<User> {
  const response = await post<User>('/auth/register', data)
  return response.data
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  try {
    await post('/auth/logout')
  } finally {
    // 清除本地存储
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_INFO)
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User> {
  const response = await get<User>('/auth/me')

  // 更新本地存储的用户信息
  if (response.success && response.data) {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(response.data))
  }

  return response.data
}

/**
 * 刷新访问令牌
 */
export async function refreshAccessToken(): Promise<{ accessToken: string }> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)

  const response = await post<{ accessToken: string }>('/auth/refresh', {
    refreshToken,
  })

  // 更新访问令牌
  if (response.success && response.data) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken)
  }

  return response.data
}

/**
 * 修改密码
 */
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await post('/auth/change-password', data)
}

/**
 * 重置密码（忘记密码）
 */
export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await post('/auth/reset-password', data)
}

/**
 * 发送密码重置验证码
 */
export async function sendResetCode(email: string): Promise<void> {
  await post('/auth/send-reset-code', { email })
}
