/**
 * 处方管理API服务
 */
import { get, post, put } from '@/api/client'
import type { PaginatedResponse } from '@/@types'

// ApiResponse未使用，移除导入

/**
 * 处方信息接口
 */
export interface Prescription {
  id: string
  prescriptionNumber: string
  patientId: string
  patientName?: string
  doctorId: string
  doctorName?: string
  department: string
  diagnosis: string
  items: PrescriptionItem[]
  totalAmount: number
  status: PrescriptionStatus
  aiReview?: AIReviewResult
  approvedBy?: string
  approvedAt?: string
  dispensedBy?: string
  dispensedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * 处方项目
 */
export interface PrescriptionItem {
  medicineId: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  notes?: string
}

/**
 * 处方状态枚举
 */
export enum PrescriptionStatus {
  DRAFT = 'DRAFT',           // 草稿
  PENDING = 'PENDING',       // 待审核
  APPROVED = 'APPROVED',     // 已审核
  DISPENSED = 'DISPENSED',   // 已发药
  CANCELLED = 'CANCELLED',   // 已取消
}

/**
 * AI审查结果
 */
export interface AIReviewResult {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  warnings: string[]
  suggestions: string[]
  interactions: DrugInteraction[]
  contraindications: string[]
  dosageIssues: string[]
}

/**
 * 药物相互作用
 */
export interface DrugInteraction {
  drug1: string
  drug2: string
  severity: 'MILD' | 'MODERATE' | 'SEVERE'
  description: string
}

/**
 * 创建处方请求
 */
export interface CreatePrescriptionRequest {
  patientId: string
  diagnosis: string
  items: {
    medicineId: string
    dosage: string
    frequency: string
    duration: string
    quantity: number
    notes?: string
  }[]
  notes?: string
}

/**
 * 处方搜索参数
 */
export interface PrescriptionSearchParams {
  patientId?: string
  doctorId?: string
  department?: string
  status?: PrescriptionStatus
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/**
 * 处方统计信息
 */
export interface PrescriptionStatistics {
  totalCount: number
  pendingCount: number
  approvedCount: number
  dispensedCount: number
  totalAmount: number
}

/**
 * 创建处方
 */
export async function createPrescription(data: CreatePrescriptionRequest): Promise<Prescription> {
  const response = await post<Prescription>('/prescriptions', data)
  return response.data
}

/**
 * 获取处方列表
 */
export async function getPrescriptions(params?: PrescriptionSearchParams): Promise<PaginatedResponse<Prescription>> {
  const response = await get<PaginatedResponse<Prescription>>('/prescriptions', { params })
  return response.data
}

/**
 * 获取处方详情
 */
export async function getPrescriptionById(id: string): Promise<Prescription> {
  const response = await get<Prescription>(`/prescriptions/${id}`)
  return response.data
}

/**
 * 更新处方
 */
export async function updatePrescription(id: string, data: Partial<CreatePrescriptionRequest>): Promise<Prescription> {
  const response = await put<Prescription>(`/prescriptions/${id}`, data)
  return response.data
}

/**
 * 审批处方
 */
export async function approvePrescription(id: string): Promise<Prescription> {
  const response = await post<Prescription>(`/prescriptions/${id}/approve`)
  return response.data
}

/**
 * 发药
 */
export async function dispensePrescription(id: string): Promise<Prescription> {
  const response = await post<Prescription>(`/prescriptions/${id}/dispense`)
  return response.data
}

/**
 * 取消处方
 */
export async function cancelPrescription(id: string, reason?: string): Promise<Prescription> {
  const response = await post<Prescription>(`/prescriptions/${id}/cancel`, { reason })
  return response.data
}

/**
 * 获取患者处方历史
 */
export async function getPatientPrescriptions(patientId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<Prescription>> {
  const response = await get<PaginatedResponse<Prescription>>(`/prescriptions/patient/${patientId}`, {
    params: { page, pageSize }
  })
  return response.data
}

/**
 * 获取医生处方列表
 */
export async function getDoctorPrescriptions(doctorId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Prescription>> {
  const response = await get<PaginatedResponse<Prescription>>(`/prescriptions/doctor/${doctorId}`, {
    params: { page, pageSize }
  })
  return response.data
}

/**
 * 获取处方统计信息
 */
export async function getPrescriptionStatistics(params?: { startDate?: string; endDate?: string }): Promise<PrescriptionStatistics> {
  const response = await get<PrescriptionStatistics>('/prescriptions/statistics', { params })
  return response.data
}

/**
 * 获取处方打印数据
 */
export async function getPrescriptionPrintData(id: string): Promise<{
  prescription: Prescription
  qrCode: string
  barcode: string
}> {
  const response = await get(`/prescriptions/${id}/print`)
  return response.data
}

/**
 * AI用药审查 - 药物相互作用检查
 */
export async function checkDrugInteractions(medicineIds: string[]): Promise<{
  interactions: DrugInteraction[]
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  recommendations: string[]
}> {
  const response = await post('/ai-assistant/drug-interactions', { medicineIds })
  return response.data
}

/**
 * AI用药审查 - 禁忌症检查
 */
export async function checkContraindications(patientId: string, medicineIds: string[]): Promise<{
  contraindications: string[]
  warnings: string[]
  alternatives: { medicineId: string; reason: string }[]
}> {
  const response = await post('/ai-assistant/contraindications', { patientId, medicineIds })
  return response.data
}

/**
 * AI用药审查 - 剂量合理性检查
 */
export async function checkDosageReasonableness(patientId: string, items: {
  medicineId: string
  dosage: string
  frequency: string
  duration: string
}[]): Promise<{
  issues: { medicineId: string; issue: string; recommendation: string }[]
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
}> {
  const response = await post('/ai-assistant/dosage-check', { patientId, items })
  return response.data
}

/**
 * AI用药审查 - 处方智能审核
 */
export async function reviewPrescription(prescriptionId: string): Promise<AIReviewResult> {
  const response = await post<AIReviewResult>(`/ai-assistant/review-prescription/${prescriptionId}`)
  return response.data
}

/**
 * AI用药审查 - 替代药物建议
 */
export async function getAlternativeMedicines(medicineId: string, reason: string): Promise<{
  alternatives: {
    medicineId: string
    medicineName: string
    reason: string
    advantages: string[]
  }[]
}> {
  const response = await post('/ai-assistant/alternative-medicines', { medicineId, reason })
  return response.data
}
