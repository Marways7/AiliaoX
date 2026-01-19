/**
 * 挂号管理API服务
 */
import { get, post, put, del } from '@/api/client'
import type { PaginatedResponse } from '@/@types'

/**
 * 挂号信息接口（匹配后端返回的嵌套结构）
 */
export interface Appointment {
  id: string
  appointmentNo: string  // 后端字段名
  patientId: string
  patient: {  // 后端返回嵌套对象
    id: string
    name: string
    phone?: string
    gender?: string
  }
  doctorId: string
  doctor: {  // 后端返回嵌套对象
    id: string
    name: string
    title?: string
    specialization?: string
  }
  departmentId: string
  department: {  // 后端返回嵌套对象
    id: string
    name: string
    departmentNo: string
  }
  appointmentDate: string
  timeSlot: TimeSlotDisplay
  status: AppointmentStatus
  queueNumber: number  // 后端返回number类型
  priority: AppointmentPriority
  symptoms?: string
  notes?: string
  cancelReason?: string
  createdAt: string
  updatedAt: string
}

/**
 * 前端展示用的时间段枚举（5个详细时间段）
 */
export enum TimeSlotDisplay {
  MORNING_EARLY = 'MORNING_EARLY',    // 早上 08:00-10:00
  MORNING_LATE = 'MORNING_LATE',      // 上午 10:00-12:00
  AFTERNOON_EARLY = 'AFTERNOON_EARLY', // 下午 14:00-16:00
  AFTERNOON_LATE = 'AFTERNOON_LATE',   // 傍晚 16:00-18:00
  EVENING = 'EVENING',                 // 晚上 18:00-20:00
}

/**
 * 后端API的时间段枚举（3个基本时间段）
 */
export enum TimeSlotBackend {
  MORNING = 'MORNING',       // 上午
  AFTERNOON = 'AFTERNOON',   // 下午
  EVENING = 'EVENING',       // 晚上
}

/**
 * 将前端展示的时间段映射到后端API的时间段
 */
export function mapTimeSlotToBackend(displaySlot: TimeSlotDisplay): TimeSlotBackend {
  const mapping: Record<TimeSlotDisplay, TimeSlotBackend> = {
    [TimeSlotDisplay.MORNING_EARLY]: TimeSlotBackend.MORNING,
    [TimeSlotDisplay.MORNING_LATE]: TimeSlotBackend.MORNING,
    [TimeSlotDisplay.AFTERNOON_EARLY]: TimeSlotBackend.AFTERNOON,
    [TimeSlotDisplay.AFTERNOON_LATE]: TimeSlotBackend.AFTERNOON,
    [TimeSlotDisplay.EVENING]: TimeSlotBackend.EVENING,
  }
  return mapping[displaySlot]
}

// 向后兼容的别名（UI使用Display版本）
export const TimeSlot = TimeSlotDisplay
export type TimeSlot = TimeSlotDisplay

/**
 * 挂号状态枚举
 */
export enum AppointmentStatus {
  PENDING = 'PENDING',     // 待就诊
  CONFIRMED = 'CONFIRMED', // 已确认
  COMPLETED = 'COMPLETED', // 已完成
  CANCELLED = 'CANCELLED', // 已取消
  MISSED = 'MISSED',       // 未到诊
}

/**
 * 挂号优先级枚举
 */
export enum AppointmentPriority {
  NORMAL = 'NORMAL',     // 普通
  URGENT = 'URGENT',     // 紧急
  EMERGENCY = 'EMERGENCY', // 急诊
}

/**
 * 创建挂号请求（发送到后端）
 */
export interface CreateAppointmentRequest {
  patientId: string
  doctorId: string
  departmentId: string  // 后端需要 departmentId (UUID) 而非 department 名称
  appointmentDate: string
  timeSlot: TimeSlotBackend  // 后端需要3个时间段枚举值
  priority?: AppointmentPriority
  symptoms?: string
  notes?: string
}

/**
 * 更新挂号请求
 */
export interface UpdateAppointmentRequest {
  timeSlot?: TimeSlotDisplay
  priority?: AppointmentPriority
  notes?: string
}

/**
 * 挂号搜索参数
 */
export interface AppointmentSearchParams {
  patientId?: string
  doctorId?: string
  departmentId?: string  // 改为departmentId，匹配后端
  status?: AppointmentStatus
  dateFrom?: string  // 改为dateFrom，匹配后端
  dateTo?: string    // 改为dateTo，匹配后端
  page?: number
  limit?: number     // 改为limit，匹配后端
}

/**
 * 挂号统计信息
 */
export interface AppointmentStatistics {
  totalCount: number
  pendingCount: number
  completedCount: number
  cancelledCount: number
  departmentStats: {
    department: string
    count: number
  }[]
}

/**
 * 创建挂号
 */
export async function createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
  const response = await post<Appointment>('/appointments', data)
  return response.data
}

/**
 * 获取挂号列表
 */
export async function getAppointments(params?: AppointmentSearchParams): Promise<PaginatedResponse<Appointment>> {
  const response = await get<{ appointments: Appointment[], total: number, page: number, limit: number, totalPages: number }>('/appointments', { params })
  // 转换后端返回格式为前端期望的PaginatedResponse格式
  return {
    data: response.data.appointments,
    total: response.data.total,
    page: response.data.page,
    pageSize: response.data.limit,
    totalPages: response.data.totalPages
  }
}

/**
 * 获取挂号详情
 */
export async function getAppointmentById(id: string): Promise<Appointment> {
  const response = await get<Appointment>(`/appointments/${id}`)
  return response.data
}

/**
 * 更新挂号信息
 */
export async function updateAppointment(id: string, data: UpdateAppointmentRequest): Promise<Appointment> {
  const response = await put<Appointment>(`/appointments/${id}`, data)
  return response.data
}

/**
 * 取消挂号
 */
export async function cancelAppointment(id: string, _reason?: string): Promise<void> {
  await del(`/appointments/${id}`)
}

/**
 * 确认挂号
 */
export async function confirmAppointment(id: string): Promise<Appointment> {
  const response = await post<Appointment>(`/appointments/${id}/confirm`)
  return response.data
}

/**
 * 完成挂号
 */
export async function completeAppointment(id: string): Promise<Appointment> {
  const response = await post<Appointment>(`/appointments/${id}/complete`)
  return response.data
}

/**
 * 获取患者挂号历史
 */
export async function getPatientAppointments(patientId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Appointment>> {
  const response = await get<PaginatedResponse<Appointment>>(`/appointments/patient/${patientId}`, {
    params: { page, pageSize }
  })
  return response.data
}

/**
 * 获取医生挂号列表
 */
export async function getDoctorAppointments(doctorId: string, date?: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Appointment>> {
  const response = await get<PaginatedResponse<Appointment>>(`/appointments/doctor/${doctorId}`, {
    params: { date, page, pageSize }
  })
  return response.data
}

/**
 * 获取挂号统计信息
 */
export async function getAppointmentStatistics(params?: { startDate?: string; endDate?: string; department?: string }): Promise<AppointmentStatistics> {
  const response = await get<AppointmentStatistics>('/appointments/statistics', { params })
  return response.data
}
