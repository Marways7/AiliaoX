/**
 * 常量定义文件
 */

// API基础URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// 存储键名
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ailiaox_access_token',
  REFRESH_TOKEN: 'ailiaox_refresh_token',
  USER_INFO: 'ailiaox_user_info',
  THEME: 'ailiaox_theme',
  LANGUAGE: 'ailiaox_language',
} as const

// 用户角色
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  OPERATOR = 'OPERATOR',
  PATIENT = 'PATIENT',
}

// 用户角色标签
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理员',
  [UserRole.DOCTOR]: '医生',
  [UserRole.OPERATOR]: '操作员',
  [UserRole.PATIENT]: '患者',
}

// 性别
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

// 性别标签
export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: '男',
  [Gender.FEMALE]: '女',
  [Gender.OTHER]: '其他',
}

// 血型
export enum BloodType {
  A = 'A',
  B = 'B',
  AB = 'AB',
  O = 'O',
  UNKNOWN = 'UNKNOWN',
}

// 血型标签
export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  [BloodType.A]: 'A型',
  [BloodType.B]: 'B型',
  [BloodType.AB]: 'AB型',
  [BloodType.O]: 'O型',
  [BloodType.UNKNOWN]: '未知',
}

// 挂号时间段
export enum TimeSlot {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
}

// 时间段标签
export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  [TimeSlot.MORNING]: '上午',
  [TimeSlot.AFTERNOON]: '下午',
  [TimeSlot.EVENING]: '晚上',
}

// 排队优先级
export enum Priority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

// 优先级标签
export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.NORMAL]: '普通',
  [Priority.URGENT]: '紧急',
  [Priority.EMERGENCY]: '急诊',
}

// 优先级颜色
export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.NORMAL]: 'primary',
  [Priority.URGENT]: 'warning',
  [Priority.EMERGENCY]: 'error',
}

// 排队状态
export enum QueueStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

// 排队状态标签
export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  [QueueStatus.WAITING]: '等待中',
  [QueueStatus.CALLED]: '叫号中',
  [QueueStatus.IN_PROGRESS]: '就诊中',
  [QueueStatus.COMPLETED]: '已完成',
  [QueueStatus.SKIPPED]: '已跳过',
}

// 处方状态
export enum PrescriptionStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISPENSED = 'DISPENSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// 处方状态标签
export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  [PrescriptionStatus.DRAFT]: '草稿',
  [PrescriptionStatus.PENDING_REVIEW]: '待审核',
  [PrescriptionStatus.APPROVED]: '已审核',
  [PrescriptionStatus.REJECTED]: '已拒绝',
  [PrescriptionStatus.DISPENSED]: '已发药',
  [PrescriptionStatus.COMPLETED]: '已完成',
  [PrescriptionStatus.CANCELLED]: '已取消',
}

// 病历类型
export enum RecordType {
  OUTPATIENT = 'OUTPATIENT',
  INPATIENT = 'INPATIENT',
  EMERGENCY = 'EMERGENCY',
}

// 病历类型标签
export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  [RecordType.OUTPATIENT]: '门诊',
  [RecordType.INPATIENT]: '住院',
  [RecordType.EMERGENCY]: '急诊',
}

// 分页默认值
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const

// 日期格式
export const DATE_FORMATS = {
  DATE: 'yyyy-MM-dd',
  TIME: 'HH:mm:ss',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  DATETIME_SHORT: 'yyyy-MM-dd HH:mm',
  TIME_SHORT: 'HH:mm',
} as const

// 文件上传限制
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ACCEPTED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const

// 权限定义
export const PERMISSIONS = {
  // 用户管理
  USER_VIEW: 'USER_VIEW',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',

  // 患者管理
  PATIENT_VIEW: 'PATIENT_VIEW',
  PATIENT_CREATE: 'PATIENT_CREATE',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_DELETE: 'PATIENT_DELETE',

  // 挂号管理
  APPOINTMENT_VIEW: 'APPOINTMENT_VIEW',
  APPOINTMENT_CREATE: 'APPOINTMENT_CREATE',
  APPOINTMENT_CANCEL: 'APPOINTMENT_CANCEL',

  // 排队管理
  QUEUE_VIEW: 'QUEUE_VIEW',
  QUEUE_CALL: 'QUEUE_CALL',
  QUEUE_MANAGE: 'QUEUE_MANAGE',

  // 药物管理
  MEDICINE_VIEW: 'MEDICINE_VIEW',
  MEDICINE_CREATE: 'MEDICINE_CREATE',
  MEDICINE_UPDATE: 'MEDICINE_UPDATE',
  MEDICINE_DELETE: 'MEDICINE_DELETE',

  // 处方管理
  PRESCRIPTION_VIEW: 'PRESCRIPTION_VIEW',
  PRESCRIPTION_CREATE: 'PRESCRIPTION_CREATE',
  PRESCRIPTION_REVIEW: 'PRESCRIPTION_REVIEW',
  PRESCRIPTION_DISPENSE: 'PRESCRIPTION_DISPENSE',

  // 病历管理
  MEDICAL_RECORD_VIEW: 'MEDICAL_RECORD_VIEW',
  MEDICAL_RECORD_CREATE: 'MEDICAL_RECORD_CREATE',
  MEDICAL_RECORD_UPDATE: 'MEDICAL_RECORD_UPDATE',
  MEDICAL_RECORD_DELETE: 'MEDICAL_RECORD_DELETE',

  // AI助手
  AI_ASSISTANT_USE: 'AI_ASSISTANT_USE',

  // 统计报表
  STATISTICS_VIEW: 'STATISTICS_VIEW',

  // 系统设置
  SYSTEM_SETTINGS: 'SYSTEM_SETTINGS',
} as const

// WebSocket事件
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  QUEUE_UPDATE: 'queue:update',
  QUEUE_CALL: 'queue:call',
  NOTIFICATION: 'notification',
} as const
