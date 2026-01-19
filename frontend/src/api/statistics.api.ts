/**
 * 统计数据API - 里程碑7
 * Dashboard统计、患者统计、医生统计、科室统计、挂号统计、处方统计、病历统计
 */

import { get } from './client'

/**
 * 时间范围枚举
 */
export enum StatisticsTimeRange {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM'
}

/**
 * Dashboard综合统计数据
 */
export interface DashboardStatistics {
  patients: {
    total: number
    newToday: number
    newThisWeek: number
    newThisMonth: number
  }
  appointments: {
    total: number
    todayCount: number
    pendingCount: number
    completedCount: number
  }
  prescriptions: {
    total: number
    todayCount: number
    totalRevenue: number
    averageAmount: number
  }
  medicalRecords: {
    total: number
    todayCount: number
    withAICount: number
    finalizedCount: number
  }
  doctors: {
    total: number
    activeToday: number
  }
  queue: {
    waitingCount: number
    averageWaitTime: number
  }
}

/**
 * 患者统计数据
 */
export interface PatientStatistics {
  totalCount: number
  newThisMonth: number
  genderDistribution: { gender: string; count: number }[]
  ageDistribution: { ageGroup: string; count: number }[]
  bloodTypeDistribution: { bloodType: string; count: number }[]
  topDiseases: { disease: string; count: number }[]
}

/**
 * 医生统计数据
 */
export interface DoctorStatistics {
  totalCount: number
  byDepartment: { department: string; count: number }[]
  byTitle: { title: string; count: number }[]
  topPerformers: {
    doctorId: string
    doctorName: string
    appointmentCount: number
    prescriptionCount: number
    medicalRecordCount: number
  }[]
}

/**
 * 科室统计数据
 */
export interface DepartmentStatistics {
  totalCount: number
  appointmentsByDepartment: { department: string; count: number }[]
  revenueByDepartment: { department: string; revenue: number }[]
  averageWaitTime: { department: string; avgWaitMinutes: number }[]
}

/**
 * 挂号统计数据
 */
export interface AppointmentStatistics {
  totalCount: number
  todayCount: number
  completedCount: number
  cancelledCount: number
  byStatus: { status: string; count: number }[]
  byPriority: { priority: string; count: number }[]
  byTimeSlot: { timeSlot: string; count: number }[]
  dailyTrend: { date: string; count: number }[]
}

/**
 * 处方统计数据
 */
export interface PrescriptionStatistics {
  totalCount: number
  totalRevenue: number
  averageAmount: number
  byStatus: { status: string; count: number }[]
  topMedicines: { medicine: string; count: number; revenue: number }[]
  monthlyRevenueTrend: { month: string; revenue: number }[]
}

/**
 * 病历统计数据
 */
export interface MedicalRecordStatistics {
  totalCount: number
  byRecordType: { recordType: string; count: number }[]
  byDepartment: { department: string; count: number }[]
  withAISummaryCount: number
  finalizedCount: number
  averageRecordsPerPatient: number
}

/**
 * 统计查询参数
 */
export interface StatisticsQueryParams {
  timeRange?: StatisticsTimeRange
  startDate?: string
  endDate?: string
}

/**
 * 获取Dashboard综合统计数据
 */
export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  const response = await get<DashboardStatistics>('/statistics/dashboard')
  return response.data
}

/**
 * 获取患者统计数据
 */
export async function getPatientStatistics(params?: StatisticsQueryParams): Promise<PatientStatistics> {
  const response = await get<PatientStatistics>('/statistics/patients', { params })
  return response.data
}

/**
 * 获取医生统计数据
 */
export async function getDoctorStatistics(): Promise<DoctorStatistics> {
  const response = await get<DoctorStatistics>('/statistics/doctors')
  return response.data
}

/**
 * 获取科室统计数据
 */
export async function getDepartmentStatistics(): Promise<DepartmentStatistics> {
  const response = await get<DepartmentStatistics>('/statistics/departments')
  return response.data
}

/**
 * 获取挂号统计数据
 */
export async function getAppointmentStatistics(params?: StatisticsQueryParams): Promise<AppointmentStatistics> {
  const response = await get<AppointmentStatistics>('/statistics/appointments', { params })
  return response.data
}

/**
 * 获取处方统计数据
 */
export async function getPrescriptionStatistics(params?: StatisticsQueryParams): Promise<PrescriptionStatistics> {
  const response = await get<PrescriptionStatistics>('/statistics/prescriptions', { params })
  return response.data
}

/**
 * 获取病历统计数据
 */
export async function getMedicalRecordStatistics(params?: StatisticsQueryParams): Promise<MedicalRecordStatistics> {
  const response = await get<MedicalRecordStatistics>('/statistics/medical-records', { params })
  return response.data
}
