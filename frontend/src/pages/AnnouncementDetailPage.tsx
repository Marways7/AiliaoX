/**
 * 系统公告详情页面
 */
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { useAuthStore } from '@/store/auth.store'
import {
  getAnnouncementById,
  deleteAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  markAnnouncementAsRead,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementPriority,
} from '@/api/announcement.api'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  Archive,
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  User,
  Calendar,
  Clock,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // 检查是否有系统管理权限
  const hasSystemManagePermission = user?.permissions?.includes('SYSTEM_MANAGE')

  // 获取公告详情
  const { data: announcement, isLoading, refetch } = useQuery({
    queryKey: ['announcement', id],
    queryFn: () => getAnnouncementById(id!),
    enabled: !!id,
  })

  // 处理删除
  const handleDelete = async () => {
    if (!id || !confirm('确认删除这条公告吗？')) return

    try {
      await deleteAnnouncement(id)
      toast.success('删除成功')
      navigate('/announcements')
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 处理发布
  const handlePublish = async () => {
    if (!id || !confirm('确认发布这条公告吗？')) return

    try {
      await publishAnnouncement(id)
      toast.success('发布成功')
      refetch()
    } catch (error) {
      toast.error('发布失败')
    }
  }

  // 处理归档
  const handleArchive = async () => {
    if (!id || !confirm('确认归档这条公告吗？')) return

    try {
      await archiveAnnouncement(id)
      toast.success('归档成功')
      refetch()
    } catch (error) {
      toast.error('归档失败')
    }
  }

  // 处理标记已读
  const handleMarkAsRead = async () => {
    if (!id) return

    try {
      await markAnnouncementAsRead(id)
      toast.success('已标记为已读')
    } catch (error) {
      toast.error('标记失败')
    }
  }

  // 渲染状态徽章
  const renderStatusBadge = (status: AnnouncementStatus) => {
    const statusConfig = {
      [AnnouncementStatus.DRAFT]: { variant: 'default' as const, label: '草稿' },
      [AnnouncementStatus.PUBLISHED]: { variant: 'success' as const, label: '已发布' },
      [AnnouncementStatus.EXPIRED]: { variant: 'warning' as const, label: '已过期' },
      [AnnouncementStatus.ARCHIVED]: { variant: 'info' as const, label: '已归档' },
    }

    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 渲染优先级徽章
  const renderPriorityBadge = (priority: AnnouncementPriority) => {
    const priorityConfig = {
      [AnnouncementPriority.LOW]: { variant: 'info' as const, label: '低优先级' },
      [AnnouncementPriority.MEDIUM]: { variant: 'warning' as const, label: '中优先级' },
      [AnnouncementPriority.HIGH]: { variant: 'danger' as const, label: '高优先级' },
    }

    const config = priorityConfig[priority]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 渲染类型图标和标签
  const renderTypeLabel = (type: AnnouncementType) => {
    const typeConfig = {
      [AnnouncementType.SYSTEM]: { icon: Settings, label: '系统公告', className: 'text-neon-blue' },
      [AnnouncementType.IMPORTANT]: {
        icon: AlertCircle,
        label: '重要公告',
        className: 'text-red-500',
      },
      [AnnouncementType.GENERAL]: { icon: Info, label: '普通公告', className: 'text-neon-cyan' },
    }

    const config = typeConfig[type]
    const IconComponent = config.icon

    return (
      <div className="flex items-center gap-2">
        <IconComponent className={cn('h-5 w-5', config.className)} />
        <span className={cn('font-medium', config.className)}>{config.label}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载公告详情..." />
        </div>
      </DashboardLayout>
    )
  }

  if (!announcement) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="h-16 w-16 text-text-tertiary mb-4" />
          <p className="text-text-secondary mb-4">公告不存在</p>
          <Button onClick={() => navigate('/announcements')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 返回按钮 */}
        <Button onClick={() => navigate('/announcements')} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>

        {/* 公告详情卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="card-neon p-6">
            {/* 标题和状态 */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gradient mb-4">{announcement.title}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  {renderTypeLabel(announcement.type)}
                  {renderPriorityBadge(announcement.priority)}
                  {renderStatusBadge(announcement.status)}
                </div>
              </div>
            </div>

            {/* 元信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 glass rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-neon-cyan" />
                <div>
                  <p className="text-sm text-text-secondary">创建者</p>
                  <p className="text-text-primary font-medium">
                    {announcement.creator.name} (@{announcement.creator.username})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-neon-blue" />
                <div>
                  <p className="text-sm text-text-secondary">创建时间</p>
                  <p className="text-text-primary font-medium">
                    {new Date(announcement.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              {announcement.publishedAt && (
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-neon-cyan" />
                  <div>
                    <p className="text-sm text-text-secondary">发布时间</p>
                    <p className="text-text-primary font-medium">
                      {new Date(announcement.publishedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-text-secondary">过期时间</p>
                  <p className="text-text-primary font-medium">
                    {announcement.expiresAt
                      ? new Date(announcement.expiresAt).toLocaleString('zh-CN')
                      : '永久有效'}
                  </p>
                </div>
              </div>
            </div>

            {/* 目标受众 */}
            {announcement.targetAudience && (
              <div className="mb-6 p-4 glass rounded-lg">
                <h3 className="text-sm text-text-secondary mb-2">目标受众</h3>
                <p className="text-text-primary">{announcement.targetAudience}</p>
              </div>
            )}

            {/* 公告内容 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">公告内容</h3>
              <div className="p-4 glass rounded-lg">
                <div className="text-text-primary whitespace-pre-wrap leading-relaxed">
                  {announcement.content}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3">
              {/* 普通用户：标记已读 */}
              {!hasSystemManagePermission &&
                announcement.status === AnnouncementStatus.PUBLISHED && (
                  <Button onClick={handleMarkAsRead} variant="primary">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    标记已读
                  </Button>
                )}

              {/* 管理员操作 */}
              {hasSystemManagePermission && (
                <>
                  {announcement.status === AnnouncementStatus.DRAFT && (
                    <>
                      <Button
                        onClick={() => navigate(`/announcements/${id}/edit`)}
                        variant="primary"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        编辑
                      </Button>
                      <Button onClick={handlePublish} variant="success">
                        <Send className="h-4 w-4 mr-2" />
                        发布
                      </Button>
                    </>
                  )}

                  {announcement.status === AnnouncementStatus.PUBLISHED && (
                    <Button onClick={handleArchive} variant="warning">
                      <Archive className="h-4 w-4 mr-2" />
                      归档
                    </Button>
                  )}

                  <Button onClick={handleDelete} variant="danger">
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除
                  </Button>
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
