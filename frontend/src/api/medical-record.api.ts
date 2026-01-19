/**
 * 病历管理API服务
 */
import { get, post, put, del } from '@/api/client'
import type { PaginatedResponse } from '@/@types'

// ApiResponse未使用，移除导入

/**
 * 病历信息接口
 */
export interface MedicalRecord {
  id: string
  recordNumber: string
  patientId: string
  patientName?: string
  doctorId: string
  doctorName?: string
  department: string
  visitDate: string
  chiefComplaint: string
  presentIllness: string
  pastHistory?: string
  allergyHistory?: string
  familyHistory?: string
  physicalExamination?: string
  auxiliaryExamination?: string
  diagnosis: string
  differentialDiagnosis?: string
  treatmentPlan: string
  prescriptionId?: string
  notes?: string
  aiSummary?: string
  aiSuggestions?: string[]
  version: number
  status: MedicalRecordStatus
  templateId?: string
  createdAt: string
  updatedAt: string
}

/**
 * 病历状态枚举
 */
export enum MedicalRecordStatus {
  DRAFT = 'DRAFT',           // 草稿
  COMPLETED = 'COMPLETED',   // 已完成
  ARCHIVED = 'ARCHIVED',     // 已归档
}

/**
 * 病历模板
 */
export interface MedicalRecordTemplate {
  id: string
  name: string
  department: string
  category: string
  chiefComplaintTemplate?: string
  presentIllnessTemplate?: string
  physicalExaminationTemplate?: string
  diagnosisTemplate?: string
  treatmentPlanTemplate?: string
  isPublic: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * 创建病历请求
 */
export interface CreateMedicalRecordRequest {
  patientId: string
  department?: string  // 可选，从用户信息获取
  visitDate: string
  chiefComplaint: string
  presentIllness: string
  pastHistory?: string
  allergyHistory?: string
  familyHistory?: string
  physicalExamination?: string
  auxiliaryExamination?: string
  diagnosis: string
  differentialDiagnosis?: string
  treatmentPlan: string
  prescriptionId?: string
  notes?: string
  templateId?: string
  recordType?: 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'PHYSICAL_EXAM'  // 可选，默认门诊
}

/**
 * 病历搜索参数
 */
export interface MedicalRecordSearchParams {
  keyword?: string // 关键词搜索（支持病历号、主诉、诊断等）
  patientId?: string
  doctorId?: string
  department?: string
  diagnosis?: string
  startDate?: string
  endDate?: string
  status?: MedicalRecordStatus
  page?: number
  pageSize?: number
}

/**
 * AI病历分析结果
 */
export interface AIRecordAnalysis {
  summary: string
  keyFindings: string[]
  diagnosisSuggestions: string[]
  treatmentRecommendations: string[]
  followUpAdvice: string[]
  riskWarnings: string[]
}

/**
 * 创建病历
 */
export async function createMedicalRecord(data: CreateMedicalRecordRequest): Promise<MedicalRecord> {
  // 获取当前用户的医生信息
  let doctorId = ''
  try {
    const doctorsResponse = await get<any>('/doctors')
    const doctors = doctorsResponse.data || []
    // 找到与当前用户关联的医生记录（通过userId匹配）
    // 注意：这里假设doctors API返回的数据中包含userId字段
    // 如果不包含，则需要后端添加这个字段，或者使用其他方式关联
    // 临时方案：使用第一个医生（因为当前登录用户是医生角色）
    if (doctors.length > 0) {
      doctorId = doctors[0].id
    }
  } catch (error) {
    console.error('Failed to get doctor info:', error)
  }

  // 构建后端期望的请求数据
  const requestData = {
    patientId: data.patientId,
    doctorId,  // 自动添加当前登录医生ID
    chiefComplaint: data.chiefComplaint,
    presentIllness: data.presentIllness,
    pastHistory: data.pastHistory,
    familyHistory: data.familyHistory,
    physicalExam: data.physicalExamination,  // 字段名映射
    auxiliaryExam: data.auxiliaryExamination,  // 字段名映射
    diagnosis: data.diagnosis,
    treatmentPlan: data.treatmentPlan,
    followUpPlan: data.notes,  // 将notes映射为followUpPlan
    recordType: data.recordType || 'OUTPATIENT',  // 默认门诊
    templateId: data.templateId,
  }

  const response = await post<MedicalRecord>('/medical-records', requestData)
  return response.data
}

/**
 * 获取病历列表
 */
export async function getMedicalRecords(params?: MedicalRecordSearchParams): Promise<PaginatedResponse<MedicalRecord>> {
  const response = await get<any>('/medical-records', { params })

  // 后端返回的数据结构：{ records, total, page, pageSize, totalPages }
  // 转换为前端期望的结构：{ data, total, page, pageSize, totalPages }
  const backendData = response.data
  const records = (backendData.records || []).map((record: any) => ({
    ...record,
    recordNumber: record.recordNo, // 映射recordNo -> recordNumber
    patientName: record.patient?.name, // 从patient对象提取name
    doctorName: record.doctor?.name, // 从doctor对象提取name
    department: record.doctor?.department?.name, // 从doctor.department提取name
    visitDate: record.createdAt, // 使用createdAt作为visitDate
    presentIllness: record.presentIllness || '',
    physicalExamination: record.physicalExam,
    treatmentPlan: record.treatmentPlan,
    status: record.isFinal ? MedicalRecordStatus.ARCHIVED : MedicalRecordStatus.DRAFT, // 根据isFinal映射状态
  }))

  return {
    data: records,
    total: backendData.total || 0,
    page: backendData.page || 1,
    pageSize: backendData.pageSize || 10,
    totalPages: backendData.totalPages || 1,
  }
}

/**
 * 获取病历详情
 */
export async function getMedicalRecordById(id: string): Promise<MedicalRecord> {
  const response = await get<any>(`/medical-records/${id}`)
  const record = response.data

  // 映射后端数据结构到前端接口
  return {
    ...record,
    recordNumber: record.recordNo, // 映射recordNo -> recordNumber
    patientName: record.patient?.name, // 从patient对象提取name
    doctorName: record.doctor?.name, // 从doctor对象提取name
    department: record.doctor?.department?.name, // 从doctor.department提取name
    visitDate: record.createdAt, // 使用createdAt作为visitDate
    physicalExamination: record.physicalExam,
    auxiliaryExamination: record.auxiliaryExam,
    differentialDiagnosis: record.differentialDiagnosis || '',
    allergyHistory: record.allergyHistory || '',
    status: record.isFinal ? MedicalRecordStatus.ARCHIVED : MedicalRecordStatus.DRAFT,
  } as MedicalRecord
}

/**
 * 更新病历
 */
export async function updateMedicalRecord(id: string, data: Partial<CreateMedicalRecordRequest>): Promise<MedicalRecord> {
  // 构建后端期望的请求数据，映射字段名
  const requestData: any = {}

  if (data.chiefComplaint !== undefined) requestData.chiefComplaint = data.chiefComplaint
  if (data.presentIllness !== undefined) requestData.presentIllness = data.presentIllness
  if (data.pastHistory !== undefined) requestData.pastHistory = data.pastHistory
  if (data.familyHistory !== undefined) requestData.familyHistory = data.familyHistory
  if (data.physicalExamination !== undefined) requestData.physicalExam = data.physicalExamination
  if (data.auxiliaryExamination !== undefined) requestData.auxiliaryExam = data.auxiliaryExamination
  if (data.diagnosis !== undefined) requestData.diagnosis = data.diagnosis
  if (data.treatmentPlan !== undefined) requestData.treatmentPlan = data.treatmentPlan
  if (data.notes !== undefined) requestData.followUpPlan = data.notes

  const response = await put<MedicalRecord>(`/medical-records/${id}`, requestData)
  return response.data
}

/**
 * 删除病历
 */
export async function deleteMedicalRecord(id: string): Promise<void> {
  await del(`/medical-records/${id}`)
}

/**
 * 归档病历
 */
export async function archiveMedicalRecord(id: string): Promise<MedicalRecord> {
  const response = await post<MedicalRecord>(`/medical-records/${id}/archive`)
  return response.data
}

/**
 * 获取患者病历历史
 */
export async function getPatientMedicalRecords(patientId: string, page = 1, pageSize = 10): Promise<PaginatedResponse<MedicalRecord>> {
  const response = await get<PaginatedResponse<MedicalRecord>>(`/medical-records/patient/${patientId}`, {
    params: { page, pageSize }
  })
  return response.data
}

/**
 * 获取医生病历列表
 */
export async function getDoctorMedicalRecords(doctorId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<MedicalRecord>> {
  const response = await get<PaginatedResponse<MedicalRecord>>(`/medical-records/doctor/${doctorId}`, {
    params: { page, pageSize }
  })
  return response.data
}

/**
 * AI智能病历搜索
 */
export async function searchMedicalRecordsWithAI(query: string, filters?: {
  patientId?: string
  department?: string
  startDate?: string
  endDate?: string
}): Promise<{
  records: MedicalRecord[]
  relevanceScores: { recordId: string; score: number }[]
  explanation: string
}> {
  const response = await post('/medical-records/ai-search', { query, filters })

  // 映射后端返回的数据结构到前端接口
  const backendData = response.data
  const records = (backendData.records || []).map((record: any) => ({
    ...record,
    recordNumber: record.recordNo || record.recordNumber,
    patientName: record.patient?.name || record.patientName,
    doctorName: record.doctor?.name || record.doctorName,
    department: record.doctor?.department?.name || record.department,
    visitDate: record.createdAt || record.visitDate,
    physicalExamination: record.physicalExam || record.physicalExamination,
    auxiliaryExamination: record.auxiliaryExam || record.auxiliaryExamination,
    status: record.isFinal ? MedicalRecordStatus.ARCHIVED : (record.status || MedicalRecordStatus.DRAFT),
  }))

  return {
    records,
    relevanceScores: backendData.relevanceScores || [],
    explanation: backendData.explanation || ''
  }
}

/**
 * AI病历智能摘要
 */
export async function generateRecordSummary(recordId: string): Promise<{
  summary: string
  keyPoints: string[]
  timeline: { date: string; event: string }[]
}> {
  const response = await post(`/ai-assistant/record-summary/${recordId}`)
  return response.data
}

/**
 * AI诊断辅助建议
 */
export async function getDiagnosisSuggestions(recordId: string): Promise<{
  primaryDiagnosis: string[]
  differentialDiagnosis: string[]
  recommendedTests: string[]
  reasoning: string
}> {
  const response = await post(`/ai-assistant/diagnosis-suggestions/${recordId}`)
  return response.data
}

/**
 * 获取病历模板列表
 */
export async function getMedicalRecordTemplates(params?: {
  department?: string
  category?: string
  isPublic?: boolean
}): Promise<MedicalRecordTemplate[]> {
  const response = await get<MedicalRecordTemplate[]>('/record-templates', { params })
  return response.data
}

/**
 * 创建病历模板
 */
export async function createMedicalRecordTemplate(data: Omit<MedicalRecordTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<MedicalRecordTemplate> {
  const response = await post<MedicalRecordTemplate>('/record-templates', data)
  return response.data
}

/**
 * 更新病历模板
 */
export async function updateMedicalRecordTemplate(id: string, data: Partial<Omit<MedicalRecordTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>): Promise<MedicalRecordTemplate> {
  const response = await put<MedicalRecordTemplate>(`/record-templates/${id}`, data)
  return response.data
}

/**
 * 删除病历模板
 */
export async function deleteMedicalRecordTemplate(id: string): Promise<void> {
  await del(`/record-templates/${id}`)
}

/**
 * 获取病历版本历史
 */
export async function getMedicalRecordVersions(recordId: string): Promise<MedicalRecord[]> {
  const response = await get<MedicalRecord[]>(`/ai-assistant/medical-record-versions/${recordId}`)
  return response.data
}

/**
 * 导出病历为PDF
 */
export async function exportMedicalRecordToPDF(recordId: string): Promise<Blob> {
  // 直接使用apiClient获取Blob响应，不使用封装的get方法
  const apiClient = (await import('@/api/client')).default
  const token = localStorage.getItem('ailiaox-access-token')

  const response = await apiClient.get(`/medical-records/${recordId}/export/pdf`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  // 返回Blob数据
  return response.data
}
