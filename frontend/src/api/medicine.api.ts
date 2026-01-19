/**
 * 药物管理API服务
 */
import { get, post, put, del } from '@/api/client'
import type { PaginatedResponse } from '@/@types'

/**
 * 药品分类接口 (从后端返回)
 */
export interface MedicineCategory {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * 药物信息接口
 */
export interface Medicine {
  id: string
  medicineNo: string
  name: string
  genericName?: string
  category: MedicineCategory  // 后端返回的是完整的category对象
  categoryId: string
  specification: string
  manufacturer?: string
  unit: string
  price: number  // 后端使用price
  description?: string
  sideEffects?: string
  contraindications?: string
  createdAt: string
  updatedAt: string
  stocks?: Array<{
    id: string
    quantity: number
    minStock: number
    maxStock: number
    expiryDate?: string
  }>
}

/**
 * 创建药物请求 - 严格匹配后端validation schema
 */
export interface CreateMedicineRequest {
  name: string
  genericName?: string
  categoryId: string  // 后端期望UUID，不是枚举
  specification: string
  unit: string
  manufacturer?: string
  price: number  // 后端使用price，不是unitPrice
  description?: string
  sideEffects?: string
  contraindications?: string
}

/**
 * 药物搜索参数 - 匹配后端接口
 */
export interface MedicineSearchParams {
  name?: string
  categoryId?: string
  manufacturer?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  pageSize?: number
}

/**
 * 药物统计信息
 */
export interface MedicineStatistics {
  total: number
  categoryStats: {
    categoryId: string
    categoryName: string
    count: number
  }[]
  alerts?: {
    lowStock: number
    expired: number
  }
}

/**
 * 获取药品分类列表
 */
export async function getMedicineCategories(): Promise<MedicineCategory[]> {
  const response = await get<MedicineCategory[]>('/medicines/categories')
  return response.data
}

/**
 * 创建药物
 */
export async function createMedicine(data: CreateMedicineRequest): Promise<Medicine> {
  const response = await post<Medicine>('/medicines', data)
  return response.data
}

/**
 * 获取药物列表
 */
export async function getMedicines(params?: MedicineSearchParams): Promise<PaginatedResponse<Medicine>> {
  const response = await get<any>('/medicines', { params })
  // 后端返回格式: {success: true, data: {data: Medicine[], pagination: {...}}}
  // 需要转换为前端期望的格式: {data: Medicine[], total, page, pageSize, totalPages}
  return {
    data: response.data.data,
    total: response.data.pagination.total,
    page: response.data.pagination.page,
    pageSize: response.data.pagination.pageSize,
    totalPages: response.data.pagination.totalPages
  }
}

/**
 * 获取药物详情
 */
export async function getMedicineById(id: string): Promise<Medicine> {
  const response = await get<Medicine>(`/medicines/${id}`)
  return response.data
}

/**
 * 更新药物信息
 */
export async function updateMedicine(id: string, data: Partial<CreateMedicineRequest>): Promise<Medicine> {
  const response = await put<Medicine>(`/medicines/${id}`, data)
  return response.data
}

/**
 * 删除药物
 */
export async function deleteMedicine(id: string): Promise<void> {
  await del(`/medicines/${id}`)
}

/**
 * 快速搜索药物
 */
export async function searchMedicines(keyword: string, limit = 10): Promise<Medicine[]> {
  const response = await get<Medicine[]>('/medicines/search/quick', {
    params: { keyword, limit }
  })
  return response.data
}

/**
 * 获取药品库存信息
 */
export async function getMedicineStock(id: string): Promise<any> {
  const response = await get(`/medicines/${id}/stock`)
  return response.data
}

/**
 * 获取药物统计信息
 */
export async function getMedicineStatistics(): Promise<MedicineStatistics> {
  const response = await get<MedicineStatistics>('/medicines/statistics/overview')
  return response.data
}
