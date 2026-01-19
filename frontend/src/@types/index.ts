/**
 * TypeScript类型定义
 */
import {
  UserRole,
  Gender,
  BloodType,
  TimeSlot,
  Priority,
  QueueStatus,
  PrescriptionStatus,
  RecordType,
} from '@/utils/constants'

/**
 * 医生信息类型
 */
export interface DoctorInfo {
  id: string
  doctorNo: string
  name: string
  department: {
    id: string
    name: string
  }
  title?: string
  specialization?: string
}

/**
 * 操作员信息类型
 */
export interface OperatorInfo {
  id: string
  operatorNo: string
  name: string
  department?: string
}

/**
 * 用户类型
 */
export interface User {
  id: string
  username: string
  email?: string
  role: UserRole
  name?: string
  phone?: string
  avatar?: string
  permissions?: string[] // 用户权限列表
  department?: string // 兼容字段，用于显示
  doctor?: DoctorInfo // 医生详细信息
  operator?: OperatorInfo // 操作员详细信息
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * 患者类型
 */
export interface Patient {
  id: string
  name: string
  gender: Gender
  birthDate: string
  phone: string
  idCard: string
  address?: string
  bloodType?: BloodType
  allergies?: string | string[]
  emergencyContact?: string
  emergencyPhone?: string
  medicalHistory?: string
  createdAt: string
  updatedAt: string
}

/**
 * 挂号类型
 */
export interface Appointment {
  id: string
  patientId: string
  patient?: Patient
  doctorId: string
  doctor?: User
  appointmentDate: string
  timeSlot: TimeSlot
  department: string
  symptoms?: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  queueNumber?: string
  createdAt: string
  updatedAt: string
}

/**
 * 排队类型
 */
export interface Queue {
  id: string
  appointmentId: string
  appointment?: Appointment
  patientId: string
  patient?: Patient
  doctorId: string
  doctor?: User
  queueNumber: string
  priority: Priority
  status: QueueStatus
  estimatedWaitTime?: number
  calledAt?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 药物类型
 */
export interface Medicine {
  id: string
  name: string
  genericName?: string
  manufacturer?: string
  specification?: string
  unit: string
  price: number
  stock: number
  category?: string
  indication?: string
  dosage?: string
  contraindication?: string
  sideEffects?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 处方项目类型
 */
export interface PrescriptionItem {
  id: string
  prescriptionId: string
  medicineId: string
  medicine?: Medicine
  quantity: number
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  createdAt: string
  updatedAt: string
}

/**
 * 处方类型
 */
export interface Prescription {
  id: string
  patientId: string
  patient?: Patient
  doctorId: string
  doctor?: User
  recordId?: string
  items: PrescriptionItem[]
  totalAmount: number
  status: PrescriptionStatus
  diagnosis?: string
  notes?: string
  reviewedBy?: string
  reviewedAt?: string
  dispensedBy?: string
  dispensedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 病历类型
 */
export interface MedicalRecord {
  id: string
  recordNumber: string
  patientId: string
  patient?: Patient
  doctorId: string
  doctor?: User
  appointmentId?: string
  recordType: RecordType
  chiefComplaint: string
  presentIllness?: string
  physicalExamination?: string
  diagnosis: string
  treatment?: string
  notes?: string
  attachments?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * AI对话消息类型
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

/**
 * AI诊断建议类型
 */
export interface DiagnosisSuggestion {
  diagnosis: string
  confidence: number
  reasoning: string
  recommendations: string[]
  relatedSymptoms?: string[]
  differentialDiagnosis?: string[]
}

/**
 * 统计数据类型
 */
export interface Statistics {
  totalPatients: number
  totalAppointments: number
  totalPrescriptions: number
  totalRevenue: number
  patientGrowth: number
  appointmentGrowth: number
  revenueGrowth: number
}

/**
 * 图表数据点类型
 */
export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

/**
 * 通知类型
 */
export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  link?: string
  createdAt: string
}

/**
 * 表单验证错误类型
 */
export interface FormErrors {
  [key: string]: string | undefined
}

/**
 * 分页参数类型
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 搜索参数类型
 */
export interface SearchParams extends PaginationParams {
  keyword?: string
  [key: string]: any
}

/**
 * 操作日志类型
 */
export interface AuditLog {
  id: string
  userId: string
  user?: User
  action: string
  resource: string
  resourceId: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
