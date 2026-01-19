/**
 * 排队管理API服务
 */
import { get, post, put, del } from '@/api/client'
import type { PaginatedResponse } from '@/@types'

/**
 * 排队信息接口
 */
export interface QueueItem {
  id: string
  queueNumber: string
  appointmentId: string
  patientId: string
  patientName?: string
  department: string
  doctorId: string
  doctorName?: string
  status: QueueStatus
  priority: QueuePriority
  queuePosition?: number
  estimatedWaitTime?: number
  calledAt?: string
  completedAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 排队状态枚举
 */
export enum QueueStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

/**
 * 排队优先级枚举
 */
export enum QueuePriority {
  NORMAL = 'NORMAL',     // 普通
  URGENT = 'URGENT',     // 紧急
  EMERGENCY = 'EMERGENCY', // 急诊
}

/**
 * 创建排队请求
 */
export interface CreateQueueRequest {
  appointmentId: string
  priority?: QueuePriority
}

/**
 * 排队搜索参数
 */
export interface QueueSearchParams {
  department?: string
  doctorId?: string
  status?: QueueStatus
  date?: string
  page?: number
  pageSize?: number
}

/**
 * 排队统计信息
 */
export interface QueueStatistics {
  totalWaiting: number
  totalProcessing: number
  totalCompleted: number
  averageWaitTime: number
  departmentStats: {
    department: string
    waiting: number
    processing: number
    completed: number
    avgWaitTime: number
  }[]
}

/**
 * 创建排队
 */
export async function createQueue(data: CreateQueueRequest): Promise<QueueItem> {
  const response = await post<any>('/queue', data)
  return transformQueueItem(response.data)
}

/**
 * 获取排队列表
 */
export async function getQueueList(params?: QueueSearchParams): Promise<PaginatedResponse<QueueItem>> {
  const response = await get<PaginatedResponse<any>>('/queue', { params })
  const paginated = response.data
  return {
    ...paginated,
    data: paginated.data?.map(transformQueueItem) ?? [],
  }
}

/**
 * 获取排队详情
 */
export async function getQueueById(id: string): Promise<QueueItem> {
  const response = await get<any>(`/queue/${id}`)
  return transformQueueItem(response.data)
}

/**
 * 叫号（医生端）
 */
export async function callNext(doctorId: string): Promise<QueueItem | null> {
  const response = await post<any>('/queue/call-next', { doctorId })
  if (!response.data) return null
  return transformQueueItem(response.data)
}

/**
 * 完成就诊
 */
export async function completeQueue(id: string): Promise<QueueItem> {
  const response = await put<any>(`/queue/${id}/complete`)
  return transformQueueItem(response.data)
}

/**
 * 取消排队
 */
export async function cancelQueue(id: string, _reason?: string): Promise<QueueItem> {
  const response = await del<any>(`/queue/${id}`)
  return transformQueueItem(response.data)
}

/**
 * 获取科室排队列表
 */
export async function getDepartmentQueue(department: string): Promise<QueueItem[]> {
  const response = await get<any[]>(`/queue/department/${department}`)
  return response.data?.map(transformQueueItem) ?? []
}

/**
 * 获取医生排队列表
 */
export async function getDoctorQueue(doctorId: string): Promise<QueueItem[]> {
  const response = await get<any[]>(`/queue/doctor/${doctorId}`)
  return response.data?.map(transformQueueItem) ?? []
}

/**
 * 查询患者排队位置
 */
export async function getPatientQueuePosition(appointmentId: string): Promise<{
  queueItem: QueueItem
  position: number
  estimatedWaitTime: number
  waitingAhead: number
}> {
  const response = await get<any>(`/queue/position/${appointmentId}`)
  return {
    ...response.data,
    queueItem: transformQueueItem(response.data.queueItem),
  }
}

/**
 * 获取排队统计信息
 */
export async function getQueueStatistics(params?: { department?: string; date?: string }): Promise<QueueStatistics> {
  const response = await get<QueueStatistics>('/queue/statistics', { params })
  return response.data
}

const transformQueueItem = (queue: any): QueueItem => {
  if (!queue) {
    return queue
  }

  const appointment = queue.appointment ?? {}
  const patient = queue.patient ?? appointment.patient ?? {}
  const doctor = queue.doctor ?? appointment.doctor ?? {}
  const doctorUser = doctor.user ?? appointment.doctor?.user ?? {}
  const department = queue.department ?? appointment.department ?? {}

  const resolvedDepartment =
    typeof queue.department === 'string'
      ? queue.department
      : department?.name ?? ''
  const resolvedDoctorId =
    queue.doctorId ??
    (typeof doctor === 'string' ? doctor : doctor?.id) ??
    appointment.doctorId ??
    ''
  const resolvedDoctorName =
    queue.doctorName ??
    (typeof doctor === 'string' ? doctor : doctor?.name) ??
    doctorUser?.name ??
    doctorUser?.username ??
    ''

  return {
    id: queue.id,
    queueNumber: String(queue.queueNumber ?? appointment.queueNumber ?? ''),
    appointmentId: queue.appointmentId ?? appointment.id ?? '',
    patientId: queue.patientId ?? patient.id ?? '',
    patientName: queue.patientName ?? patient.name,
    department: resolvedDepartment,
    doctorId: resolvedDoctorId,
    doctorName: resolvedDoctorName,
    status: (queue.status ?? QueueStatus.WAITING) as QueueStatus,
    priority: (queue.priority ?? appointment.priority ?? QueuePriority.NORMAL) as QueuePriority,
    queuePosition: queue.queuePosition ?? queue.position ?? undefined,
    estimatedWaitTime:
      queue.estimatedWaitTime ??
      queue.estimatedTime ??
      queue.estimated_wait_time ??
      undefined,
    calledAt: queue.calledAt ?? appointment.calledAt ?? undefined,
    completedAt: queue.completedAt ?? queue.actualTime ?? appointment.completedAt ?? undefined,
    cancelledAt: queue.cancelledAt ?? undefined,
    createdAt: queue.createdAt,
    updatedAt: queue.updatedAt,
  }
}
