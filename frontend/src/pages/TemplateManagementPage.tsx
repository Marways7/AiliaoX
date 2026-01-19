/**
 * 病历模板管理页面 - 里程碑6
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileSignature, Plus, Edit, Trash2, Users, Lock, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { Modal } from '@/components/ui/Modal'

import {
  getMedicalRecordTemplates,
  createMedicalRecordTemplate,
  updateMedicalRecordTemplate,
  deleteMedicalRecordTemplate,
  MedicalRecordTemplate
} from '@/api/medical-record.api'

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

// 模板表单Schema
const templateSchema = z.object({
  name: z.string().min(1, '请输入模板名称'),
  department: z.string().min(1, '请选择科室'),
  category: z.string().min(1, '请输入分类'),
  isPublic: z.boolean(),
  chiefComplaintTemplate: z.string().optional(),
  presentIllnessTemplate: z.string().optional(),
  physicalExaminationTemplate: z.string().optional(),
  diagnosisTemplate: z.string().optional(),
  treatmentPlanTemplate: z.string().optional(),
})

type TemplateFormData = z.infer<typeof templateSchema>

export function TemplateManagementPage() {
  const queryClient = useQueryClient()
  // const { user } = useAuthStore()

  const [filters, setFilters] = useState<{
    department?: string
    category?: string
    isPublic?: boolean
  }>({})
  const [searchKeyword, setSearchKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MedicalRecordTemplate | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      isPublic: false,
    }
  })

  // 获取模板列表
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', filters],
    queryFn: () => getMedicalRecordTemplates(filters),
  })

  // 创建模板
  const createMutation = useMutation({
    mutationFn: createMedicalRecordTemplate,
    onSuccess: () => {
      toast.success('模板创建成功')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setModalOpen(false)
      reset()
    },
    onError: () => {
      toast.error('模板创建失败')
    },
  })

  // 更新模板
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TemplateFormData> }) =>
      updateMedicalRecordTemplate(id, data),
    onSuccess: () => {
      toast.success('模板更新成功')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setModalOpen(false)
      setEditingTemplate(null)
      reset()
    },
    onError: () => {
      toast.error('模板更新失败')
    },
  })

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: deleteMedicalRecordTemplate,
    onSuccess: () => {
      toast.success('模板删除成功')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
    onError: () => {
      toast.error('模板删除失败')
    },
  })

  // 打开新建模板对话框
  const handleCreate = () => {
    setEditingTemplate(null)
    reset({
      name: '',
      department: '',
      category: '',
      isPublic: false,
      chiefComplaintTemplate: '',
      presentIllnessTemplate: '',
      physicalExaminationTemplate: '',
      diagnosisTemplate: '',
      treatmentPlanTemplate: '',
    })
    setModalOpen(true)
  }

  // 打开编辑模板对话框
  const handleEdit = (template: MedicalRecordTemplate) => {
    setEditingTemplate(template)
    reset({
      name: template.name,
      department: template.department,
      category: template.category,
      isPublic: template.isPublic,
      chiefComplaintTemplate: template.chiefComplaintTemplate || '',
      presentIllnessTemplate: template.presentIllnessTemplate || '',
      physicalExaminationTemplate: template.physicalExaminationTemplate || '',
      diagnosisTemplate: template.diagnosisTemplate || '',
      treatmentPlanTemplate: template.treatmentPlanTemplate || '',
    })
    setModalOpen(true)
  }

  // 提交表单
  const onSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate(data as any)
    }
  }

  // 删除模板
  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      deleteMutation.mutate(id)
    }
  }

  // 筛选模板
  const filteredTemplates = templates?.filter(template => {
    if (searchKeyword) {
      return template.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        template.category.toLowerCase().includes(searchKeyword.toLowerCase())
    }
    return true
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            <FileSignature className="w-8 h-8 text-secondary-500" />
            病历模板管理
          </h1>
          <p className="text-text-secondary mt-2">创建和管理病历模板，提高病历录入效率</p>
        </motion.div>

        {/* 操作栏 */}
        <Card variant="glass" padding="lg">
          <div className="flex flex-wrap gap-4 items-center">
            {/* 搜索框 */}
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="搜索模板名称或分类..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* 科室筛选 */}
            <div className="w-40">
              <NativeSelect
                value={filters.department || ''}
                onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined })}
              >
                <option value="">全部科室</option>
                {departments.map(d => (<option key={d} value={d}>{d}</option>))}
              </NativeSelect>
            </div>

            {/* 公开/私有筛选 */}
            <div className="w-32">
              <NativeSelect
                value={filters.isPublic === undefined ? '' : String(filters.isPublic)}
                onChange={(e) => setFilters({
                  ...filters,
                  isPublic: e.target.value === '' ? undefined : e.target.value === 'true'
                })}
              >
                <option value="">全部模板</option>
                <option value="true">公开模板</option>
                <option value="false">私有模板</option>
              </NativeSelect>
            </div>

            {/* 新建按钮 */}
            <Button
              variant="primary"
              onClick={handleCreate}
              icon={<Plus className="w-5 h-5" />}
            >
              新建模板
            </Button>
          </div>
        </Card>

        {/* 模板列表 */}
        {isLoading ? (
          <Card variant="glass" padding="lg">
            <Loading size="lg" text="加载模板列表..." />
          </Card>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="glass" hover padding="lg" className="h-full">
                  <CardHeader
                    title={template.name}
                    description={`${template.department} · ${template.category}`}
                    action={
                      <Badge variant={template.isPublic ? 'success' : 'warning'} size="sm">
                        {template.isPublic ? (
                          <><Users className="w-3 h-3 mr-1 inline" />公开</>
                        ) : (
                          <><Lock className="w-3 h-3 mr-1 inline" />私有</>
                        )}
                      </Badge>
                    }
                  />
                  <CardBody className="space-y-2 text-sm text-text-tertiary">
                    <p>创建人: {template.createdBy}</p>
                    <div className="space-y-1">
                      {template.chiefComplaintTemplate && <p>✓ 主诉模板</p>}
                      {template.presentIllnessTemplate && <p>✓ 现病史模板</p>}
                      {template.physicalExaminationTemplate && <p>✓ 体格检查模板</p>}
                      {template.diagnosisTemplate && <p>✓ 诊断模板</p>}
                      {template.treatmentPlanTemplate && <p>✓ 治疗方案模板</p>}
                    </div>
                  </CardBody>
                  <CardFooter>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(template)}
                      icon={<Edit className="w-4 h-4" />}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(template.id)}
                      loading={deleteMutation.isPending}
                      icon={<Trash2 className="w-4 h-4" />}
                    >
                      删除
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card variant="glass" padding="lg">
            <div className="text-center py-12">
              <FileSignature className="w-16 h-16 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-secondary text-lg mb-2">暂无模板</p>
              <p className="text-text-tertiary text-sm mb-6">
                {searchKeyword || filters.department || filters.isPublic !== undefined
                  ? '没有找到符合条件的模板'
                  : '开始创建您的第一个病历模板'}
              </p>
              <Button onClick={handleCreate} icon={<Plus className="w-5 h-5" />}>
                新建模板
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* 新建/编辑模板对话框 */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingTemplate(null)
          reset()
        }}
        title={editingTemplate ? '编辑模板' : '新建模板'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                模板名称 <span className="text-error-500">*</span>
              </label>
              <Input {...register('name')} error={errors.name?.message} placeholder="例如：内科门诊病历模板" />
            </div>

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
                分类 <span className="text-error-500">*</span>
              </label>
              <Input {...register('category')} error={errors.category?.message} placeholder="例如：常见病" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary mt-7">
                <input type="checkbox" {...register('isPublic')} className="w-4 h-4" />
                设为公开模板
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">主诉模板</label>
            <Textarea {...register('chiefComplaintTemplate')} rows={2} placeholder="主诉的模板内容..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">现病史模板</label>
            <Textarea {...register('presentIllnessTemplate')} rows={3} placeholder="现病史的模板内容..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">体格检查模板</label>
            <Textarea {...register('physicalExaminationTemplate')} rows={3} placeholder="体格检查的模板内容..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">诊断模板</label>
            <Textarea {...register('diagnosisTemplate')} rows={2} placeholder="诊断的模板内容..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">治疗方案模板</label>
            <Textarea {...register('treatmentPlanTemplate')} rows={3} placeholder="治疗方案的模板内容..." />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setModalOpen(false)
                setEditingTemplate(null)
                reset()
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingTemplate ? '更新模板' : '创建模板'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
