/**
 * 有效公告展示组件
 * 用于在Dashboard或其他页面展示当前有效的公告
 */
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import {
  getActiveAnnouncements,
  markAnnouncementAsRead,
  AnnouncementType,
  AnnouncementPriority,
} from '@/api/announcement.api'
import { Settings, AlertCircle, Info, CheckCircle, Eye } from 'lucide-react'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'

interface ActiveAnnouncementListProps {
  maxItems?: number
  showViewAll?: boolean
}

export function ActiveAnnouncementList({
  maxItems = 5,
  showViewAll = true,
}: ActiveAnnouncementListProps) {
  const navigate = useNavigate()

  // 获取有效公告
  const { data: announcements, isLoading, refetch } = useQuery({
    queryKey: ['active-announcements'],
    queryFn: getActiveAnnouncements,
    refetchInterval: 60000, // 每分钟刷新一次
  })

  // 处理标记已读
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      await markAnnouncementAsRead(id)
      toast.success('已标记为已读')
      refetch()
    } catch (error) {
      toast.error('标记失败')
    }
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

  // 渲染优先级徽章
  const renderPriorityBadge = (priority: AnnouncementPriority) => {
    const priorityConfig = {
      [AnnouncementPriority.LOW]: { variant: 'info' as const, label: '低' },
      [AnnouncementPriority.MEDIUM]: { variant: 'warning' as const, label: '中' },
      [AnnouncementPriority.HIGH]: { variant: 'danger' as const, label: '高' },
    }

    const config = priorityConfig[priority]
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <Card className="card-neon p-6">
        <div className="flex items-center justify-center py-8">
          <Loading size="md" text="加载公告..." />
        </div>
      </Card>
    )
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card className="card-neon p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Info className="h-12 w-12 text-text-tertiary mb-3" />
          <p className="text-text-secondary">暂无有效公告</p>
        </div>
      </Card>
    )
  }

  // 按优先级排序并限制数量
  const sortedAnnouncements = [...announcements]
    .sort((a, b) => {
      const priorityWeight = {
        [AnnouncementPriority.HIGH]: 3,
        [AnnouncementPriority.MEDIUM]: 2,
        [AnnouncementPriority.LOW]: 1,
      }
      return priorityWeight[b.priority] - priorityWeight[a.priority]
    })
    .slice(0, maxItems)

  return (
    <Card className="card-neon p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gradient">系统公告</h3>
        {showViewAll && (
          <Button
            onClick={() => navigate('/announcements')}
            variant="ghost"
            size="sm"
          >
            查看全部
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {sortedAnnouncements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/announcements/${announcement.id}`)}
              className="p-4 glass rounded-lg cursor-pointer hover:bg-background-secondary/70 transition-all group"
            >
              <div className="flex items-start gap-3">
                {/* 类型图标 */}
                <div className="flex-shrink-0 mt-1">
                  {renderTypeIcon(announcement.type)}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-text-primary truncate group-hover:text-primary-400 transition-colors">
                      {announcement.title}
                    </h4>
                    {renderPriorityBadge(announcement.priority)}
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                    <span>
                      {new Date(announcement.publishedAt!).toLocaleDateString('zh-CN')}
                    </span>
                    {announcement.expiresAt && (
                      <span>
                        过期: {new Date(announcement.expiresAt).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  <Button
                    onClick={(e) => handleMarkAsRead(announcement.id, e)}
                    variant="ghost"
                    size="sm"
                    title="标记已读"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => navigate(`/announcements/${announcement.id}`)}
                    variant="ghost"
                    size="sm"
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  )
}
