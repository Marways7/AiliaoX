/**
 * AI助手相关API服务
 */
import { post } from '@/api/client'
import type { DiagnosisSuggestion } from '@/@types'

/**
 * AI聊天请求
 */
export interface AIChatRequest {
  message: string
  context?: {
    patientId?: string
    symptoms?: string
    history?: string
  }
}

/**
 * AI聊天响应
 */
export interface AIChatResponse {
  message: string
  suggestions?: string[]
  followUpQuestions?: string[]
}

/**
 * 发送AI聊天消息
 */
export async function sendAIChat(data: AIChatRequest): Promise<AIChatResponse> {
  const response = await post<AIChatResponse>('/ai/chat', data)
  return response.data
}

/**
 * AI问诊分析
 */
export interface AIConsultationRequest {
  patientId: string
  symptoms: string
  duration?: string
  severity?: string
  additionalInfo?: string
}

export async function getAIConsultation(data: AIConsultationRequest): Promise<DiagnosisSuggestion> {
  const response = await post<DiagnosisSuggestion>('/ai/consultation', data)
  return response.data
}

/**
 * AI症状分析
 */
export async function analyzeSymptoms(symptoms: string): Promise<{
  possibleDiseases: string[]
  recommendations: string[]
  urgencyLevel: 'low' | 'medium' | 'high'
}> {
  const response = await post('/ai/analyze-symptoms', { symptoms })
  return response.data
}

/**
 * 获取AI建议的检查项目
 */
export async function getRecommendedTests(symptoms: string): Promise<{
  tests: string[]
  reasons: string[]
}> {
  const response = await post('/ai/recommend-tests', { symptoms })
  return response.data
}
