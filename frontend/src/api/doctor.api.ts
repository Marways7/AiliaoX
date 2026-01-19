/**
 * 医生管理API
 */
import { get } from '@/api/client'

export interface Doctor {
  id: string
  doctorNo: string
  name: string
  departmentId: string
  title: string | null
  specialization: string | null
  qualification: string | null
  yearsOfExperience: number | null
  consultationFee: number | null
  department: {
    id: string
    name: string
    departmentNo: string
  }
}

/**
 * 获取医生列表（可选按科室筛选）
 */
export async function getDoctors(departmentId?: string): Promise<Doctor[]> {
  const params = departmentId ? { departmentId } : {}
  const response = await get<Doctor[]>('/doctors', { params })
  return response.data
}

/**
 * 获取医生详情
 */
export async function getDoctorById(id: string): Promise<Doctor> {
  const response = await get<Doctor>(`/doctors/${id}`)
  return response.data
}
