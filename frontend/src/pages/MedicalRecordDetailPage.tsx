/**
 * 病历详情页面 - 里程碑6
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Edit,
  Archive,
  Trash2,
  FileDown,
  Sparkles,
  Clock,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'

import {
  getMedicalRecordById,
  archiveMedicalRecord,
  deleteMedicalRecord,
  exportMedicalRecordToPDF,
  generateRecordSummary,
  getDiagnosisSuggestions,
  getMedicalRecordVersions,
  MedicalRecordStatus
} from '@/api/medical-record.api'
import { formatDate } from '@/utils/format'

const tabs = [
  { id: 'detail', label: '病历详情' },
  { id: 'ai', label: 'AI分析' },
  { id: 'versions', label: '版本历史' },
]

const statusBadgeMap: Record<MedicalRecordStatus, { variant: 'gray' | 'success' | 'blue'; label: string }> = {
  [MedicalRecordStatus.DRAFT]: { variant: 'gray', label: '草稿' },
  [MedicalRecordStatus.COMPLETED]: { variant: 'success', label: '已完成' },
  [MedicalRecordStatus.ARCHIVED]: { variant: 'blue', label: '已归档' },
}

export function MedicalRecordDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [currentTab, setCurrentTab] = useState('detail')
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [aiDiagnosis, setAiDiagnosis] = useState<{
    primaryDiagnosis: string[]
    differentialDiagnosis: string[]
    recommendedTests: string[]
    reasoning: string
  } | null>(null)

  // 获取病历详情
  const { data: record, isLoading } = useQuery({
    queryKey: ['medical-record', id],
    queryFn: () => getMedicalRecordById(id!),
    enabled: !!id,
  })

  // 获取版本历史
  const { data: versions } = useQuery({
    queryKey: ['medical-record-versions', id],
    queryFn: () => getMedicalRecordVersions(id!),
    enabled: !!id && currentTab === 'versions',
  })

  // 归档病历
  const archiveMutation = useMutation({
    mutationFn: () => archiveMedicalRecord(id!),
    onSuccess: () => {
      toast.success('病历归档成功')
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      queryClient.invalidateQueries({ queryKey: ['medical-record', id] })
    },
    onError: () => {
      toast.error('病历归档失败')
    },
  })

  // 删除病历
  const deleteMutation = useMutation({
    mutationFn: () => deleteMedicalRecord(id!),
    onSuccess: () => {
      toast.success('病历删除成功')
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      navigate('/medical-records')
    },
    onError: () => {
      toast.error('病历删除失败')
    },
  })

  // 导出PDF
  const handleExportPDF = async () => {
    if (!record) return
    try {
      const blob = await exportMedicalRecordToPDF(id!)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `病历-${record.recordNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('病历导出成功')
    } catch (error) {
      toast.error('病历导出失败')
    }
  }

  // 生成AI摘要
  const handleGenerateSummary = async () => {
    setLoadingAI(true)
    try {
      const result = await generateRecordSummary(id!)
      setAiSummary(result.summary)
      toast.success('AI摘要生成成功')
    } catch (error) {
      toast.error('AI摘要生成失败')
    } finally {
      setLoadingAI(false)
    }
  }

  // 获取诊断建议
  const handleGetDiagnosisSuggestions = async () => {
    setLoadingAI(true)
    try {
      const result = await getDiagnosisSuggestions(id!)
      setAiDiagnosis(result)
      toast.success('诊断建议获取成功')
    } catch (error) {
      toast.error('诊断建议获取失败')
    } finally {
      setLoadingAI(false)
    }
  }

  // 删除确认
  const handleDelete = () => {
    if (window.confirm('确定要删除这条病历吗？此操作不可恢复！')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loading size="lg" text="加载病历详情..." />
        </div>
      </DashboardLayout>
    )
  }

  if (!record) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-text-secondary">病历不存在</p>
          <Button onClick={() => navigate('/medical-records')} className="mt-4">
            返回列表
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const statusConfig = statusBadgeMap[record.status]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/medical-records')}
            icon={<ArrowLeft className="w-5 h-5" />}
            className="mb-4"
          >
            返回列表
          </Button>

          {/* 病历头部信息卡片 */}
          <Card variant="glass" padding="lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-2xl font-bold text-text-primary">
                    病历编号: {record.recordNumber}
                  </h1>
                  <Badge variant={statusConfig.variant} size="lg">
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-text-tertiary">患者姓名</span>
                    <p className="text-text-primary font-medium mt-1">{record.patientName}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">科室</span>
                    <p className="text-text-primary font-medium mt-1">{record.department}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">医生</span>
                    <p className="text-text-primary font-medium mt-1">{record.doctorName}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">就诊日期</span>
                    <p className="text-text-primary font-medium mt-1">{formatDate(record.visitDate)}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">创建时间</span>
                    <p className="text-text-primary font-medium mt-1">{formatDate(record.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">更新时间</span>
                    <p className="text-text-primary font-medium mt-1">{formatDate(record.updatedAt)}</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">版本号</span>
                    <p className="text-text-primary font-medium mt-1">V{record.version}</p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col gap-2 ml-6">
                {record.status === MedicalRecordStatus.DRAFT && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/medical-records/${id}/edit`)}
                    icon={<Edit className="w-4 h-4" />}
                  >
                    编辑
                  </Button>
                )}
                {record.status === MedicalRecordStatus.COMPLETED && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => archiveMutation.mutate()}
                    loading={archiveMutation.isPending}
                    icon={<Archive className="w-4 h-4" />}
                  >
                    归档
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportPDF}
                  icon={<FileDown className="w-4 h-4" />}
                >
                  导出PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  loading={deleteMutation.isPending}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  删除
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tab导航 */}
        <div className="flex border-b border-border-subtle">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                currentTab === tab.id
                  ? 'text-primary-400'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              {currentTab === tab.id && (
                <motion.div
                  layoutId="activeTabDetail"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab内容 */}
        <div className="space-y-6">
          {/* Tab 1: 病历详情 */}
          {currentTab === 'detail' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* 主诉和现病史 */}
              <Card variant="glass" padding="lg">
                <CardHeader title="主诉和现病史" />
                <CardBody className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-2">主诉</h4>
                    <p className="text-text-secondary whitespace-pre-wrap">{record.chiefComplaint}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-2">现病史</h4>
                    <p className="text-text-secondary whitespace-pre-wrap">{record.presentIllness}</p>
                  </div>
                </CardBody>
              </Card>

              {/* 病史 */}
              <Card variant="glass" padding="lg">
                <CardHeader title="病史" />
                <CardBody className="space-y-4">
                  {record.pastHistory && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">既往史</h4>
                      <p className="text-text-secondary whitespace-pre-wrap">{record.pastHistory}</p>
                    </div>
                  )}
                  {record.allergyHistory && (
                    <div>
                      <h4 className="text-sm font-semibold text-warning-400 mb-2">过敏史</h4>
                      <p className="text-text-secondary whitespace-pre-wrap">{record.allergyHistory}</p>
                    </div>
                  )}
                  {record.familyHistory && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">家族史</h4>
                      <p className="text-text-secondary whitespace-pre-wrap">{record.familyHistory}</p>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* 检查 */}
              <Card variant="glass" padding="lg">
                <CardHeader title="检查" />
                <CardBody className="space-y-4">
                  {record.physicalExamination && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">体格检查</h4>
                      <p className="text-text-secondary whitespace-pre-wrap">{record.physicalExamination}</p>
                    </div>
                  )}
                  {record.auxiliaryExamination && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">辅助检查</h4>
                      <p className="text-text-secondary whitespace-pre-wrap">{record.auxiliaryExamination}</p>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* 诊断和治疗 */}
              <Card variant="glass" padding="lg">
                <CardHeader title="诊断和治疗" />
                <CardBody className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-2">诊断</h4>
                    <p className="text-text-secondary whitespace-pre-wrap">{record.diagnosis}</p>
                  </div>
                  {record.differentialDiagnosis && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">鉴别诊断</h4>
                      <p className="text-text-secondary whitespace-pre-wrap">{record.differentialDiagnosis}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary mb-2">治疗方案</h4>
                    <p className="text-text-secondary whitespace-pre-wrap">{record.treatmentPlan}</p>
                  </div>
                  {record.notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">备注</h4>
                      <p className="text-text-secondary whitespace-pre-wrap">{record.notes}</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          )}

          {/* Tab 2: AI分析 */}
          {currentTab === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* AI操作按钮 */}
              <Card variant="neon-purple" padding="lg">
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={handleGenerateSummary}
                    loading={loadingAI}
                    icon={<Sparkles className="w-5 h-5" />}
                  >
                    生成智能摘要
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleGetDiagnosisSuggestions}
                    loading={loadingAI}
                    icon={<Activity className="w-5 h-5" />}
                  >
                    获取诊断建议
                  </Button>
                </div>
              </Card>

              {/* 原有AI摘要和建议 */}
              {(record.aiSummary || record.aiSuggestions) && (
                <Card variant="glass" padding="lg">
                  <CardHeader title="原有AI分析" />
                  <CardBody className="space-y-4">
                    {record.aiSummary && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2">AI摘要</h4>
                        <p className="text-text-secondary whitespace-pre-wrap">{record.aiSummary}</p>
                      </div>
                    )}
                    {record.aiSuggestions && record.aiSuggestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2">AI建议</h4>
                        <ul className="space-y-2">
                          {record.aiSuggestions.map((suggestion, index) => (
                            <li key={index} className="text-text-secondary flex items-start">
                              <span className="text-primary-400 mr-2">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* 新生成的AI摘要 */}
              {aiSummary && (
                <Card variant="glass" padding="lg">
                  <CardHeader title="AI智能摘要" />
                  <CardBody>
                    <p className="text-text-secondary whitespace-pre-wrap">{aiSummary}</p>
                  </CardBody>
                </Card>
              )}

              {/* 诊断建议 */}
              {aiDiagnosis && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {aiDiagnosis.primaryDiagnosis.length > 0 && (
                    <Card variant="glass" padding="lg">
                      <CardHeader title="初步诊断" />
                      <CardBody>
                        <ul className="space-y-2">
                          {aiDiagnosis.primaryDiagnosis.map((d, i) => (
                            <li key={i} className="text-text-secondary flex items-start">
                              <span className="text-primary-400 mr-2">•</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      </CardBody>
                    </Card>
                  )}

                  {aiDiagnosis.differentialDiagnosis.length > 0 && (
                    <Card variant="glass" padding="lg">
                      <CardHeader title="鉴别诊断" />
                      <CardBody>
                        <ul className="space-y-2">
                          {aiDiagnosis.differentialDiagnosis.map((d, i) => (
                            <li key={i} className="text-text-secondary flex items-start">
                              <span className="text-secondary-400 mr-2">•</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      </CardBody>
                    </Card>
                  )}

                  {aiDiagnosis.recommendedTests.length > 0 && (
                    <Card variant="glass" padding="lg">
                      <CardHeader title="建议检查" />
                      <CardBody>
                        <ul className="space-y-2">
                          {aiDiagnosis.recommendedTests.map((t, i) => (
                            <li key={i} className="text-text-secondary flex items-start">
                              <span className="text-accent-400 mr-2">•</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </CardBody>
                    </Card>
                  )}

                  {aiDiagnosis.reasoning && (
                    <Card variant="glass" padding="lg" className="lg:col-span-2">
                      <CardHeader title="推理过程" />
                      <CardBody>
                        <p className="text-text-secondary whitespace-pre-wrap">{aiDiagnosis.reasoning}</p>
                      </CardBody>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 3: 版本历史 */}
          {currentTab === 'versions' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="glass" padding="lg">
                <CardHeader title="版本历史" description="病历的修改历史记录" />
                <CardBody>
                  {versions && versions.length > 0 ? (
                    <div className="space-y-4">
                      {versions.map((version, index) => (
                        <motion.div
                          key={version.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-4 p-4 bg-background-secondary/50 rounded-lg border border-border-subtle"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-primary-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-semibold text-text-primary">
                                版本 {version.version}
                              </span>
                              <Badge variant={statusBadgeMap[version.status].variant} size="sm">
                                {statusBadgeMap[version.status].label}
                              </Badge>
                              <span className="text-xs text-text-tertiary">
                                {formatDate(version.updatedAt)}
                              </span>
                            </div>
                            <p className="text-sm text-text-secondary">
                              医生: {version.doctorName} · 科室: {version.department}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-text-secondary">暂无版本历史</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
