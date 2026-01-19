/**
 * 患者排队状态查询 - 公开查询页面
 */
import { useState, type ComponentType } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Search, Clock, MapPin, User, Calendar, AlertCircle, XCircle, CheckCircle2, Activity } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { Modal } from '@/components/ui/Modal'
import {
  getPatientQueuePosition,
  cancelQueue,
  QueueStatus,
  QueuePriority,
} from '@/api/queue.api'
import { getAppointmentById, TimeSlot } from '@/api/appointment.api'
import { formatDate } from '@/utils/format'

// 时间段映射
const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  [TimeSlot.MORNING_EARLY]: '早上 08:00-10:00',
  [TimeSlot.MORNING_LATE]: '上午 10:00-12:00',
  [TimeSlot.AFTERNOON_EARLY]: '下午 14:00-16:00',
  [TimeSlot.AFTERNOON_LATE]: '傍晚 16:00-18:00',
  [TimeSlot.EVENING]: '晚上 18:00-20:00',
}

// 表单验证
const searchSchema = z.object({
  appointmentNumber: z.string().min(1, '请输入挂号号码'),
})

type SearchFormData = z.infer<typeof searchSchema>

export function PatientQueueStatusPage() {
  const queryClient = useQueryClient()
  const [searchedAppointmentId, setSearchedAppointmentId] = useState<string>('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingQueueId, setCancellingQueueId] = useState<string>('')

  // 表单管理
  const { control, handleSubmit, formState: { errors } } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  })

  // 查询挂号信息（通过挂号号码）
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['appointment-by-number', searchedAppointmentId],
    queryFn: () => getAppointmentById(searchedAppointmentId),
    enabled: !!searchedAppointmentId,
  })

  // 查询排队位置
  const { data: queuePosition, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['queue-position', searchedAppointmentId],
    queryFn: () => getPatientQueuePosition(searchedAppointmentId),
    enabled: !!searchedAppointmentId,
    refetchInterval: 5000, // 5秒刷新
  })

  // 取消排队
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelQueue(id, '患者主动取消'),
    onSuccess: () => {
      toast.success('已取消排队')
      setShowCancelModal(false)
      refetchQueue()
      queryClient.invalidateQueries({ queryKey: ['appointment-by-number'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '取消失败')
    },
  })

  const onSubmit = (data: SearchFormData) => {
    // 这里简化处理，实际应该通过挂号号码查询到appointmentId
    // 暂时直接使用输入的值作为appointmentId
    setSearchedAppointmentId(data.appointmentNumber)
  }

  const handleCancelQueue = () => {
    if (queuePosition?.queueItem.id) {
      setCancellingQueueId(queuePosition.queueItem.id)
      setShowCancelModal(true)
    }
  }

  const confirmCancel = () => {
    if (cancellingQueueId) {
      cancelMutation.mutate(cancellingQueueId)
    }
  }

  // 状态标签
  const getStatusBadge = (status: QueueStatus) => {
    const variants: Partial<Record<QueueStatus, { variant: 'warning' | 'info' | 'success' | 'secondary' | 'error'; label: string; icon: ComponentType<any> }>> = {
      [QueueStatus.WAITING]: { variant: 'warning', label: '等待中', icon: Clock },
      [QueueStatus.CALLED]: { variant: 'info', label: '呼叫中', icon: Activity },
      [QueueStatus.IN_PROGRESS]: { variant: 'success', label: '就诊中', icon: Activity },
      [QueueStatus.COMPLETED]: { variant: 'success', label: '已完成', icon: CheckCircle2 },
      [QueueStatus.SKIPPED]: { variant: 'error', label: '已跳过', icon: AlertCircle },
    }
    const config = variants[status] ?? { variant: 'secondary', label: '未知状态', icon: XCircle }
    const Icon = config.icon
    return (
      <Badge variant={config.variant}>
        <Icon className="w-4 h-4 mr-1" />
        {config.label}
      </Badge>
    )
  }

  // 优先级标签
  const getPriorityBadge = (priority: QueuePriority) => {
    const variants: Record<QueuePriority, any> = {
      [QueuePriority.NORMAL]: { variant: 'info' as const, label: '普通' },
      [QueuePriority.URGENT]: { variant: 'warning' as const, label: '紧急' },
      [QueuePriority.EMERGENCY]: { variant: 'error' as const, label: '急诊' },
    }
    const config = variants[priority]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const isLoading = appointmentLoading || queueLoading

  return (
    <div className="min-h-screen bg-background-primary">
      {/* 顶部栏 */}
      <div className="bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 shadow-neon-blue">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-white mb-2">排队状态查询</h1>
            <p className="text-white/80">输入挂号号码查询您的排队位置</p>
          </motion.div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 搜索表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-4">
              <Controller
                name="appointmentNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="请输入挂号号码或身份证号"
                    error={errors.appointmentNumber?.message}
                    fullWidth
                    leftIcon={<Search className="w-5 h-5" />}
                  />
                )}
              />
              <Button
                type="submit"
                variant="primary"
                icon={<Search className="w-4 h-4" />}
                className="whitespace-nowrap"
              >
                查询
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* 加载状态 */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <Loading size="lg" />
            </motion.div>
          )}

          {/* 查询结果 */}
          {!isLoading && queuePosition && appointment && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* 排队位置卡片 */}
              <Card hover glow className="relative overflow-hidden">
                {/* 背景动画 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                />

                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gradient mb-4">您的排队状态</h2>
                    {getStatusBadge(queuePosition.queueItem.status)}
                  </div>

                  {/* 排队位置 */}
                  {queuePosition.queueItem.status === QueueStatus.WAITING && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center p-6 rounded-lg bg-primary-500/10 border border-primary-500/30">
                        <MapPin className="w-8 h-8 mx-auto mb-3 text-primary-400" />
                        <p className="text-sm text-text-tertiary mb-1">前面还有</p>
                        <p className="text-5xl font-bold text-gradient">{queuePosition.waitingAhead}</p>
                        <p className="text-sm text-text-tertiary mt-1">人</p>
                      </div>

                      <div className="text-center p-6 rounded-lg bg-warning-500/10 border border-warning-500/30">
                        <Clock className="w-8 h-8 mx-auto mb-3 text-warning-400" />
                        <p className="text-sm text-text-tertiary mb-1">预计等待</p>
                        <p className="text-3xl font-bold text-gradient">
                          {queuePosition.estimatedWaitTime}
                        </p>
                        <p className="text-sm text-text-tertiary mt-1">分钟</p>
                      </div>

                      <div className="text-center p-6 rounded-lg bg-secondary-500/10 border border-secondary-500/30">
                        <User className="w-8 h-8 mx-auto mb-3 text-secondary-400" />
                        <p className="text-sm text-text-tertiary mb-1">排队号</p>
                        <p className="text-4xl font-bold text-gradient">
                          {queuePosition.queueItem.queueNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 呼叫中提示 */}
                  {queuePosition.queueItem.status === QueueStatus.CALLED && (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-center py-12 mb-6"
                    >
                      <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-info-500/10 border-4 border-info-500 flex items-center justify-center">
                        <Activity className="w-16 h-16 text-info-400" />
                      </div>
                      <h3 className="text-4xl font-bold text-gradient mb-3">请您就诊</h3>
                      <p className="text-xl text-text-secondary">
                        请到 <span className="text-primary-400 font-bold">{queuePosition.queueItem.doctorName}</span> 处就诊
                      </p>
                    </motion.div>
                  )}

                  {/* 就诊中提示 */}
                  {queuePosition.queueItem.status === QueueStatus.IN_PROGRESS && (
                    <div className="text-center py-12 mb-6">
                      <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-success-500/10 border-4 border-success-500 flex items-center justify-center">
                        <Activity className="w-16 h-16 text-success-400" />
                      </div>
                      <h3 className="text-4xl font-bold text-gradient">就诊中</h3>
                    </div>
                  )}
                </div>
              </Card>

              {/* 挂号信息卡片 */}
              <Card>
                <h3 className="text-xl font-semibold text-gradient mb-4">挂号信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50">
                    <User className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-tertiary">患者姓名</p>
                      <p className="text-text-primary font-medium">{appointment.patient.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50">
                    <Activity className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-tertiary">就诊科室</p>
                      <p className="text-text-primary font-medium">
                        {appointment.department.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50">
                    <User className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-tertiary">就诊医生</p>
                      <p className="text-text-primary font-medium">{appointment.doctor.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50">
                    <Calendar className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-tertiary">就诊日期</p>
                      <p className="text-text-primary font-medium">{formatDate(appointment.appointmentDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50">
                    <Clock className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-tertiary">时间段</p>
                      <p className="text-text-primary font-medium">
                        {TIME_SLOT_LABELS[appointment.timeSlot]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background-secondary/50">
                    <AlertCircle className="w-5 h-5 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-tertiary">优先级</p>
                      <div className="mt-1">{getPriorityBadge(appointment.priority as any)}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 操作按钮 */}
              {queuePosition.queueItem.status === QueueStatus.WAITING && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={handleCancelQueue}
                    icon={<XCircle className="w-4 h-4" />}
                  >
                    取消排队
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 空状态 */}
          {!isLoading && !queuePosition && searchedAppointmentId && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-text-tertiary opacity-50" />
                <h3 className="text-xl font-semibold text-gradient mb-2">未找到排队信息</h3>
                <p className="text-text-secondary">
                  请检查挂号号码是否正确，或联系工作人员
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 取消确认Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="取消排队"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-500/10 border border-warning-500/30">
            <AlertCircle className="w-5 h-5 text-warning-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-text-primary font-medium mb-1">确认取消排队？</p>
              <p className="text-sm text-text-secondary">
                取消后将失去当前排队位置，需要重新挂号
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowCancelModal(false)}
            >
              返回
            </Button>
            <Button
              variant="error"
              fullWidth
              onClick={confirmCancel}
              loading={cancelMutation.isPending}
              icon={<XCircle className="w-4 h-4" />}
            >
              确认取消
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
