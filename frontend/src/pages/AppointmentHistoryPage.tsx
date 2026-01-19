/**
 * 挂号历史页面 - 历史记录查询
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { Calendar, User, Stethoscope, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { Table } from '@/components/ui/Table'
import {
  getAppointments,
  AppointmentStatus,
  AppointmentPriority,
  TimeSlot,
  type AppointmentSearchParams,
} from '@/api/appointment.api'
import { formatDate } from '@/utils/format'

// 科室选项
const DEPARTMENT_OPTIONS: SelectOption[] = [
  { value: '', label: '全部科室' },
  { value: 'internal', label: '内科' },
  { value: 'surgery', label: '外科' },
  { value: 'pediatrics', label: '儿科' },
  { value: 'gynecology', label: '妇产科' },
  { value: 'orthopedics', label: '骨科' },
  { value: 'dermatology', label: '皮肤科' },
  { value: 'ophthalmology', label: '眼科' },
  { value: 'ent', label: '耳鼻喉科' },
]

// 状态选项
const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: '全部状态' },
  { value: AppointmentStatus.PENDING, label: '待就诊' },
  { value: AppointmentStatus.CONFIRMED, label: '已确认' },
  { value: AppointmentStatus.COMPLETED, label: '已完成' },
  { value: AppointmentStatus.CANCELLED, label: '已取消' },
  { value: AppointmentStatus.MISSED, label: '未到诊' },
]

// 时间段映射（支持后端的3个基本时间段和前端的5个详细时间段）
const TIME_SLOT_LABELS: Record<string, string> = {
  // 前端5个详细时间段
  [TimeSlot.MORNING_EARLY]: '早上 08:00-10:00',
  [TimeSlot.MORNING_LATE]: '上午 10:00-12:00',
  [TimeSlot.AFTERNOON_EARLY]: '下午 14:00-16:00',
  [TimeSlot.AFTERNOON_LATE]: '傍晚 16:00-18:00',
  [TimeSlot.EVENING]: '晚上 18:00-20:00',
  // 后端3个基本时间段（API返回值，注意与前端EVENING重复，但值不同）
  'MORNING': '上午 08:00-12:00',
  'AFTERNOON': '下午 14:00-18:00',
  // 'EVENING' 已在上面定义，前后端共用
}

interface FilterFormData {
  department: string
  status: string
  startDate: string
  endDate: string
}

export function AppointmentHistoryPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AppointmentSearchParams>({})
  const limit = 10  // 改为limit，匹配后端

  // 表单管理
  const { control, handleSubmit, reset } = useForm<FilterFormData>({
    defaultValues: {
      department: '',
      status: '',
      startDate: '',
      endDate: '',
    },
  })

  // 获取挂号历史列表
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments-history', page, filters],
    queryFn: () => getAppointments({
      ...filters,
      page,
      limit,  // 改为limit
    }),
  })

  // 提交筛选
  const onSubmitFilter = (data: FilterFormData) => {
    const newFilters: AppointmentSearchParams = {}
    // 暂时移除科室筛选，因为需要departmentId而非department名称
    // if (data.department) newFilters.departmentId = data.department
    if (data.status) newFilters.status = data.status as AppointmentStatus
    if (data.startDate) newFilters.dateFrom = data.startDate  // 改为dateFrom
    if (data.endDate) newFilters.dateTo = data.endDate        // 改为dateTo

    setFilters(newFilters)
    setPage(1)
  }

  // 重置筛选
  const handleResetFilter = () => {
    reset()
    setFilters({})
    setPage(1)
  }

  // 导出PDF（模拟功能）
  const handleExportPDF = () => {
    // 实际应该调用后端API生成PDF
    window.print()
  }

  // 状态徽章
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

  // 优先级徽章
  const getPriorityBadge = (priority: AppointmentPriority) => {
    const variants: Record<AppointmentPriority, any> = {
      [AppointmentPriority.NORMAL]: { variant: 'info' as const, label: '普通' },
      [AppointmentPriority.URGENT]: { variant: 'warning' as const, label: '紧急' },
      [AppointmentPriority.EMERGENCY]: { variant: 'error' as const, label: '急诊' },
    }
    const config = variants[priority]
    return <Badge variant={config.variant} size="sm">{config.label}</Badge>
  }

  // 分页信息
  const totalPages = appointmentsData ? Math.ceil(appointmentsData.total / limit) : 0
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

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
            <h1 className="text-3xl font-bold text-gradient mb-2">挂号历史</h1>
            <p className="text-text-secondary">查看和管理历史挂号记录</p>
          </div>
          <Button
            variant="ghost"
            onClick={handleExportPDF}
            icon={<Download className="w-4 h-4" />}
          >
            导出PDF
          </Button>
        </motion.div>

        {/* 筛选器 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-gradient">筛选条件</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmitFilter)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 科室筛选 */}
                <Controller
                  name="department"
                  control={control}
                  render={({ field: { ref, ...field } }) => (
                    <Select
                      {...field}
                      label="科室"
                      placeholder="选择科室"
                      options={DEPARTMENT_OPTIONS}
                      fullWidth
                    />
                  )}
                />

                {/* 状态筛选 */}
                <Controller
                  name="status"
                  control={control}
                  render={({ field: { ref, ...field } }) => (
                    <Select
                      {...field}
                      label="状态"
                      placeholder="选择状态"
                      options={STATUS_OPTIONS}
                      fullWidth
                    />
                  )}
                />

                {/* 开始日期 */}
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="开始日期"
                      fullWidth
                    />
                  )}
                />

                {/* 结束日期 */}
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="结束日期"
                      fullWidth
                    />
                  )}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  icon={<Filter className="w-4 h-4" />}
                >
                  应用筛选
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetFilter}
                >
                  重置
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* 数据列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gradient">挂号记录</h2>
              {appointmentsData && (
                <span className="text-sm text-text-secondary">
                  共 {appointmentsData.total} 条记录
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : appointmentsData?.data.length ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4">挂号号码</th>
                        <th className="text-left py-3 px-4">患者姓名</th>
                        <th className="text-left py-3 px-4">科室</th>
                        <th className="text-left py-3 px-4">医生</th>
                        <th className="text-left py-3 px-4">就诊日期</th>
                        <th className="text-left py-3 px-4">时间段</th>
                        <th className="text-left py-3 px-4">优先级</th>
                        <th className="text-left py-3 px-4">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointmentsData.data.map((appointment) => (
                        <tr key={appointment.id} className="border-t border-border-primary hover:bg-background-secondary/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-primary-400">{appointment.appointmentNo}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-text-tertiary" />
                              <span>{appointment.patient.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{appointment.department.name}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 text-text-tertiary" />
                              <span>{appointment.doctor.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{formatDate(appointment.appointmentDate)}</td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-text-secondary">
                              {TIME_SLOT_LABELS[appointment.timeSlot as string] || appointment.timeSlot}
                            </span>
                          </td>
                          <td className="py-3 px-4">{getPriorityBadge(appointment.priority)}</td>
                          <td className="py-3 px-4">{getStatusBadge(appointment.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* 分页控件 */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-border-primary">
                  <div className="text-sm text-text-secondary">
                    第 {page} 页，共 {totalPages} 页
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!hasPreviousPage}
                      icon={<ChevronLeft className="w-4 h-4" />}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!hasNextPage}
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-text-tertiary">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无挂号记录</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
