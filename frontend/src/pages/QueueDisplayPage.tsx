/**
 * 叫号大屏显示 - 公开大屏展示
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Clock, Users, Activity } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getDepartmentQueue, QueueStatus } from '@/api/queue.api'

// 科室配置（轮播显示）
const DEPARTMENTS = [
  { value: 'internal', label: '内科' },
  { value: 'surgery', label: '外科' },
  { value: 'pediatrics', label: '儿科' },
  { value: 'gynecology', label: '妇产科' },
  { value: 'orthopedics', label: '骨科' },
]

export function QueueDisplayPage() {
  const [currentDeptIndex, setCurrentDeptIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const currentDept = DEPARTMENTS[currentDeptIndex]

  // 定时器：更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 定时器：切换科室（每30秒）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDeptIndex((prev) => (prev + 1) % DEPARTMENTS.length)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  // 获取当前科室的排队列表
  const { data: queueList } = useQuery({
    queryKey: ['department-queue-display', currentDept.value],
    queryFn: () => getDepartmentQueue(currentDept.value),
    refetchInterval: 3000, // 3秒刷新一次
  })

  // 当前呼叫的患者
  const callingPatient = queueList?.find(
    (q) => q.status === QueueStatus.CALLED || q.status === QueueStatus.IN_PROGRESS
  )

  // 候诊人数
  const waitingCount = queueList?.filter((q) => q.status === QueueStatus.WAITING).length || 0

  // 今日已完成
  const completedCount = queueList?.filter((q) => q.status === QueueStatus.COMPLETED).length || 0

  // 格式化时间
  const formatDisplayTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const formatDisplayDate = (date: Date) => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const weekday = weekdays[date.getDay()]
    return `${year}年${month}月${day}日 ${weekday}`
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* 顶部栏 */}
      <div className="h-24 bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 flex items-center justify-between px-12 shadow-neon-blue">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4"
        >
          <Activity className="w-12 h-12 text-white" />
          <div>
            <h1 className="text-3xl font-bold">AiliaoX 智能医疗系统</h1>
            <p className="text-sm opacity-90">排队叫号大屏</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-right"
        >
          <div className="text-4xl font-bold tabular-nums">{formatDisplayTime(currentTime)}</div>
          <div className="text-sm opacity-90">{formatDisplayDate(currentTime)}</div>
        </motion.div>
      </div>

      {/* 主内容区 */}
      <div className="p-12 space-y-8">
        {/* 科室标题 */}
        <motion.div
          key={currentDept.value}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <h2 className="text-6xl font-bold text-gradient mb-4">{currentDept.label}</h2>
          <div className="flex items-center justify-center gap-8 text-lg text-text-secondary">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-warning-400" />
              <span>候诊：<span className="text-2xl font-bold text-warning-400">{waitingCount}</span> 人</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-success-400" />
              <span>已完成：<span className="text-2xl font-bold text-success-400">{completedCount}</span> 人</span>
            </div>
          </div>
        </motion.div>

        {/* 当前叫号 */}
        <AnimatePresence mode="wait">
          {callingPatient ? (
            <motion.div
              key={callingPatient.id}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -50 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className={cn(
                'relative p-16 rounded-3xl overflow-hidden',
                'bg-gradient-to-br from-primary-500/20 via-secondary-500/20 to-primary-500/20',
                'border-4 border-primary-500',
                'shadow-2xl shadow-primary-500/50'
              )}
            >
              {/* 动画背景 */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/20 to-primary-500/0"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              />

              <div className="relative z-10 text-center">
                {/* 图标 */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mb-8"
                >
                  <Phone className="w-32 h-32 mx-auto text-primary-400" />
                </motion.div>

                {/* 请字 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <span className="text-6xl font-bold text-gradient">请</span>
                </motion.div>

                {/* 排队号 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6"
                >
                  <div className="text-[120px] font-bold leading-none">
                    <span className="text-gradient animate-pulse">{callingPatient.queueNumber}</span>
                  </div>
                </motion.div>

                {/* 患者姓名 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-4"
                >
                  <span className="text-5xl font-semibold text-white">
                    {callingPatient.patientName}
                  </span>
                </motion.div>

                {/* 号字 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-8"
                >
                  <span className="text-6xl font-bold text-gradient">号</span>
                </motion.div>

                {/* 就诊信息 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-3xl text-text-secondary"
                >
                  <p>请到 <span className="text-primary-400 font-bold">{callingPatient.doctorName}</span> 处就诊</p>
                </motion.div>
              </div>

              {/* 边框动画 */}
              <motion.div
                className="absolute inset-0 border-4 border-secondary-500 rounded-3xl"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-32"
            >
              <Phone className="w-48 h-48 mx-auto mb-8 text-text-tertiary opacity-30" />
              <p className="text-5xl font-bold text-text-tertiary">暂无叫号</p>
              <p className="text-2xl text-text-tertiary mt-4">请耐心等待</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 科室切换指示器 */}
        <div className="flex justify-center items-center gap-3 mt-12">
          {DEPARTMENTS.map((dept, index) => (
            <motion.div
              key={dept.value}
              className={cn(
                'w-4 h-4 rounded-full transition-all duration-300',
                index === currentDeptIndex
                  ? 'bg-primary-500 w-12'
                  : 'bg-text-tertiary/30'
              )}
              animate={index === currentDeptIndex ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ))}
        </div>
      </div>

      {/* 底部信息栏 */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-r from-background-secondary/90 to-background-primary/90 backdrop-blur-lg border-t border-border-primary flex items-center justify-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl text-text-secondary"
        >
          自动切换科室中 · 每 30 秒轮换一次
        </motion.p>
      </div>
    </div>
  )
}
