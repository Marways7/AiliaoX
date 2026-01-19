/**
 * 患者相关API服务
 */
import { get, post, put, del } from '@/api/client'
import type { Patient, PaginatedResponse, SearchParams } from '@/@types'

// 重新导出Patient类型供其他模块使用
export type { Patient }

/**
 * 获取患者列表（分页）
 */
export async function getPatients(params?: SearchParams): Promise<PaginatedResponse<Patient>> {
  const response = await get<any>('/patients', { params })
  // 后端返回格式: { patients, total, page, limit, totalPages }
  // 转换为前端期望格式: { data, total, page, pageSize, totalPages }
  return {
    data: response.data.patients,
    total: response.data.total,
    page: response.data.page,
    pageSize: response.data.limit,
    totalPages: response.data.totalPages
  }
}

/**
 * 获取患者详情
 */
export async function getPatientById(id: string): Promise<Patient> {
  const response = await get<Patient>(`/patients/${id}`)
  return response.data
}

/**
 * 创建患者
 */
export interface CreatePatientRequest {
  name: string
  gender: string
  birthDate: string
  phone: string
  idCard: string
  address?: string
  bloodType?: string
  allergies?: string  // 修改为string类型，与后端一致
  emergencyContact?: string
  emergencyPhone?: string
  medicalHistory?: string
}

export async function createPatient(data: CreatePatientRequest): Promise<Patient> {
  const response = await post<Patient>('/patients', data)
  return response.data
}

/**
 * 更新患者信息
 */
export async function updatePatient(id: string, data: Partial<CreatePatientRequest>): Promise<Patient> {
  const response = await put<Patient>(`/patients/${id}`, data)
  return response.data
}

/**
 * 删除患者
 */
export async function deletePatient(id: string): Promise<void> {
  await del(`/patients/${id}`)
}

/**
 * 搜索患者
 */
export async function searchPatients(keyword: string): Promise<Patient[]> {
  const response = await get<Patient[]>('/patients/search', {
    params: { keyword },
  })
  return response.data
}
