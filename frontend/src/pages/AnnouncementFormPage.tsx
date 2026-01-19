/**
 * 系统公告创建/编辑表单页面
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Loading } from '@/components/ui/Loading'
import {
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  AnnouncementType,
  AnnouncementPriority,
  type CreateAnnouncementRequest,
} from '@/api/announcement.api'
import { ArrowLeft, Save, Send } from 'lucide-react'

// 表单验证schema
const announcementSchema = z.object({
  title: z
    .string()
    .min(2, '标题至少2个字符')
    .max(200, '标题不能超过200个字符'),
  content: z
    .string()
    .min(10, '内容至少10个字符')
    .max(10000, '内容不能超过10000个字符'),
  type: z.nativeEnum(AnnouncementType, {
    required_error: '请选择公告类型',
  }),
  priority: z.nativeEnum(AnnouncementPriority, {
    required_error: '请选择优先级',
  }),
  targetAudience: z.string().optional(),
  expiresAt: z.string().optional(),
})

type AnnouncementFormData = z.infer<typeof announcementSchema>

export function AnnouncementFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditMode = !!id

  // 获取公告详情（编辑模式）
  const { data: announcement, isLoading } = useQuery({
    queryKey: ['announcement', id],
    queryFn: () => getAnnouncementById(id!),
    enabled: isEditMode,
  })

  // 表单处理
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      type: AnnouncementType.GENERAL,
      priority: AnnouncementPriority.MEDIUM,
    },
  })

  // 编辑模式：加载数据
  useEffect(() => {
    if (announcement) {
      reset({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        targetAudience: announcement.targetAudience || '',
        expiresAt: announcement.expiresAt
          ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
          : '',
      })
    }
  }, [announcement, reset])

  // 保存草稿
  const onSaveDraft = async (data: AnnouncementFormData) => {
    try {
      const requestData: CreateAnnouncementRequest = {
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        targetAudience: data.targetAudience || undefined,
        expiresAt: data.expiresAt || undefined,
      }

      if (isEditMode && id) {
        await updateAnnouncement(id, requestData)
        toast.success('更新成功')
      } else {
        await createAnnouncement(requestData)
        toast.success('保存成功')
      }

      navigate('/announcements')
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败')
    }
  }

  // 发布
  const onPublish = async (data: AnnouncementFormData) => {
    if (!confirm('确认发布这条公告吗？发布后将对所有用户可见。')) {
      return
    }

    try {
      const requestData: CreateAnnouncementRequest = {
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        targetAudience: data.targetAudience || undefined,
        expiresAt: data.expiresAt || undefined,
      }

      let announcementId = id

      if (isEditMode && id) {
        await updateAnnouncement(id, requestData)
      } else {
        const newAnnouncement = await createAnnouncement(requestData)
        announcementId = newAnnouncement.id
      }

      if (announcementId) {
        await publishAnnouncement(announcementId)
        toast.success('发布成功')
        navigate('/announcements')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '发布失败')
    }
  }

  if (isEditMode && isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载公告数据..." />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button onClick={() => navigate('/announcements')} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>

        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gradient">
            {isEditMode ? '编辑公告' : '新建公告'}
          </h1>
          <p className="text-text-secondary mt-2">
            {isEditMode ? '修改公告信息' : '创建新的系统公告'}
          </p>
        </div>

        {/* 表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="card-neon p-6">
            <form className="space-y-6">
              {/* 标题 */}
              <Input
                label="标题"
                placeholder="请输入公告标题（2-200字符）"
                error={errors.title?.message}
                required
                fullWidth
                {...register('title')}
              />

              {/* 内容 */}
              <Textarea
                label="内容"
                placeholder="请输入公告内容（10-10000字符）"
                error={errors.content?.message}
                required
                fullWidth
                rows={10}
                maxLength={10000}
                showCount
                {...register('content')}
              />

              {/* 类型和优先级 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    类型 <span className="text-error-500">*</span>
                  </label>
                  <NativeSelect
                    {...register('type')}
                    className="w-full"
                  >
                    <option value={AnnouncementType.GENERAL}>普通公告</option>
                    <option value={AnnouncementType.IMPORTANT}>重要公告</option>
                    <option value={AnnouncementType.SYSTEM}>系统公告</option>
                  </NativeSelect>
                  {errors.type && (
                    <p className="text-sm text-error-400 mt-1">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    优先级 <span className="text-error-500">*</span>
                  </label>
                  <NativeSelect
                    {...register('priority')}
                    className="w-full"
                  >
                    <option value={AnnouncementPriority.LOW}>低</option>
                    <option value={AnnouncementPriority.MEDIUM}>中</option>
                    <option value={AnnouncementPriority.HIGH}>高</option>
                  </NativeSelect>
                  {errors.priority && (
                    <p className="text-sm text-error-400 mt-1">{errors.priority.message}</p>
                  )}
                </div>
              </div>

              {/* 目标受众 */}
              <Input
                label="目标受众（可选）"
                placeholder="例如：全体用户、医生、患者等"
                error={errors.targetAudience?.message}
                fullWidth
                {...register('targetAudience')}
              />

              {/* 过期时间 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  过期时间（可选）
                </label>
                <input
                  type="datetime-local"
                  {...register('expiresAt')}
                  className="w-full px-4 py-2.5 rounded-lg bg-background-secondary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                {errors.expiresAt && (
                  <p className="text-sm text-error-400 mt-1">{errors.expiresAt.message}</p>
                )}
                <p className="text-sm text-text-tertiary mt-1">
                  留空表示永久有效
                </p>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={handleSubmit(onSaveDraft)}
                  disabled={isSubmitting}
                  variant="outline"
                  type="button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? '保存修改' : '保存草稿'}
                </Button>
                <Button
                  onClick={handleSubmit(onPublish)}
                  disabled={isSubmitting}
                  variant="neon"
                  type="button"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isEditMode ? '更新并发布' : '直接发布'}
                </Button>
                <Button
                  onClick={() => navigate('/announcements')}
                  disabled={isSubmitting}
                  variant="ghost"
                  type="button"
                >
                  取消
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
