/**
 * 挂号管理页面 - 患者端挂号功能
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Calendar, Clock, User, Stethoscope, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import {
  createAppointment,
  cancelAppointment,
  getAppointments,
  getAppointmentStatistics,
  type CreateAppointmentRequest,
  TimeSlot,
  AppointmentPriority,
  AppointmentStatus,
  type Appointment,
  mapTimeSlotToBackend,
} from '@/api/appointment.api'
import { getPatients } from '@/api/patient.api'
import { getDepartments } from '@/api/department.api'
import { getDoctors } from '@/api/doctor.api'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'

// 时间段选项
const TIME_SLOTS: SelectOption[] = [
  { value: TimeSlot.MORNING_EARLY, label: '早上 08:00-10:00' },
  { value: TimeSlot.MORNING_LATE, label: '上午 10:00-12:00' },
  { value: TimeSlot.AFTERNOON_EARLY, label: '下午 14:00-16:00' },
  { value: TimeSlot.AFTERNOON_LATE, label: '傍晚 16:00-18:00' },
  { value: TimeSlot.EVENING, label: '晚上 18:00-20:00' },
]

// 优先级选项
const PRIORITY_OPTIONS: SelectOption[] = [
  { value: AppointmentPriority.NORMAL, label: '普通' },
  { value: AppointmentPriority.URGENT, label: '紧急' },
  { value: AppointmentPriority.EMERGENCY, label: '急诊' },
]

// 表单验证Schema
const appointmentSchema = z.object({
  patientId: z.string().min(1, '请选择患者'),
  departmentId: z.string().min(1, '请选择科室'),
  doctorId: z.string().min(1, '请选择医生'),
  appointmentDate: z.string().min(1, '请选择日期'),
  timeSlot: z.nativeEnum(TimeSlot, { errorMap: () => ({ message: '请选择时间段' }) }),
  priority: z.nativeEnum(AppointmentPriority).optional(),
  notes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

export function AppointmentPage() {
  const queryClient = useQueryClient()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null)

  // 获取患者列表
  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatients({ page: 1, pageSize: 100 }),
  })

  // 获取科室列表
  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  })

  // 表单管理
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      priority: AppointmentPriority.NORMAL,
    },
  })

  const watchDepartmentId = watch('departmentId')

  // 获取医生列表（根据选择的科室）
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors', watchDepartmentId],
    queryFn: () => getDoctors(watchDepartmentId),
    enabled: !!watchDepartmentId,
  })

  // 获取今日挂号统计
  const { data: statistics } = useQuery({
    queryKey: ['appointment-statistics'],
    queryFn: () => getAppointmentStatistics({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    }),
  })

  // 获取今日挂号列表
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: () => getAppointments({
      dateFrom: new Date().toISOString().split('T')[0],  // 改为dateFrom
      page: 1,
      limit: 20,  // 改为limit
    }),
  })

  // 创建挂号
  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: (data) => {
      toast.success('挂号成功！')
      setCreatedAppointment(data)
      setShowSuccessModal(true)
      reset()
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-statistics'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '挂号失败，请重试')
    },
  })

  // 取消挂号
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelAppointment(id, '患者主动取消'),
    onSuccess: () => {
      toast.success('挂号已取消')
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-statistics'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '取消失败')
    },
  })

  const onSubmit = (data: AppointmentFormData) => {
    const requestData: CreateAppointmentRequest = {
      patientId: data.patientId,
      doctorId: data.doctorId,
      departmentId: data.departmentId,
      appointmentDate: data.appointmentDate,
      timeSlot: mapTimeSlotToBackend(data.timeSlot),
      priority: data.priority || AppointmentPriority.NORMAL,
      notes: data.notes,
    }
    createMutation.mutate(requestData)
  }

  // 患者选项
  const patientOptions: SelectOption[] = patientsData?.data.map((patient) => ({
    value: patient.id,
    label: `${patient.name} - ${patient.phone}`,
  })) || []

  // 科室选项（从API获取）
  const departmentOptions: SelectOption[] = departmentsData?.map((dept) => ({
    value: dept.id,
    label: dept.name,
  })) || []

  // 医生选项（根据选择的科室从API获取）
  const doctorOptions: SelectOption[] = doctorsData?.map((doctor) => ({
    value: doctor.id,
    label: `${doctor.name}${doctor.title ? ` (${doctor.title})` : ''}`,
  })) || []

  // 状态徽章样式
  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, any> = {
      [AppointmentStatus.PENDING]: { variant: 'warning' as const, label: '待就诊' },
      [AppointmentStatus.CONFIRMED]: { variant: 'info' as const, label: '已确认' },
      [AppointmentStatus.COMPLETED]: { variant: 'success' as const, label: '已完成' },
      [AppointmentStatus.CANCELLED]: { variant: 'secondary' as const, label: '已取消' },
      [AppointmentStatus.MISSED]: { variant: 'error' as const, label: '未到诊' },
    }
    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 优先级徽章样式
  const getPriorityBadge = (priority: AppointmentPriority) => {
    const variants: Record<AppointmentPriority, any> = {
      [AppointmentPriority.NORMAL]: { variant: 'info' as const, label: '普通' },
      [AppointmentPriority.URGENT]: { variant: 'warning' as const, label: '紧急' },
      [AppointmentPriority.EMERGENCY]: { variant: 'error' as const, label: '急诊' },
    }
    const config = variants[priority]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gradient mb-2">挂号管理</h1>
            <p className="text-text-secondary">选择科室、医生和时间段进行挂号</p>
          </div>
        </motion.div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card hover glow>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                  <Calendar className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">今日挂号</p>
                  <p className="text-2xl font-bold text-gradient">{statistics?.totalCount || 0}</p>
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
                <div className="p-3 rounded-lg bg-warning-500/10 border border-warning-500/30">
                  <Clock className="w-6 h-6 text-warning-400" />
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">待就诊</p>
                  <p className="text-2xl font-bold text-gradient">{statistics?.pendingCount || 0}</p>
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
                  <p className="text-2xl font-bold text-gradient">{statistics?.completedCount || 0}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card hover glow>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/30">
                  <XCircle className="w-6 h-6 text-error-400" />
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">已取消</p>
                  <p className="text-2xl font-bold text-gradient">{statistics?.cancelledCount || 0}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 挂号表单 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-1"
          >
            <Card>
              <h2 className="text-xl font-semibold text-gradient mb-6">新建挂号</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* 患者选择 */}
                <Controller
                  name="patientId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="选择患者"
                      placeholder="请选择患者"
                      options={patientOptions}
                      error={errors.patientId?.message}
                      fullWidth
                      required
                      disabled={patientsLoading}
                    />
                  )}
                />

                {/* 科室选择 */}
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      onChange={(value) => {
                        field.onChange(value)
                      }}
                      label="选择科室"
                      placeholder="请选择科室"
                      options={departmentOptions}
                      error={errors.departmentId?.message}
                      fullWidth
                      required
                      disabled={departmentsLoading}
                    />
                  )}
                />

                {/* 医生选择 */}
                <Controller
                  name="doctorId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="选择医生"
                      placeholder="请先选择科室"
                      options={doctorOptions}
                      error={errors.doctorId?.message}
                      fullWidth
                      required
                      disabled={!watchDepartmentId}
                    />
                  )}
                />

                {/* 日期选择 */}
                <Controller
                  name="appointmentDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="挂号日期"
                      error={errors.appointmentDate?.message}
                      fullWidth
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  )}
                />

                {/* 时间段选择 */}
                <Controller
                  name="timeSlot"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="时间段"
                      placeholder="请选择时间段"
                      options={TIME_SLOTS}
                      error={errors.timeSlot?.message}
                      fullWidth
                      required
                    />
                  )}
                />

                {/* 优先级选择 */}
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="优先级"
                      placeholder="请选择优先级"
                      options={PRIORITY_OPTIONS}
                      error={errors.priority?.message}
                      fullWidth
                    />
                  )}
                />

                {/* 备注 */}
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      label="备注"
                      placeholder="请输入备注信息（选填）"
                      error={errors.notes?.message}
                      fullWidth
                      rows={3}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={createMutation.isPending}
                  icon={<Stethoscope className="w-4 h-4" />}
                >
                  确认挂号
                </Button>
              </form>
            </Card>
          </motion.div>

          {/* 今日挂号列表 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <Card>
              <h2 className="text-xl font-semibold text-gradient mb-6">今日挂号列表</h2>
              {appointmentsLoading ? (
                <div className="flex justify-center py-12">
                  <Loading size="lg" />
                </div>
              ) : appointmentsData?.data.length ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {appointmentsData.data.map((appointment) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'p-4 rounded-lg border transition-all duration-300',
                        'bg-background-secondary/50 border-border-primary',
                        'hover:border-primary-500/50 hover:shadow-neon-blue'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl font-bold text-gradient">
                              {appointment.appointmentNo}
                            </span>
                            {getStatusBadge(appointment.status)}
                            {getPriorityBadge(appointment.priority)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-text-secondary">
                              <User className="w-4 h-4" />
                              <span>{appointment.patient.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Stethoscope className="w-4 h-4" />
                              <span>{appointment.doctor.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(appointment.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Clock className="w-4 h-4" />
                              <span>{TIME_SLOTS.find(s => s.value === appointment.timeSlot)?.label}</span>
                            </div>
                          </div>
                          {appointment.queueNumber && (
                            <div className="mt-2 text-sm text-primary-400">
                              排队号：{appointment.queueNumber}
                            </div>
                          )}
                          {appointment.notes && (
                            <div className="mt-2 text-sm text-text-tertiary">
                              备注：{appointment.notes}
                            </div>
                          )}
                        </div>
                        {appointment.status === AppointmentStatus.PENDING && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate(appointment.id)}
                            loading={cancelMutation.isPending}
                            icon={<XCircle className="w-4 h-4" />}
                          >
                            取消
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-tertiary">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>今日暂无挂号记录</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>

      {/* 挂号成功Modal */}
      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="挂号成功"
      >
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="mb-6"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-success-500/10 border-2 border-success-500 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success-400" />
            </div>
          </motion.div>
          <h3 className="text-2xl font-bold text-gradient mb-4">挂号成功！</h3>
          {createdAppointment && (
            <div className="space-y-3 text-left bg-background-secondary/50 p-4 rounded-lg border border-border-primary">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">挂号号码：</span>
                <span className="text-xl font-bold text-primary-400">
                  {createdAppointment.appointmentNo}
                </span>
              </div>
              {createdAppointment.queueNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">排队号：</span>
                  <span className="text-xl font-bold text-secondary-400">
                    {createdAppointment.queueNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">患者姓名：</span>
                <span className="text-text-primary">{createdAppointment.patient.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">就诊科室：</span>
                <span className="text-text-primary">
                  {createdAppointment.department.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">就诊医生：</span>
                <span className="text-text-primary">{createdAppointment.doctor.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">就诊时间：</span>
                <span className="text-text-primary">
                  {formatDate(createdAppointment.appointmentDate)} {' '}
                  {TIME_SLOTS.find(s => s.value === createdAppointment.timeSlot)?.label}
                </span>
              </div>
            </div>
          )}
          <p className="text-text-secondary mt-4 text-sm">
            请凭挂号号码或排队号前往就诊
          </p>
          <Button
            variant="primary"
            onClick={() => setShowSuccessModal(false)}
            className="mt-6"
            fullWidth
          >
            知道了
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
