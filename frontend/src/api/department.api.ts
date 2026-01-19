/**
 * 科室管理API
 */
import { get } from '@/api/client'

export interface Department {
  id: string
  departmentNo: string
  name: string
  description: string | null
  location: string | null
  phone: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 获取所有科室列表
 */
export async function getDepartments(): Promise<Department[]> {
  const response = await get<Department[]>('/departments')
  return response.data
}

/**
 * 获取科室详情
 */
export async function getDepartmentById(id: string): Promise<Department> {
  const response = await get<Department>(`/departments/${id}`)
  return response.data
}
