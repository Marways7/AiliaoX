/**
 * DashboardPage - 统计Dashboard页面
 * 里程碑7：智能统计报表与系统公告
 */
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users,
  Calendar,
  Pill,
  FileText,
  UserCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/utils/cn'
import {
  getDashboardStatistics,
  getAppointmentStatistics,
  getPrescriptionStatistics,
  getPatientStatistics,
  StatisticsTimeRange,
} from '@/api/statistics.api'
import { formatCurrency } from '@/utils/format'

// 霓虹配色
const NEON_COLORS = {
  blue: '#1890FF',
  purple: '#722ED1',
  cyan: '#13C2C2',
  green: '#52C41A',
  orange: '#FAAD14',
  red: '#F5222D',
}

// 图表配色数组
const CHART_COLORS = [
  NEON_COLORS.blue,
  NEON_COLORS.purple,
  NEON_COLORS.cyan,
  NEON_COLORS.green,
  NEON_COLORS.orange,
]

/**
 * 统计卡片组件
 */
interface StatCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  trend?: number
  trendLabel?: string
  color: 'blue' | 'purple' | 'cyan' | 'green' | 'orange' | 'red'
  delay?: number
}

const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color, delay = 0 }: StatCardProps) => {
  const colorClasses = {
    blue: 'text-primary-400 bg-primary-500/10',
    purple: 'text-secondary-400 bg-secondary-500/10',
    cyan: 'text-accent-400 bg-accent-500/10',
    green: 'text-success-400 bg-success-500/10',
    orange: 'text-warning-400 bg-warning-500/10',
    red: 'text-error-400 bg-error-500/10',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card variant="glass" hover className="group cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-text-secondary mb-2">{title}</p>
            <div className="flex items-end gap-3">
              <motion.h2
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: delay + 0.2, type: 'spring' }}
                className="text-3xl font-bold text-text-primary"
              >
                {value}
              </motion.h2>
              {trend !== undefined && (
                <div className="flex items-center gap-1 mb-1">
                  {trend > 0 ? (
                    <TrendingUp className="w-4 h-4 text-success-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-error-400" />
                  )}
                  <span className={cn('text-xs font-medium', trend > 0 ? 'text-success-400' : 'text-error-400')}>
                    {Math.abs(trend)}%
                  </span>
                </div>
              )}
            </div>
            {trendLabel && <p className="text-xs text-text-tertiary mt-1">{trendLabel}</p>}
          </div>
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-neon-blue',
              colorClasses[color]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/**
 * Dashboard主页面
 */
