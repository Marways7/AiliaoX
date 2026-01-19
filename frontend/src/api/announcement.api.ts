/**
 * 系统公告管理API服务
 */
import { get, post, put, del } from '@/api/client'
import type { ApiResponse } from '@/api/client'

/**
 * 公告类型枚举
 */
export enum AnnouncementType {
  SYSTEM = 'SYSTEM',       // 系统公告
  IMPORTANT = 'IMPORTANT', // 重要公告
  GENERAL = 'GENERAL',     // 普通公告
}

/**
 * 公告优先级枚举
 */
export enum AnnouncementPriority {
  LOW = 'LOW',       // 低优先级
  MEDIUM = 'MEDIUM', // 中优先级
  HIGH = 'HIGH',     // 高优先级
}

/**
 * 公告状态枚举
 */
export enum AnnouncementStatus {
  DRAFT = 'DRAFT',         // 草稿
  PUBLISHED = 'PUBLISHED', // 已发布
  EXPIRED = 'EXPIRED',     // 已过期
  ARCHIVED = 'ARCHIVED',   // 已归档
}

/**
 * 公告信息接口
 */
export interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  priority: AnnouncementPriority
  status: AnnouncementStatus
  targetAudience?: string
  publishedAt?: string
  expiresAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  creator: {
    id: string
    name: string
    username: string
  }
}

/**
 * 公告搜索参数
 */
export interface AnnouncementSearchParams {
  status?: AnnouncementStatus
  type?: AnnouncementType
  priority?: AnnouncementPriority
  page?: number
  pageSize?: number
}

/**
 * 创建公告请求
 */
export interface CreateAnnouncementRequest {
  title: string
  content: string
  type: AnnouncementType
  priority: AnnouncementPriority
  targetAudience?: string
  expiresAt?: string
}

/**
 * 公告列表响应
 */
export interface AnnouncementListResponse {
  announcements: Announcement[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 获取公告列表
 */
export async function getAnnouncements(
  params?: AnnouncementSearchParams
): Promise<AnnouncementListResponse> {
  const response = await get<AnnouncementListResponse>('/announcements', { params })
  return response.data
}

/**
 * 获取公告详情
 */
export async function getAnnouncementById(id: string): Promise<Announcement> {
  const response = await get<Announcement>(`/announcements/${id}`)
  return response.data
}

/**
 * 获取有效公告（已发布且未过期）
 */
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const response = await get<Announcement[]>('/announcements/active')
  return response.data
}

/**
 * 创建公告
 */
export async function createAnnouncement(
  data: CreateAnnouncementRequest
): Promise<Announcement> {
  const response = await post<Announcement>('/announcements', data)
  return response.data
}

/**
 * 更新公告
 */
export async function updateAnnouncement(
  id: string,
  data: Partial<CreateAnnouncementRequest>
): Promise<Announcement> {
  const response = await put<Announcement>(`/announcements/${id}`, data)
  return response.data
}

/**
 * 删除公告
 */
export async function deleteAnnouncement(id: string): Promise<ApiResponse> {
  const response = await del(`/announcements/${id}`)
  return response
}

/**
 * 发布公告
 */
export async function publishAnnouncement(id: string): Promise<Announcement> {
  const response = await post<Announcement>(`/announcements/${id}/publish`)
  return response.data
}

/**
 * 归档公告
 */
export async function archiveAnnouncement(id: string): Promise<Announcement> {
  const response = await post<Announcement>(`/announcements/${id}/archive`)
  return response.data
}

/**
 * 标记公告为已读
 */
export async function markAnnouncementAsRead(id: string): Promise<ApiResponse> {
  const response = await post(`/announcements/${id}/read`)
  return response
}
