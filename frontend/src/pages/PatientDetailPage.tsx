/**
 * PatientDetailPage 患者详情页面
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Sparkles,
  Phone,
  MapPin,
  Calendar,
  Droplet,
  AlertTriangle,
  User,
  Clock,
  FileText,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { PatientForm } from '@/components/patient/PatientForm'
import { AIConsultationDialog } from '@/components/patient/AIConsultationDialog'
import { getPatientById, updatePatient, deletePatient } from '@/api/patient.api'
import type { CreatePatientRequest } from '@/api/patient.api'
import { formatDate } from '@/utils/format'

type TabKey = 'basic' | 'history' | 'records' | 'prescriptions'

export const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabKey>('basic')
  const [formOpen, setFormOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  // 获取患者详情
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatientById(id!),
    enabled: !!id,
  })

  // 更新患者
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreatePatientRequest>) => updatePatient(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('患者信息更新成功')
      setFormOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新失败')
    },
  })

  // 处理表单提交
  const handleFormSubmit = async (data: CreatePatientRequest) => {
    await updateMutation.mutateAsync(data)
  }

  // 删除患者
  const deleteMutation = useMutation({
    mutationFn: () => deletePatient(id!),
    onSuccess: () => {
      toast.success('患者删除成功')
      navigate('/patients')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    },
  })

  // 处理删除
  const handleDelete = () => {
    if (patient && confirm(`确定要删除患者【${patient.name}】吗？此操作不可恢复。`)) {
      deleteMutation.mutate()
    }
  }

  // 计算年龄
  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading text="加载患者信息..." />
        </div>
      </DashboardLayout>
    )
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-text-primary mb-4">患者不存在</h2>
          <Button onClick={() => navigate('/patients')} variant="primary">
            返回患者列表
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const allergyList = normalizeAllergies(patient.allergies)

  const tabs = [
    { key: 'basic' as TabKey, label: '基本信息', icon: User },
    { key: 'history' as TabKey, label: '就诊历史', icon: Clock },
    { key: 'records' as TabKey, label: '病历记录', icon: FileText },
    { key: 'prescriptions' as TabKey, label: '处方记录', icon: Activity },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => navigate('/patients')}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回患者列表
        </Button>

        {/* 患者信息卡片 */}
        <Card variant="neon-blue" padding="lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start gap-4">
              {/* 头像 */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-white" />
              </div>

              {/* 基本信息 */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gradient">{patient.name}</h1>
                  <Badge
                    variant={patient.gender === 'MALE' ? 'blue' : 'purple'}
                    size="lg"
                  >
                    {patient.gender === 'MALE' ? '男' : '女'}
                  </Badge>
                  <Badge variant="cyan" size="lg">
                    {calculateAge(patient.birthDate)}岁
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>出生：{formatDate(patient.birthDate, 'yyyy-MM-dd')}</span>
                  </div>
                  {patient.bloodType && (
                    <div className="flex items-center gap-2">
                      <Droplet className="w-4 h-4" />
                      <span>{patient.bloodType}型</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button onClick={() => setAiDialogOpen(true)} variant="primary" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI问诊
              </Button>
              <Button onClick={() => setFormOpen(true)} variant="secondary" className="gap-2">
                <Edit className="w-4 h-4" />
                编辑
              </Button>
              <Button onClick={handleDelete} variant="error" className="gap-2">
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            </div>
          </div>
        </Card>

        {/* Tab导航 */}
        <Card variant="glass">
          <div className="flex gap-2 border-b border-border-subtle">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-all ${
                    activeTab === tab.key
                      ? 'border-primary-400 text-primary-400'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab内容 */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-400" />
                    个人信息
                  </h3>
                  <InfoItem label="姓名" value={patient.name} />
                  <InfoItem
                    label="性别"
                    value={patient.gender === 'MALE' ? '男' : '女'}
                  />
                  <InfoItem
                    label="出生日期"
                    value={formatDate(patient.birthDate, 'yyyy-MM-dd')}
                  />
                  <InfoItem label="年龄" value={`${calculateAge(patient.birthDate)}岁`} />
                  <InfoItem label="血型" value={patient.bloodType || '未知'} />
                  <InfoItem label="身份证号" value={patient.idCard} />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-accent-400" />
                    联系信息
                  </h3>
                  <InfoItem label="手机号码" value={patient.phone} />
                  {patient.address && (
                    <InfoItem
                      label="地址"
                      value={patient.address}
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  )}
                  {patient.emergencyContact && (
                    <>
                      <InfoItem label="紧急联系人" value={patient.emergencyContact} />
                      <InfoItem
                        label="紧急联系电话"
                        value={patient.emergencyPhone || '-'}
                      />
                    </>
                  )}
                </div>

                {/* 医疗信息 */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning-500" />
                    医疗信息
                  </h3>
                  {allergyList.length > 0 && (
                    <div>
                      <p className="text-sm text-text-tertiary mb-2">过敏史</p>
                      <div className="flex flex-wrap gap-2">
                        {allergyList.map((allergy: string, index: number) => (
                          <Badge key={index} variant="warning">
                            {allergy.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {patient.medicalHistory && (
                    <div>
                      <p className="text-sm text-text-tertiary mb-2">既往病史</p>
                      <p className="text-text-primary glass p-4 rounded-lg">
                        {patient.medicalHistory}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">就诊历史功能开发中...</p>
              </div>
            )}

            {activeTab === 'records' && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">病历记录功能开发中...</p>
              </div>
            )}

            {activeTab === 'prescriptions' && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">处方记录功能开发中...</p>
              </div>
            )}
          </motion.div>
        </Card>
      </div>

      {/* 患者表单对话框 */}
      <PatientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        patient={patient}
        isLoading={updateMutation.isPending}
      />

      {/* AI问诊对话框 */}
      <AIConsultationDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        patient={patient}
      />
    </DashboardLayout>
  )
}

// 信息项组件
const InfoItem = ({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) => (
  <div className="flex items-start gap-3">
    {icon && <div className="text-text-tertiary mt-0.5">{icon}</div>}
    <div className="flex-1">
      <p className="text-sm text-text-tertiary mb-1">{label}</p>
      <p className="text-text-primary font-medium">{value}</p>
    </div>
  </div>
)

const normalizeAllergies = (allergies?: string | string[]): string[] => {
  if (!allergies) return []
  if (Array.isArray(allergies)) return allergies.filter(Boolean)
  return allergies
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}
