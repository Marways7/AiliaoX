/**
 * 病历表单页面 - 创建/编辑 - 里程碑6
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Save,
  CheckCircle,
  X,
  Sparkles,
  FileSignature,
  Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Loading } from '@/components/ui/Loading'
import { Modal } from '@/components/ui/Modal'

import {
  createMedicalRecord,
  updateMedicalRecord,
  getMedicalRecordById,
  generateRecordSummary,
  getDiagnosisSuggestions,
  getMedicalRecordTemplates,
  CreateMedicalRecordRequest,
  MedicalRecordTemplate
} from '@/api/medical-record.api'
import { getPatients } from '@/api/patient.api'

// 病历表单Schema
const medicalRecordSchema = z.object({
  patientId: z.string().min(1, '请选择患者'),
  department: z.string().min(1, '请选择科室'),
  visitDate: z.string().min(1, '请选择就诊日期'),
  chiefComplaint: z.string().min(1, '请输入主诉'),
  presentIllness: z.string().min(1, '请输入现病史'),
  pastHistory: z.string().optional(),
  allergyHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  physicalExamination: z.string().optional(),
  auxiliaryExamination: z.string().optional(),
  diagnosis: z.string().min(1, '请输入诊断'),
  differentialDiagnosis: z.string().optional(),
  treatmentPlan: z.string().min(1, '请输入治疗方案'),
  prescriptionId: z.string().optional(),
  notes: z.string().optional(),
  templateId: z.string().optional(),
})

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>

const departments = [
  '内科',
  '外科',
  '儿科',
  '妇产科',
  '眼科',
  '耳鼻喉科',
  '皮肤科',
  '神经科',
  '急诊科'
]

const tabs = [
  { id: 'basic', label: '基本信息' },
  { id: 'history', label: '病史' },
  { id: 'examination', label: '检查' },
  { id: 'diagnosis', label: '诊断治疗' },
]

export function MedicalRecordFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const isEditMode = !!id && id !== 'new'

  // 当前Tab
  const [currentTab, setCurrentTab] = useState('basic')
  // 模板选择对话框
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  // AI助手面板状态
  const [aiSummary, setAiSummary] = useState<string>('')
  const [aiDiagnosis, setAiDiagnosis] = useState<{
    primaryDiagnosis: string[]
    differentialDiagnosis: string[]
    recommendedTests: string[]
    reasoning: string
  } | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)

  // 表单
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      visitDate: new Date().toISOString().split('T')[0],
    }
  })

  // 获取患者列表
  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatients({ page: 1, pageSize: 100 }),
  })

  // 获取病历详情（编辑模式）
  const { data: recordData, isLoading: loadingRecord } = useQuery({
    queryKey: ['medical-record', id],
    queryFn: () => getMedicalRecordById(id!),
    enabled: isEditMode,
  })

  // 获取模板列表
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getMedicalRecordTemplates(),
  })

  // 填充表单数据（编辑模式）
  useEffect(() => {
    if (recordData) {
      reset({
        patientId: recordData.patientId,
        department: recordData.department,
        visitDate: recordData.visitDate.split('T')[0],
        chiefComplaint: recordData.chiefComplaint,
        presentIllness: recordData.presentIllness,
        pastHistory: recordData.pastHistory || '',
        allergyHistory: recordData.allergyHistory || '',
        familyHistory: recordData.familyHistory || '',
        physicalExamination: recordData.physicalExamination || '',
        auxiliaryExamination: recordData.auxiliaryExamination || '',
        diagnosis: recordData.diagnosis,
        differentialDiagnosis: recordData.differentialDiagnosis || '',
        treatmentPlan: recordData.treatmentPlan,
        prescriptionId: recordData.prescriptionId || '',
        notes: recordData.notes || '',
      })
    }
  }, [recordData, reset])

  // 创建病历
  const createMutation = useMutation({
    mutationFn: (data: CreateMedicalRecordRequest) => createMedicalRecord(data),
    onSuccess: () => {
      toast.success('病历创建成功')
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      navigate('/medical-records')
    },
    onError: () => {
      toast.error('病历创建失败')
    },
  })

  // 更新病历
  const updateMutation = useMutation({
    mutationFn: (data: CreateMedicalRecordRequest) => updateMedicalRecord(id!, data),
    onSuccess: () => {
      toast.success('病历更新成功')
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
      queryClient.invalidateQueries({ queryKey: ['medical-record', id] })
      navigate(`/medical-records/${id}`)
    },
    onError: () => {
      toast.error('病历更新失败')
    },
  })

  // 保存为草稿
  const onSaveDraft = (data: MedicalRecordFormData) => {
    if (isEditMode) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  // 完成病历
  const onComplete = (data: MedicalRecordFormData) => {
    if (isEditMode) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  // 应用模板
  const handleApplyTemplate = (template: MedicalRecordTemplate) => {
    if (template.chiefComplaintTemplate) setValue('chiefComplaint', template.chiefComplaintTemplate)
    if (template.presentIllnessTemplate) setValue('presentIllness', template.presentIllnessTemplate)
    if (template.physicalExaminationTemplate) setValue('physicalExamination', template.physicalExaminationTemplate)
    if (template.diagnosisTemplate) setValue('diagnosis', template.diagnosisTemplate)
    if (template.treatmentPlanTemplate) setValue('treatmentPlan', template.treatmentPlanTemplate)
    setValue('department', template.department)
    setValue('templateId', template.id)
    setTemplateModalOpen(false)
    toast.success('模板已应用')
  }

  // 生成AI摘要
  const handleGenerateSummary = async () => {
    if (!isEditMode) {
      toast.error('请先保存病历后再生成摘要')
      return
    }
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
    if (!isEditMode) {
      toast.error('请先保存病历后再获取诊断建议')
      return
    }
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

  if (loadingRecord) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loading size="lg" text="加载病历数据..." />
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
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary-500" />
              {isEditMode ? '编辑病历' : '新建病历'}
            </h1>
            <p className="text-text-secondary mt-2">
              {isEditMode ? '修改病历信息' : '创建新的病历记录'}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/medical-records')}
            icon={<X className="w-5 h-5" />}
          >
            返回
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主表单区域 */}
          <div className="lg:col-span-2">
            <Card variant="glass" padding="lg">
              {/* Tab导航 */}
              <div className="flex border-b border-border-subtle mb-6">
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
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                      />
                    )}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
                <AnimatePresence mode="wait">
                  {/* Tab 1: 基本信息 */}
                  {currentTab === 'basic' && (
                    <motion.div
                      key="basic"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          患者 <span className="text-error-500">*</span>
                        </label>
                        <NativeSelect
                          {...register('patientId')}
                          error={errors.patientId?.message}
                        >
                          <option value="">请选择患者</option>
                          {(patientsData?.data || []).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.idCard})
                            </option>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            科室 <span className="text-error-500">*</span>
                          </label>
                          <NativeSelect
                            {...register('department')}
                            error={errors.department?.message}
                          >
                            <option value="">请选择科室</option>
                            {departments.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </NativeSelect>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            就诊日期 <span className="text-error-500">*</span>
                          </label>
                          <Input
                            type="date"
                            {...register('visitDate')}
                            error={errors.visitDate?.message}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          主诉 <span className="text-error-500">*</span>
                        </label>
                        <Textarea
                          {...register('chiefComplaint')}
                          error={errors.chiefComplaint?.message}
                          rows={3}
                          placeholder="患者的主要症状描述..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          现病史 <span className="text-error-500">*</span>
                        </label>
                        <Textarea
                          {...register('presentIllness')}
                          error={errors.presentIllness?.message}
                          rows={5}
                          placeholder="患者当前疾病的发生、发展过程..."
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 2: 病史 */}
                  {currentTab === 'history' && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          既往史
                        </label>
                        <Textarea
                          {...register('pastHistory')}
                          rows={4}
                          placeholder="患者的既往疾病史..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          过敏史 <span className="text-warning-500">(重要)</span>
                        </label>
                        <Textarea
                          {...register('allergyHistory')}
                          rows={3}
                          placeholder="患者的药物、食物等过敏史..."
                          className="border-warning-500/30"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          家族史
                        </label>
                        <Textarea
                          {...register('familyHistory')}
                          rows={3}
                          placeholder="患者的家族遗传病史..."
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 3: 检查 */}
                  {currentTab === 'examination' && (
                    <motion.div
                      key="examination"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          体格检查
                        </label>
                        <Textarea
                          {...register('physicalExamination')}
                          rows={5}
                          placeholder="体温、血压、心率等体格检查结果..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          辅助检查
                        </label>
                        <Textarea
                          {...register('auxiliaryExamination')}
                          rows={5}
                          placeholder="化验、影像、心电图等辅助检查结果..."
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Tab 4: 诊断治疗 */}
                  {currentTab === 'diagnosis' && (
                    <motion.div
                      key="diagnosis"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          诊断 <span className="text-error-500">*</span>
                        </label>
                        <Textarea
                          {...register('diagnosis')}
                          error={errors.diagnosis?.message}
                          rows={3}
                          placeholder="诊断结论..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          鉴别诊断
                        </label>
                        <Textarea
                          {...register('differentialDiagnosis')}
                          rows={3}
                          placeholder="需要鉴别的其他可能诊断..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          治疗方案 <span className="text-error-500">*</span>
                        </label>
                        <Textarea
                          {...register('treatmentPlan')}
                          error={errors.treatmentPlan?.message}
                          rows={5}
                          placeholder="具体的治疗方案和用药方案..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          备注
                        </label>
                        <Textarea
                          {...register('notes')}
                          rows={3}
                          placeholder="其他需要记录的信息..."
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 表单底部操作栏 */}
                <CardFooter className="mt-8 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/medical-records')}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTemplateModalOpen(true)}
                    icon={<FileSignature className="w-5 h-5" />}
                  >
                    选择模板
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSubmit(onSaveDraft)}
                    loading={createMutation.isPending || updateMutation.isPending}
                    icon={<Save className="w-5 h-5" />}
                  >
                    保存草稿
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={createMutation.isPending || updateMutation.isPending}
                    icon={<CheckCircle className="w-5 h-5" />}
                  >
                    完成病历
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* AI助手面板 */}
          <div className="lg:col-span-1">
            <Card variant="neon-purple" padding="lg" className="sticky top-6">
              <CardHeader
                title="AI智能助手"
                description="AI辅助病历分析和诊断建议"
              />
              <CardBody className="space-y-4">
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={handleGenerateSummary}
                  loading={loadingAI}
                  disabled={!isEditMode}
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  生成病历摘要
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={handleGetDiagnosisSuggestions}
                  loading={loadingAI}
                  disabled={!isEditMode}
                  icon={<Lightbulb className="w-5 h-5" />}
                >
                  获取诊断建议
                </Button>

                {/* AI结果显示 */}
                {aiSummary && (
                  <div className="mt-6 p-4 bg-background-secondary/50 rounded-lg border border-secondary-500/30">
                    <h4 className="text-sm font-semibold text-text-primary mb-2">AI摘要</h4>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}

                {aiDiagnosis && (
                  <div className="mt-6 space-y-4">
                    {aiDiagnosis.primaryDiagnosis.length > 0 && (
                      <div className="p-4 bg-background-secondary/50 rounded-lg border border-secondary-500/30">
                        <h4 className="text-sm font-semibold text-text-primary mb-2">初步诊断</h4>
                        <ul className="space-y-1">
                          {aiDiagnosis.primaryDiagnosis.map((d, i) => (
                            <li key={i} className="text-sm text-text-secondary">• {d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiDiagnosis.recommendedTests.length > 0 && (
                      <div className="p-4 bg-background-secondary/50 rounded-lg border border-secondary-500/30">
                        <h4 className="text-sm font-semibold text-text-primary mb-2">建议检查</h4>
                        <ul className="space-y-1">
                          {aiDiagnosis.recommendedTests.map((t, i) => (
                            <li key={i} className="text-sm text-text-secondary">• {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {!isEditMode && (
                  <div className="mt-6 p-4 bg-warning-500/10 rounded-lg border border-warning-500/30">
                    <p className="text-sm text-warning-400">
                      请先保存病历，然后才能使用AI助手功能
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* 模板选择对话框 */}
      <Modal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title="选择病历模板"
        size="lg"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {templates && templates.length > 0 ? (
            templates.map((template) => (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-background-secondary rounded-lg border border-border-subtle hover:border-primary-500/50 cursor-pointer transition-colors"
                onClick={() => handleApplyTemplate(template)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">{template.name}</h4>
                    <p className="text-xs text-text-secondary mt-1">
                      {template.department} · {template.category}
                    </p>
                  </div>
                  {template.isPublic && (
                    <span className="text-xs text-success-400">公开</span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">暂无可用模板</p>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
