/**
 * 处方创建/编辑页面
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Loading } from '@/components/ui/Loading'
import { AIReviewResult } from '@/components/prescription/AIReviewResult'
import {
  createPrescription,
  updatePrescription,
  getPrescriptionById,
  reviewPrescription,
  type CreatePrescriptionRequest,
  type AIReviewResult as AIReviewResultType,
} from '@/api/prescription.api'
import { getMedicines, type Medicine } from '@/api/medicine.api'
import { getPatients, type Patient } from '@/api/patient.api'
import { getPatientAge } from '@/utils/patient'
import { Plus, Trash2, Search, AlertCircle, Sparkles } from 'lucide-react'

// 表单验证模式
const prescriptionSchema = z.object({
  patientId: z.string().min(1, '请选择患者'),
  diagnosis: z.string().min(1, '请输入诊断'),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1, '请选择药品'),
        medicineName: z.string(),
        dosage: z.string().min(1, '请输入剂量'),
        frequency: z.string().min(1, '请输入频次'),
        duration: z.string().min(1, '请输入疗程'),
        quantity: z.coerce.number().int().min(1, '数量必须大于0'),
        unitPrice: z.coerce.number().min(0),
        unit: z.string(),
        notes: z.string().optional(),
      })
    )
    .min(1, '至少添加一个药品'),
  notes: z.string().optional(),
})

type PrescriptionFormData = z.infer<typeof prescriptionSchema>

export function PrescriptionFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [showPatientSearch, setShowPatientSearch] = useState(false)
  const [showMedicineSearch, setShowMedicineSearch] = useState(false)
  const [patientKeyword, setPatientKeyword] = useState('')
  const [medicineKeyword, setMedicineKeyword] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [aiReview, setAiReview] = useState<AIReviewResultType | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)

  // 获取处方详情（编辑时）
  const { data: prescription, isLoading: loadingPrescription } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => getPrescriptionById(id!),
    enabled: isEditing,
  })

  // 搜索患者
  const { data: patientsData } = useQuery({
    queryKey: ['patients', patientKeyword],
    queryFn: () => getPatients({ keyword: patientKeyword, page: 1, pageSize: 10 }),
    enabled: showPatientSearch && patientKeyword.length > 0,
  })

  // 搜索药品
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines', medicineKeyword],
    queryFn: () => getMedicines({ name: medicineKeyword, page: 1, pageSize: 20 }),
    enabled: showMedicineSearch && medicineKeyword.length > 0,
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientId: '',
      diagnosis: '',
      items: [],
      notes: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const items = watch('items')

  // 计算总金额
  const totalAmount = items.reduce((sum, item) => {
    return sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)
  }, 0)

  // 编辑时加载数据
  useEffect(() => {
    if (prescription) {
      setValue('patientId', prescription.patientId)
      setValue('diagnosis', prescription.diagnosis)
      setValue('items', prescription.items.map(item => ({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit,
        notes: item.notes || '',
      })))
      setValue('notes', prescription.notes || '')
      if (prescription.aiReview) {
        setAiReview(prescription.aiReview)
      }
    }
  }, [prescription, setValue])

  // 选择患者
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setValue('patientId', patient.id)
    setShowPatientSearch(false)
    setPatientKeyword('')
  }

  // 添加药品
  const handleAddMedicine = (medicine: Medicine) => {
    append({
      medicineId: medicine.id,
      medicineName: medicine.name,
      dosage: '',
      frequency: '',
      duration: '',
      quantity: 1,
      unitPrice: medicine.price,
      unit: medicine.unit,
      notes: '',
    })
    setShowMedicineSearch(false)
    setMedicineKeyword('')
  }

  // AI审查
  const handleAIReview = async () => {
    if (!id) {
      toast.error('请先保存处方')
      return
    }

    setIsReviewing(true)
    try {
      const result = await reviewPrescription(id)
      setAiReview(result)
      toast.success('AI审查完成')
    } catch (error) {
      toast.error('AI审查失败')
    } finally {
      setIsReviewing(false)
    }
  }

  // 创建/更新处方 mutation
  const mutation = useMutation({
    mutationFn: async (data: PrescriptionFormData) => {
      const requestData: CreatePrescriptionRequest = {
        patientId: data.patientId,
        diagnosis: data.diagnosis,
        items: data.items.map(item => ({
          medicineId: item.medicineId,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
        notes: data.notes || undefined,
      }

      if (isEditing) {
        return updatePrescription(id!, requestData)
      } else {
        return createPrescription(requestData)
      }
    },
    onSuccess: (data) => {
      toast.success(isEditing ? '处方更新成功' : '处方创建成功')
      navigate(`/prescriptions/${data.id}`)
    },
    onError: () => {
      toast.error(isEditing ? '更新失败' : '创建失败')
    },
  })

  const onSubmit = (data: PrescriptionFormData) => {
    mutation.mutate(data)
  }

  if (loadingPrescription) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载处方..." />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">
              {isEditing ? '编辑处方' : '新建处方'}
            </h1>
            <p className="text-text-secondary mt-2">填写处方信息并添加处方药品</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/prescriptions')}>
            返回列表
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 患者选择 */}
          <Card className="card-neon p-6">
            <h3 className="text-lg font-semibold text-gradient mb-4">患者信息</h3>
            <div className="space-y-4">
              {selectedPatient ? (
                <div className="p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="text-lg font-semibold text-text-primary">
                        {selectedPatient.name}
                      </div>
                      <div className="text-sm text-text-secondary space-y-1">
                        <div>性别: {selectedPatient.gender}</div>
                        <div>年龄: {getPatientAge(selectedPatient)}岁</div>
                        <div>联系电话: {selectedPatient.phone}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      
                      onClick={() => {
                        setSelectedPatient(null)
                        setValue('patientId', '')
                        setShowPatientSearch(true)
                      }}
                    >
                      更换患者
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPatientSearch(true)}
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    搜索患者
                  </Button>
                  {errors.patientId && (
                    <p className="text-red-500 text-sm mt-2">{errors.patientId.message}</p>
                  )}
                </div>
              )}

              {/* 患者搜索 */}
              {showPatientSearch && (
                <div className="space-y-2">
                  <Input
                    placeholder="输入患者姓名或电话搜索..."
                    value={patientKeyword}
                    onChange={(e) => setPatientKeyword(e.target.value)}
                    autoFocus
                  />
                  {patientsData?.data && patientsData.data.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {patientsData.data.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => handleSelectPatient(patient)}
                          className="w-full p-3 text-left bg-background-secondary hover:bg-background-secondary/80 border border-white/10 hover:border-neon-blue/50 rounded-lg transition-colors"
                        >
                                                  <div className="font-medium text-text-primary">{patient.name}</div>
                          <div className="text-sm text-text-secondary">
                            {patient.gender} / {getPatientAge(patient)}岁 / {patient.phone}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* 诊断 */}
          <Card className="card-neon p-6">
            <h3 className="text-lg font-semibold text-gradient mb-4">诊断信息</h3>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                诊断 <span className="text-red-500">*</span>
              </label>
              <Textarea
                {...register('diagnosis')}
                rows={3}
                placeholder="请输入患者诊断..."
                error={errors.diagnosis?.message}
              />
            </div>
          </Card>

          {/* 处方药品 */}
          <Card className="card-neon p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gradient">处方药品</h3>
              <Button
                type="button"
                variant="neon"
                
                onClick={() => setShowMedicineSearch(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加药品
              </Button>
            </div>

            {/* 药品搜索 */}
            {showMedicineSearch && (
              <div className="mb-4 space-y-2">
                <Input
                  placeholder="输入药品名称搜索..."
                  value={medicineKeyword}
                  onChange={(e) => setMedicineKeyword(e.target.value)}
                  autoFocus
                />
                {medicinesData?.data && medicinesData.data.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {medicinesData.data.map((medicine) => (
                      <button
                        key={medicine.id}
                        type="button"
                        onClick={() => handleAddMedicine(medicine)}
                        className="w-full p-3 text-left bg-background-secondary hover:bg-background-secondary/80 border border-white/10 hover:border-neon-blue/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-text-primary">{medicine.name}</div>
                            <div className="text-sm text-text-secondary">
                              {medicine.specification}
                            </div>
                          </div>
                          <div className="text-neon-cyan font-medium">
                            ¥{medicine.price.toFixed(2)}/{medicine.unit}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  
                  onClick={() => {
                    setShowMedicineSearch(false)
                    setMedicineKeyword('')
                  }}
                >
                  取消
                </Button>
              </div>
            )}

            {/* 药品列表 */}
            {fields.length > 0 ? (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-background-secondary border border-white/10 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-text-primary">{items[index].medicineName}</div>
                        <div className="text-sm text-text-secondary">
                          ¥{items[index].unitPrice.toFixed(2)}/{items[index].unit}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          剂量 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...register(`items.${index}.dosage`)}
                          placeholder="如: 100mg"
                          
                          error={errors.items?.[index]?.dosage?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          频次 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...register(`items.${index}.frequency`)}
                          placeholder="如: 每日3次"
                          
                          error={errors.items?.[index]?.frequency?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          疗程 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...register(`items.${index}.duration`)}
                          placeholder="如: 7天"
                          
                          error={errors.items?.[index]?.duration?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          数量 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          {...register(`items.${index}.quantity`)}
                          
                          error={errors.items?.[index]?.quantity?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">小计</label>
                        <div className="text-neon-cyan font-medium h-9 flex items-center">
                          ¥{((Number(items[index]?.unitPrice) || 0) * (Number(items[index]?.quantity) || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs text-text-secondary mb-1">备注</label>
                      <Input
                        {...register(`items.${index}.notes`)}
                        placeholder="特殊说明..."
                        
                      />
                    </div>
                  </motion.div>
                ))}

                {/* 总金额 */}
                <div className="p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-text-primary">处方总金额</span>
                    <span className="text-2xl font-bold text-neon-cyan">
                      ¥{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>请添加处方药品</p>
              </div>
            )}

            {errors.items && typeof errors.items.message === 'string' && (
              <p className="text-red-500 text-sm mt-2">{errors.items.message}</p>
            )}
          </Card>

          {/* 备注 */}
          <Card className="card-neon p-6">
            <h3 className="text-lg font-semibold text-gradient mb-4">备注信息</h3>
            <Textarea
              {...register('notes')}
              rows={3}
              placeholder="其他说明..."
            />
          </Card>

          {/* AI审查结果 */}
          {aiReview && (
            <AIReviewResult result={aiReview} />
          )}

          {/* 表单按钮 */}
          <Card className="card-neon p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/prescriptions')}
                disabled={isSubmitting}
                className="flex-1"
              >
                取消
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAIReview}
                  disabled={isReviewing}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isReviewing ? 'AI审查中...' : 'AI智能审查'}
                </Button>
              )}
              <Button
                type="submit"
                variant="neon"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '提交中...' : isEditing ? '更新处方' : '创建处方'}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