export const DashboardPage = () => {
  const refreshInterval = 30000 // 30秒自动刷新

  // 获取Dashboard综合统计
  const { data: dashboardStats, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard-statistics'],
    queryFn: getDashboardStatistics,
    refetchInterval: refreshInterval,
  })

  // 获取挂号统计（最近7天趋势）
  const { data: appointmentStats, isLoading: isAppointmentLoading } = useQuery({
    queryKey: ['appointment-statistics', StatisticsTimeRange.WEEK],
    queryFn: () => getAppointmentStatistics({ timeRange: StatisticsTimeRange.WEEK }),
    refetchInterval: refreshInterval,
  })

  // 获取处方统计（月度收入趋势）
  const { data: prescriptionStats, isLoading: isPrescriptionLoading } = useQuery({
    queryKey: ['prescription-statistics', StatisticsTimeRange.MONTH],
    queryFn: () => getPrescriptionStatistics({ timeRange: StatisticsTimeRange.MONTH }),
    refetchInterval: refreshInterval,
  })

  // 获取患者统计（年龄分布）
  const { data: patientStats, isLoading: isPatientLoading } = useQuery({
    queryKey: ['patient-statistics'],
    queryFn: () => getPatientStatistics(),
    refetchInterval: refreshInterval,
  })

  const isLoading = isDashboardLoading || isAppointmentLoading || isPrescriptionLoading || isPatientLoading

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loading size="lg" variant="dots" text="加载统计数据中..." />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gradient mb-2">数据统计 Dashboard</h1>
            <p className="text-text-secondary">实时数据监控与分析</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Activity className="w-4 h-4 animate-neon-pulse text-success-400" />
            <span>自动刷新: 30秒</span>
          </div>
        </motion.div>

        {/* 6大统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 患者统计 */}
          <StatCard
            title="患者总数"
            value={dashboardStats?.patients.total || 0}
            icon={Users}
            trend={dashboardStats?.patients.newThisWeek ? 10 : 0}
            trendLabel={`本周新增 ${dashboardStats?.patients.newThisWeek || 0} 人`}
            color="blue"
            delay={0}
          />

          {/* 挂号统计 */}
          <StatCard
            title="今日挂号"
            value={dashboardStats?.appointments.todayCount || 0}
            icon={Calendar}
            trend={5}
            trendLabel={`待处理 ${dashboardStats?.appointments.pendingCount || 0} 个`}
            color="purple"
            delay={0.1}
          />

          {/* 处方统计 */}
          <StatCard
            title="处方总收入"
            value={formatCurrency(dashboardStats?.prescriptions.totalRevenue || 0)}
            icon={Pill}
            trend={8}
            trendLabel={`今日 ${dashboardStats?.prescriptions.todayCount || 0} 张处方`}
            color="cyan"
            delay={0.2}
          />

          {/* 病历统计 */}
          <StatCard
            title="病历总数"
            value={dashboardStats?.medicalRecords.total || 0}
            icon={FileText}
            trend={3}
            trendLabel={`AI辅助 ${dashboardStats?.medicalRecords.withAICount || 0} 份`}
            color="green"
            delay={0.3}
          />

          {/* 医生统计 */}
          <StatCard
            title="医生总数"
            value={dashboardStats?.doctors.total || 0}
            icon={UserCheck}
            trendLabel={`今日在岗 ${dashboardStats?.doctors.activeToday || 0} 人`}
            color="orange"
            delay={0.4}
          />

          {/* 排队统计 */}
          <StatCard
            title="等待人数"
            value={dashboardStats?.queue.waitingCount || 0}
            icon={Clock}
            trendLabel={`平均等待 ${dashboardStats?.queue.averageWaitTime || 0} 分钟`}
            color="red"
            delay={0.5}
          />
        </div>

        {/* 数据可视化图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 挂号趋势图 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card variant="glass" padding="lg">
              <CardHeader title="挂号趋势" description="最近7天挂号数量" />
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={appointmentStats?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="date" stroke="#8C8C8C" style={{ fontSize: 12 }} />
                    <YAxis stroke="#8C8C8C" style={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E2139',
                        border: '1px solid rgba(64, 169, 255, 0.2)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ color: '#8C8C8C', fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="挂号数量"
                      stroke={NEON_COLORS.blue}
                      strokeWidth={2}
                      dot={{ fill: NEON_COLORS.blue, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </motion.div>

          {/* 处方收入图 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card variant="glass" padding="lg">
              <CardHeader title="处方收入" description="最近6个月收入趋势" />
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prescriptionStats?.monthlyRevenueTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" stroke="#8C8C8C" style={{ fontSize: 12 }} />
                    <YAxis stroke="#8C8C8C" style={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E2139',
                        border: '1px solid rgba(114, 46, 209, 0.2)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ color: '#8C8C8C', fontSize: 12 }} />
                    <Bar dataKey="revenue" name="收入金额" fill={NEON_COLORS.purple} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </motion.div>

          {/* 患者年龄分布 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card variant="glass" padding="lg">
              <CardHeader title="患者年龄分布" description="按年龄段统计" />
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={patientStats?.ageDistribution || []}
                      dataKey="count"
                      nameKey="ageGroup"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.ageGroup}: ${entry.count}`}
                      labelLine={{ stroke: '#8C8C8C' }}
                    >
                      {(patientStats?.ageDistribution || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E2139',
                        border: '1px solid rgba(19, 194, 194, 0.2)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ color: '#8C8C8C', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </motion.div>

          {/* 科室挂号排行 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Card variant="glass" padding="lg">
              <CardHeader title="挂号时段分布" description="按时段统计挂号量" />
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={appointmentStats?.byTimeSlot || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis type="number" stroke="#8C8C8C" style={{ fontSize: 12 }} />
                    <YAxis dataKey="timeSlot" type="category" stroke="#8C8C8C" style={{ fontSize: 12 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E2139',
                        border: '1px solid rgba(82, 196, 26, 0.2)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ color: '#8C8C8C', fontSize: 12 }} />
                    <Bar dataKey="count" name="挂号数量" fill={NEON_COLORS.green} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
