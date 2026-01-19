/**
 * 处方管理页面
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { NativeSelect } from '@/components/ui/NativeSelect'
import {
  getPrescriptions,
  getPrescriptionStatistics,
  type PrescriptionSearchParams,
  PrescriptionStatus,
} from '@/api/prescription.api'
import { FileText, AlertCircle, CheckCircle, Plus, Eye } from 'lucide-react'
import { formatDate } from '@/utils/format'

export function PrescriptionListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useState<PrescriptionSearchParams>({
    page: 1,
    pageSize: 20,
  })

  // 获取处方列表
  const { data: prescriptionsData, isLoading } = useQuery({
    queryKey: ['prescriptions', searchParams],
    queryFn: () => getPrescriptions(searchParams),
  })

  // 获取统计信息
  const { data: statistics } = useQuery({
    queryKey: ['prescription-statistics'],
    queryFn: () => getPrescriptionStatistics(),
  })

  // 处理状态筛选
  const handleStatusFilter = (status: string) => {
    setSearchParams(prev => ({
      ...prev,
      status: status ? (status as PrescriptionStatus) : undefined,
      page: 1,
    }))
  }

  // 查看处方详情
  const handleView = (id: string) => {
    navigate(`/prescriptions/${id}`)
  }

  // 创建新处方
  const handleCreate = () => {
    navigate('/prescriptions/new')
  }

  // 获取状态标签
  const getStatusBadge = (status: PrescriptionStatus) => {
    const statusConfig = {
      [PrescriptionStatus.DRAFT]: { variant: 'default' as const, label: '草稿' },
      [PrescriptionStatus.PENDING]: { variant: 'warning' as const, label: '待审核' },
      [PrescriptionStatus.APPROVED]: { variant: 'success' as const, label: '已审核' },
      [PrescriptionStatus.DISPENSED]: { variant: 'info' as const, label: '已发药' },
      [PrescriptionStatus.CANCELLED]: { variant: 'error' as const, label: '已取消' },
    }
    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 获取风险等级标签
  const getRiskBadge = (risk?: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (!risk) return null
    const riskConfig = {
      LOW: { variant: 'success' as const, label: '低风险' },
      MEDIUM: { variant: 'warning' as const, label: '中风险' },
      HIGH: { variant: 'error' as const, label: '高风险' },
    }
    const config = riskConfig[risk]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载处方数据..." />
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
            <h1 className="text-3xl font-bold text-gradient">处方管理</h1>
            <p className="text-text-secondary mt-2">管理患者处方和用药信息</p>
          </div>
          <Button onClick={handleCreate} variant="neon" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            新建处方
          </Button>
        </div>

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">总处方数</p>
                    <p className="text-3xl font-bold text-gradient mt-2">
                      {statistics.totalCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                    <FileText className="h-8 w-8 text-neon-blue" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">待审核</p>
                    <p className="text-3xl font-bold text-orange-500 mt-2">
                      {statistics.pendingCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">已发药</p>
                    <p className="text-3xl font-bold text-neon-cyan mt-2">
                      {statistics.dispensedCount}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                    <CheckCircle className="h-8 w-8 text-neon-cyan" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">总金额</p>
                    <p className="text-3xl font-bold text-gradient mt-2">
                      ¥{statistics.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neon-purple/10 border border-neon-purple/30">
                    <FileText className="h-8 w-8 text-neon-purple" />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        {/* 筛选 */}
        <Card className="card-neon p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48">
              <NativeSelect
                value={searchParams.status || ''}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full"
              >
                <option value="">全部状态</option>
                <option value={PrescriptionStatus.DRAFT}>草稿</option>
                <option value={PrescriptionStatus.PENDING}>待审核</option>
                <option value={PrescriptionStatus.APPROVED}>已审核</option>
                <option value={PrescriptionStatus.DISPENSED}>已发药</option>
                <option value={PrescriptionStatus.CANCELLED}>已取消</option>
              </NativeSelect>
            </div>
          </div>
        </Card>

        {/* 处方列表 */}
        <div className="space-y-4">
          {prescriptionsData?.data && prescriptionsData.data.length > 0 ? (
            prescriptionsData.data.map((prescription) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="card-neon p-6 hover:border-neon-blue/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* 处方编号和状态 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-bold text-gradient">
                          {prescription.prescriptionNumber}
                        </h3>
                        {getStatusBadge(prescription.status)}
                        {prescription.aiReview && getRiskBadge(prescription.aiReview.overallRisk)}
                      </div>

                      {/* 患者和医生信息 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-text-secondary">患者：</span>
                          <span className="text-text-primary font-medium ml-2">
                            {prescription.patientName || prescription.patientId}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary">医生：</span>
                          <span className="text-text-primary font-medium ml-2">
                            {prescription.doctorName || prescription.doctorId}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary">科室：</span>
                          <span className="text-text-primary font-medium ml-2">
                            {prescription.department}
                          </span>
                        </div>
                      </div>

                      {/* 诊断 */}
                      <div className="text-sm">
                        <span className="text-text-secondary">诊断：</span>
                        <span className="text-text-primary ml-2">{prescription.diagnosis}</span>
                      </div>

                      {/* 药品数量和金额 */}
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-text-secondary">药品数量：</span>
                          <span className="text-neon-cyan font-medium ml-2">
                            {prescription.items.length} 种
                          </span>
                        </div>
                        <div>
                          <span className="text-text-secondary">总金额：</span>
                          <span className="text-neon-cyan font-medium ml-2">
                            ¥{prescription.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* AI审查警告 */}
                      {prescription.aiReview && prescription.aiReview.warnings.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-500 mb-1">AI审查警告</p>
                              <ul className="text-sm text-text-secondary space-y-1">
                                {prescription.aiReview.warnings.slice(0, 2).map((warning, idx) => (
                                  <li key={idx}>• {warning}</li>
                                ))}
                                {prescription.aiReview.warnings.length > 2 && (
                                  <li className="text-neon-blue">
                                    +{prescription.aiReview.warnings.length - 2} 更多警告
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 时间信息 */}
                      <div className="text-xs text-text-secondary">
                        创建时间: {formatDate(prescription.createdAt)}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(prescription.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        查看
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="card-neon p-12 text-center">
              <FileText className="h-16 w-16 text-text-secondary mx-auto mb-4 opacity-50" />
              <p className="text-text-secondary">暂无处方数据</p>
            </Card>
          )}
        </div>

        {/* 分页 */}
        {prescriptionsData && prescriptionsData.total > 0 && (
          <Card className="card-neon p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                共 {prescriptionsData.total} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={searchParams.page === 1}
                  onClick={() =>
                    setSearchParams(prev => ({ ...prev, page: (prev.page || 1) - 1 }))
                  }
                >
                  上一页
                </Button>
                <div className="flex items-center px-4 text-sm text-text-secondary">
                  第 {searchParams.page} / {Math.ceil(prescriptionsData.total / (searchParams.pageSize || 20))} 页
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    (searchParams.page || 1) >=
                    Math.ceil(prescriptionsData.total / (searchParams.pageSize || 20))
                  }
                  onClick={() =>
                    setSearchParams(prev => ({ ...prev, page: (prev.page || 1) + 1 }))
                  }
                >
                  下一页
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
