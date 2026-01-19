/**
 * 系统公告列表页面
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { useAuthStore } from '@/store/auth.store'
import {
  getAnnouncements,
  deleteAnnouncement,
  publishAnnouncement,
  archiveAnnouncement,
  type Announcement,
  type AnnouncementSearchParams,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementPriority,
} from '@/api/announcement.api'
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Send,
  Archive,
  Settings,
  AlertCircle,
  Info,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export function AnnouncementListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useState<AnnouncementSearchParams>({
    page: 1,
    pageSize: 20,
  })

  // 检查是否有系统管理权限
  const hasSystemManagePermission = user?.permissions?.includes('system:manage')

  // 获取公告列表
  const { data: announcementsData, isLoading, refetch } = useQuery({
    queryKey: ['announcements', searchParams],
    queryFn: () => getAnnouncements(searchParams),
  })

  // 处理状态筛选
  const handleStatusFilter = (status: string) => {
    setSearchParams((prev) => ({
      ...prev,
      status: status ? (status as AnnouncementStatus) : undefined,
      page: 1,
    }))
  }

  // 处理类型筛选
  const handleTypeFilter = (type: string) => {
    setSearchParams((prev) => ({
      ...prev,
      type: type ? (type as AnnouncementType) : undefined,
      page: 1,
    }))
  }

  // 处理优先级筛选
  const handlePriorityFilter = (priority: string) => {
    setSearchParams((prev) => ({
      ...prev,
      priority: priority ? (priority as AnnouncementPriority) : undefined,
      page: 1,
    }))
  }

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这条公告吗？')) return

    try {
      await deleteAnnouncement(id)
      toast.success('删除成功')
      refetch()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 处理发布
  const handlePublish = async (id: string) => {
    if (!confirm('确认发布这条公告吗？')) return

    try {
      await publishAnnouncement(id)
      toast.success('发布成功')
      refetch()
    } catch (error) {
      toast.error('发布失败')
    }
  }

  // 处理归档
  const handleArchive = async (id: string) => {
    if (!confirm('确认归档这条公告吗？')) return

    try {
      await archiveAnnouncement(id)
      toast.success('归档成功')
      refetch()
    } catch (error) {
      toast.error('归档失败')
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
      [AnnouncementPriority.LOW]: { variant: 'info' as const, label: '低' },
      [AnnouncementPriority.MEDIUM]: { variant: 'warning' as const, label: '中' },
      [AnnouncementPriority.HIGH]: { variant: 'danger' as const, label: '高' },
    }

    const config = priorityConfig[priority]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 渲染类型图标
  const renderTypeIcon = (type: AnnouncementType) => {
    const iconConfig = {
      [AnnouncementType.SYSTEM]: { icon: Settings, className: 'text-neon-blue' },
      [AnnouncementType.IMPORTANT]: { icon: AlertCircle, className: 'text-red-500' },
      [AnnouncementType.GENERAL]: { icon: Info, className: 'text-neon-cyan' },
    }

    const config = iconConfig[type]
    const IconComponent = config.icon

    return <IconComponent className={cn('h-5 w-5', config.className)} />
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载公告列表..." />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">系统公告</h1>
            <p className="text-text-secondary mt-2">查看和管理系统公告信息</p>
          </div>
          {hasSystemManagePermission && (
            <Button
              onClick={() => navigate('/announcements/new')}
              variant="neon"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              新建公告
            </Button>
          )}
        </div>

        {/* 筛选器 */}
        <Card className="card-neon p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">状态</label>
              <NativeSelect
                value={searchParams.status || ''}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full"
              >
                <option value="">全部状态</option>
                <option value={AnnouncementStatus.DRAFT}>草稿</option>
                <option value={AnnouncementStatus.PUBLISHED}>已发布</option>
                <option value={AnnouncementStatus.EXPIRED}>已过期</option>
                <option value={AnnouncementStatus.ARCHIVED}>已归档</option>
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">类型</label>
              <NativeSelect
                value={searchParams.type || ''}
                onChange={(e) => handleTypeFilter(e.target.value)}
                className="w-full"
              >
                <option value="">全部类型</option>
                <option value={AnnouncementType.SYSTEM}>系统公告</option>
                <option value={AnnouncementType.IMPORTANT}>重要公告</option>
                <option value={AnnouncementType.GENERAL}>普通公告</option>
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">优先级</label>
              <NativeSelect
                value={searchParams.priority || ''}
                onChange={(e) => handlePriorityFilter(e.target.value)}
                className="w-full"
              >
                <option value="">全部优先级</option>
                <option value={AnnouncementPriority.LOW}>低</option>
                <option value={AnnouncementPriority.MEDIUM}>中</option>
                <option value={AnnouncementPriority.HIGH}>高</option>
              </NativeSelect>
            </div>
          </div>
        </Card>

        {/* 公告列表 */}
        <Card className="card-neon">
          <DataTable
            columns={[
              {
                key: 'type',
                title: '类型',
                render: (announcement: Announcement) => (
                  <div className="flex items-center justify-center">
                    {renderTypeIcon(announcement.type)}
                  </div>
                ),
              },
              {
                key: 'title',
                title: '标题',
                render: (announcement: Announcement) => (
                  <div className="max-w-md">
                    <div className="font-medium text-text-primary truncate">
                      {announcement.title}
                    </div>
                    <div className="text-sm text-text-secondary mt-1">
                      创建者: {announcement.creator.name}
                    </div>
                  </div>
                ),
              },
              {
                key: 'priority',
                title: '优先级',
                render: (announcement: Announcement) => renderPriorityBadge(announcement.priority),
              },
              {
                key: 'status',
                title: '状态',
                render: (announcement: Announcement) => renderStatusBadge(announcement.status),
              },
              {
                key: 'publishedAt',
                title: '发布时间',
                render: (announcement: Announcement) => (
                  <div className="text-sm text-text-secondary">
                    {announcement.publishedAt
                      ? new Date(announcement.publishedAt).toLocaleString('zh-CN')
                      : '-'}
                  </div>
                ),
              },
              {
                key: 'expiresAt',
                title: '过期时间',
                render: (announcement: Announcement) => (
                  <div className="text-sm text-text-secondary">
                    {announcement.expiresAt
                      ? new Date(announcement.expiresAt).toLocaleString('zh-CN')
                      : '永久有效'}
                  </div>
                ),
              },
              {
                key: 'actions',
                title: '操作',
                render: (announcement: Announcement) => (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/announcements/${announcement.id}`)}
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {hasSystemManagePermission &&
                      announcement.status === AnnouncementStatus.DRAFT && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/announcements/${announcement.id}/edit`)}
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(announcement.id)}
                            title="发布"
                          >
                            <Send className="h-4 w-4 text-neon-cyan" />
                          </Button>
                        </>
                      )}
                    {hasSystemManagePermission &&
                      announcement.status === AnnouncementStatus.PUBLISHED && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(announcement.id)}
                          title="归档"
                        >
                          <Archive className="h-4 w-4 text-orange-500" />
                        </Button>
                      )}
                    {hasSystemManagePermission && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={announcementsData?.announcements || []}
            emptyText="暂无公告数据"
          />

          {/* 分页 */}
          {announcementsData && announcementsData.total > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div className="text-sm text-text-secondary">
                共 {announcementsData.total} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={searchParams.page === 1}
                  onClick={() =>
                    setSearchParams((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
                  }
                >
                  上一页
                </Button>
                <div className="flex items-center px-4 text-sm text-text-secondary">
                  第 {searchParams.page} /{' '}
                  {Math.ceil(announcementsData.total / (searchParams.pageSize || 20))} 页
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    (searchParams.page || 1) >=
                    Math.ceil(announcementsData.total / (searchParams.pageSize || 20))
                  }
                  onClick={() =>
                    setSearchParams((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
                  }
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
