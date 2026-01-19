/**
 * 医生叫号控制台 - 医生端叫号功能
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Bell, CheckCircle2, Clock, User, AlertCircle, Phone } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import {
  getDoctorQueue,
  callNext,
  completeQueue,
  QueueStatus,
  QueuePriority,
  type QueueItem,
} from '@/api/queue.api'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/utils/cn'

export function DoctorQueuePage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [currentCalling, setCurrentCalling] = useState<QueueItem | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 从用户信息获取医生ID和科室信息
  const doctorId = user?.doctor?.id

  // 如果不是医生，显示错误
  useEffect(() => {
    if (user && !user.doctor) {
      toast.error('您不是医生，无法访问此页面')
    }
  }, [user])

  // 获取医生排队列表
  const { data: queueList, isLoading, refetch } = useQuery({
    queryKey: ['doctor-queue', doctorId],
    queryFn: () => getDoctorQueue(doctorId!),
    enabled: !!doctorId, // 只有当有医生ID时才执行查询
    refetchInterval: autoRefresh ? 5000 : false, // 5秒自动刷新
  })

  // 叫号
  const callNextMutation = useMutation({
    mutationFn: () => {
      if (!doctorId) {
        throw new Error('缺少医生ID')
      }
      return callNext(doctorId)
    },
    onSuccess: (queue) => {
      if (!queue) {
        toast.info('当前没有等待的患者')
        setCurrentCalling(null)
        return
      }

      setCurrentCalling(queue)
      toast.success(`正在呼叫：${queue.queueNumber} - ${queue.patientName || '未命名患者'}`)
      queryClient.invalidateQueries({ queryKey: ['doctor-queue', doctorId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || '叫号失败')
    },
  })

  // 完成就诊
  const completeMutation = useMutation({
    mutationFn: (id: string) => completeQueue(id),
    onSuccess: () => {
      toast.success('患者就诊完成')
      setCurrentCalling(null)
      queryClient.invalidateQueries({ queryKey: ['doctor-queue', doctorId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '操作失败')
    },
  })

  // 候诊列表（等待中的患者，按优先级排序）
  const waitingList = queueList?.filter(q => q.status === QueueStatus.WAITING)
    .sort((a, b) => {
      // 优先级排序：急诊 > 紧急 > 普通
      const priorityOrder = {
        [QueuePriority.EMERGENCY]: 0,
        [QueuePriority.URGENT]: 1,
        [QueuePriority.NORMAL]: 2,
      }
      const aPriority = a.priority ?? QueuePriority.NORMAL
      const bPriority = b.priority ?? QueuePriority.NORMAL
      return priorityOrder[aPriority] - priorityOrder[bPriority]
    }) || []

  // 就诊中的患者
  const processingPatient = queueList?.find((q) =>
    q.status === QueueStatus.IN_PROGRESS || q.status === QueueStatus.CALLED
  )

  // 今日已完成数量
  const completedCount =
    queueList?.filter((q) => q.status === QueueStatus.COMPLETED).length || 0

  // 计算等待时间（分钟）
  const calculateWaitTime = (createdAt: string) => {
    const now = new Date().getTime()
    const created = new Date(createdAt).getTime()
    return Math.floor((now - created) / 1000 / 60)
  }

  // 优先级颜色
  const getPriorityColor = (priority: QueuePriority) => {
    const colors = {
      [QueuePriority.NORMAL]: 'text-info-400 border-info-500',
      [QueuePriority.URGENT]: 'text-warning-400 border-warning-500',
      [QueuePriority.EMERGENCY]: 'text-error-400 border-error-500',
    }
    return colors[priority]
  }

  // 优先级标签
  const getPriorityLabel = (priority: QueuePriority) => {
    const labels = {
      [QueuePriority.NORMAL]: '普通',
      [QueuePriority.URGENT]: '紧急',
      [QueuePriority.EMERGENCY]: '急诊',
    }
    return labels[priority]
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 如果不是医生，显示提示 */}
        {user && !user.doctor && (
          <Card className="border-error-500 bg-error-500/10">
            <div className="flex items-center gap-3 text-error-400">
              <AlertCircle className="w-5 h-5" />
              <p>您不是医生，无法访问此页面。请使用医生账号登录。</p>
            </div>
          </Card>
        )}

        {/* 如果是医生但缺少信息，显示提示 */}
        {user?.doctor && !doctorId && (
          <Card className="border-warning-500 bg-warning-500/10">
            <div className="flex items-center gap-3 text-warning-400">
              <AlertCircle className="w-5 h-5" />
              <p>医生信息不完整，请联系管理员。</p>
            </div>
          </Card>
        )}

        {/* 正常显示医生叫号功能 */}
        {doctorId && (
          <>
            {/* 页面标题 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-3xl font-bold text-gradient mb-2">医生叫号控制台</h1>
                <p className="text-text-secondary">
                  {user?.doctor?.name} - {user?.doctor?.department?.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 rounded border-border-primary bg-background-secondary text-primary-500 focus:ring-2 focus:ring-primary-500"
                  />
                  自动刷新
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  loading={isLoading}
                >
                  手动刷新
                </Button>
              </div>
            </motion.div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card hover glow>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning-500/10 border border-warning-500/30">
                  <Clock className="w-6 h-6 text-warning-400" />
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">候诊人数</p>
                  <p className="text-3xl font-bold text-gradient">{waitingList.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card hover glow>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-info-500/10 border border-info-500/30">
                  <User className="w-6 h-6 text-info-400" />
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">就诊中</p>
                  <p className="text-3xl font-bold text-gradient">{processingPatient ? 1 : 0}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card hover glow>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-success-500/10 border border-success-500/30">
                  <CheckCircle2 className="w-6 h-6 text-success-400" />
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">已完成</p>
                  <p className="text-3xl font-bold text-gradient">{completedCount}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 当前呼叫 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1"
          >
            <Card className="h-full">
              <h2 className="text-xl font-semibold text-gradient mb-6">当前呼叫</h2>
              <AnimatePresence mode="wait">
                {processingPatient || currentCalling ? (
                  <motion.div
                    key="calling"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      'p-6 rounded-xl border-2 text-center',
                      'bg-gradient-to-br from-primary-500/10 to-secondary-500/10',
                      'border-primary-500 shadow-neon-blue'
                    )}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="mb-4"
                    >
                      <Phone className="w-16 h-16 mx-auto text-primary-400" />
                    </motion.div>
                    <div className="text-5xl font-bold text-gradient mb-4">
                      {(processingPatient || currentCalling)?.queueNumber}
                    </div>
                    <div className="text-2xl font-semibold text-text-primary mb-2">
                      {(processingPatient || currentCalling)?.patientName || '未命名患者'}
                    </div>
                    <Badge variant="info" className="mb-6">
                      {getPriorityLabel(
                        ((processingPatient || currentCalling)?.priority ??
                          QueuePriority.NORMAL) as QueuePriority
                      )}
                    </Badge>
                    <Button
                      variant="success"
                      fullWidth
                      size="lg"
                      onClick={() => completeMutation.mutate((processingPatient || currentCalling)!.id)}
                      loading={completeMutation.isPending}
                      icon={<CheckCircle2 className="w-5 h-5" />}
                    >
                      完成就诊
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-12"
                  >
                    <Bell className="w-16 h-16 mx-auto mb-4 text-text-tertiary opacity-50" />
                    <p className="text-text-tertiary mb-6">暂无患者就诊</p>
                    <Button
                      variant="primary"
                      fullWidth
                      size="lg"
                      onClick={() => callNextMutation.mutate()}
                      loading={callNextMutation.isPending}
                      disabled={waitingList.length === 0}
                      icon={<Bell className="w-5 h-5" />}
                    >
                      呼叫下一位
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* 候诊队列 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gradient">候诊队列</h2>
                {!processingPatient && !currentCalling && (
                  <Button
                    variant="primary"
                    onClick={() => callNextMutation.mutate()}
                    loading={callNextMutation.isPending}
                    disabled={waitingList.length === 0}
                    icon={<Bell className="w-4 h-4" />}
                  >
                    呼叫下一位
                  </Button>
                )}
              </div>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loading size="lg" />
                </div>
              ) : waitingList.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {waitingList.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all duration-300',
                        'bg-background-secondary/50',
                        getPriorityColor(item.priority ?? QueuePriority.NORMAL),
                        'hover:shadow-lg hover:scale-[1.02]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* 排队号 */}
                          <div className="text-center min-w-[80px]">
                            <div className="text-2xl font-bold text-gradient">
                              {item.queueNumber}
                            </div>
                            <div className="text-xs text-text-tertiary">排队号</div>
                          </div>

                          {/* 患者信息 */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-semibold text-text-primary">
                                {item.patientName}
                              </span>
                              <Badge
                                variant={
                                  (item.priority ?? QueuePriority.NORMAL) === QueuePriority.EMERGENCY
                                    ? 'error'
                                    : (item.priority ?? QueuePriority.NORMAL) === QueuePriority.URGENT
                                      ? 'warning'
                                      : 'info'
                                }
                              >
                                {getPriorityLabel(item.priority ?? QueuePriority.NORMAL)}
                              </Badge>
                            </div>
                            <div className="text-sm text-text-secondary">
                              等待时间：{calculateWaitTime(item.createdAt)} 分钟
                            </div>
                          </div>
                        </div>

                        {/* 前面还有几人 */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary-400">
                            {index}
                          </div>
                          <div className="text-xs text-text-tertiary">前面还有</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-tertiary">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无候诊患者</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
