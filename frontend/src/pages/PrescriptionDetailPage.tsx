/**
 * 处方详情页面
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { AIReviewResult } from '@/components/prescription/AIReviewResult'
import {
  getPrescriptionById,
  approvePrescription,
  dispensePrescription,
  cancelPrescription,
  PrescriptionStatus,
} from '@/api/prescription.api'
import {
  FileText,
  User,
  Calendar,
  Stethoscope,
  Pill,
  CheckCircle,
  XCircle,
  Edit,
  Printer,
  ArrowLeft,
} from 'lucide-react'
import { formatDate } from '@/utils/format'

export function PrescriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cancelReason, setCancelReason] = useState('')

  // 获取处方详情
  const { data: prescription, isLoading } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => getPrescriptionById(id!),
    enabled: !!id,
  })

  // 审批处方
  const approveMutation = useMutation({
    mutationFn: () => approvePrescription(id!),
    onSuccess: () => {
      toast.success('处方审批成功')
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
    },
    onError: () => {
      toast.error('审批失败')
    },
  })

  // 发药
  const dispenseMutation = useMutation({
    mutationFn: () => dispensePrescription(id!),
    onSuccess: () => {
      toast.success('发药成功')
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
    },
    onError: () => {
      toast.error('发药失败')
    },
  })

  // 取消处方
  const cancelMutation = useMutation({
    mutationFn: () => cancelPrescription(id!, cancelReason),
    onSuccess: () => {
      toast.success('处方已取消')
      queryClient.invalidateQueries({ queryKey: ['prescription', id] })
    },
    onError: () => {
      toast.error('取消失败')
    },
  })

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

  // 打印处方
  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载处方详情..." />
        </div>
      </DashboardLayout>
    )
  }

  if (!prescription) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-text-secondary">处方不存在</p>
          <Button
            variant="outline"
            onClick={() => navigate('/prescriptions')}
            className="mt-4"
          >
            返回列表
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/prescriptions')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gradient">处方详情</h1>
              <p className="text-text-secondary mt-2">{prescription.prescriptionNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {prescription.status === PrescriptionStatus.DRAFT && (
              <Button
                variant="outline"
                onClick={() => navigate(`/prescriptions/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
            )}
            {prescription.status === PrescriptionStatus.PENDING && (
              <Button
                variant="neon"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                审核通过
              </Button>
            )}
            {prescription.status === PrescriptionStatus.APPROVED && (
              <Button
                variant="neon"
                onClick={() => dispenseMutation.mutate()}
                disabled={dispenseMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                确认发药
              </Button>
            )}
            {(prescription.status === PrescriptionStatus.DRAFT ||
              prescription.status === PrescriptionStatus.PENDING) && (
              <Button
                variant="outline"
                onClick={() => {
                  const reason = prompt('请输入取消原因：')
                  if (reason) {
                    setCancelReason(reason)
                    cancelMutation.mutate()
                  }
                }}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                取消处方
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              打印
            </Button>
          </div>
        </div>

        {/* 处方状态 */}
        <Card className="card-neon p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
              <FileText className="h-8 w-8 text-neon-blue" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-text-primary">
                  {prescription.prescriptionNumber}
                </h2>
                {getStatusBadge(prescription.status)}
              </div>
              <p className="text-sm text-text-secondary mt-1">
                创建时间: {formatDate(prescription.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-secondary">处方总金额</p>
              <p className="text-3xl font-bold text-neon-cyan mt-1">
                ¥{prescription.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* 患者信息 */}
        <Card className="card-neon p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-neon-blue" />
            <h3 className="text-lg font-semibold text-gradient">患者信息</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-text-secondary">姓名</p>
              <p className="text-text-primary font-medium mt-1">
                {prescription.patientName || prescription.patientId}
              </p>
            </div>
          </div>
        </Card>

        {/* 医生信息 */}
        <Card className="card-neon p-6">
          <div className="flex items-center gap-3 mb-4">
            <Stethoscope className="h-5 w-5 text-neon-blue" />
            <h3 className="text-lg font-semibold text-gradient">医生信息</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-text-secondary">医生</p>
              <p className="text-text-primary font-medium mt-1">
                {prescription.doctorName || prescription.doctorId}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">科室</p>
              <p className="text-text-primary font-medium mt-1">{prescription.department}</p>
            </div>
          </div>
        </Card>

        {/* 诊断信息 */}
        <Card className="card-neon p-6">
          <div className="flex items-center gap-3 mb-4">
            <Stethoscope className="h-5 w-5 text-neon-blue" />
            <h3 className="text-lg font-semibold text-gradient">诊断信息</h3>
          </div>
          <p className="text-text-primary">{prescription.diagnosis}</p>
        </Card>

        {/* 处方药品 */}
        <Card className="card-neon p-6">
          <div className="flex items-center gap-3 mb-4">
            <Pill className="h-5 w-5 text-neon-blue" />
            <h3 className="text-lg font-semibold text-gradient">处方药品</h3>
          </div>
          <div className="space-y-3">
            {prescription.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-background-secondary border border-white/10 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-medium text-text-primary">
                        {index + 1}. {item.medicineName}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-text-secondary">剂量: </span>
                        <span className="text-text-primary font-medium">{item.dosage}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">频次: </span>
                        <span className="text-text-primary font-medium">{item.frequency}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">疗程: </span>
                        <span className="text-text-primary font-medium">{item.duration}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">数量: </span>
                        <span className="text-text-primary font-medium">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                    {item.notes && (
                      <div className="mt-2 text-sm">
                        <span className="text-text-secondary">备注: </span>
                        <span className="text-text-primary">{item.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm text-text-secondary">小计</p>
                    <p className="text-lg font-bold text-neon-cyan">
                      ¥{item.totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 总金额 */}
          <div className="mt-4 p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-text-primary">处方总金额</span>
              <span className="text-2xl font-bold text-neon-cyan">
                ¥{prescription.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        {/* AI审查结果 */}
        {prescription.aiReview && <AIReviewResult result={prescription.aiReview} />}

        {/* 备注信息 */}
        {prescription.notes && (
          <Card className="card-neon p-6">
            <h3 className="text-lg font-semibold text-gradient mb-4">备注信息</h3>
            <p className="text-text-primary">{prescription.notes}</p>
          </Card>
        )}

        {/* 处方流转历史 */}
        <Card className="card-neon p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-neon-blue" />
            <h3 className="text-lg font-semibold text-gradient">处方流转历史</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-neon-blue" />
              <div className="flex-1">
                <p className="text-text-primary font-medium">处方创建</p>
                <p className="text-sm text-text-secondary">{formatDate(prescription.createdAt)}</p>
              </div>
            </div>
            {prescription.approvedAt && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-text-primary font-medium">
                    处方审核通过 {prescription.approvedBy && `(${prescription.approvedBy})`}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {formatDate(prescription.approvedAt)}
                  </p>
                </div>
              </div>
            )}
            {prescription.dispensedAt && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-neon-cyan" />
                <div className="flex-1">
                  <p className="text-text-primary font-medium">
                    药品已发放 {prescription.dispensedBy && `(${prescription.dispensedBy})`}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {formatDate(prescription.dispensedAt)}
                  </p>
                </div>
              </div>
            )}
            {prescription.status === PrescriptionStatus.CANCELLED && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-red-500" />
                <div className="flex-1">
                  <p className="text-text-primary font-medium">处方已取消</p>
                  <p className="text-sm text-text-secondary">{formatDate(prescription.updatedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
