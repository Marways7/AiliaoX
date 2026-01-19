/**
 * 药品表单组件 - 新建/编辑药品
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Button } from '@/components/ui/Button'
import {
  createMedicine,
  updateMedicine,
  getMedicineCategories,
  type Medicine,
  type CreateMedicineRequest,
} from '@/api/medicine.api'

// 表单验证模式 - 严格匹配后端validation schema
const medicineSchema = z.object({
  name: z.string().min(1, '请输入药品名称'),
  genericName: z.string().optional(),
  categoryId: z.string().min(1, '请选择药物分类'),  // 改为categoryId
  specification: z.string().min(1, '请输入规格'),
  unit: z.string().min(1, '请输入单位'),
  manufacturer: z.string().optional(),
  price: z.coerce.number().min(0, '价格不能为负数'),  // 改为price
  description: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional(),
})

type MedicineFormData = z.infer<typeof medicineSchema>

interface MedicineFormProps {
  medicine?: Medicine | null
  onClose: () => void
  onSuccess: () => void
}

export function MedicineForm({ medicine, onClose, onSuccess }: MedicineFormProps) {
  const isEditing = !!medicine

  // 获取药品分类列表
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['medicineCategories'],
    queryFn: getMedicineCategories,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: medicine
      ? {
          name: medicine.name,
          genericName: medicine.genericName || '',
          categoryId: medicine.category.id,  // 使用category.id
          specification: medicine.specification,
          unit: medicine.unit,
          manufacturer: medicine.manufacturer || '',
          price: medicine.price,
          description: medicine.description || '',
          sideEffects: medicine.sideEffects || '',
          contraindications: medicine.contraindications || '',
        }
      : {
          name: '',
          genericName: '',
          categoryId: '',
          specification: '',
          unit: '',
          manufacturer: '',
          price: 0,
          description: '',
          sideEffects: '',
          contraindications: '',
        },
  })

  const onSubmit = async (data: MedicineFormData) => {
    try {
      const requestData: CreateMedicineRequest = {
        ...data,
        genericName: data.genericName || undefined,
        manufacturer: data.manufacturer || undefined,
        description: data.description || undefined,
        sideEffects: data.sideEffects || undefined,
        contraindications: data.contraindications || undefined,
      }

      if (isEditing) {
        await updateMedicine(medicine.id, requestData)
        toast.success('药品信息更新成功')
      } else {
        await createMedicine(requestData)
        toast.success('药品创建成功')
      }
      onSuccess()
    } catch (error) {
      toast.error(isEditing ? '更新失败' : '创建失败')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEditing ? '编辑药品' : '新建药品'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gradient">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                药品名称 <span className="text-red-500">*</span>
              </label>
              <Input {...register('name')} error={errors.name?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                通用名
              </label>
              <Input {...register('genericName')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                药物分类 <span className="text-red-500">*</span>
              </label>
              <NativeSelect
                {...register('categoryId')}
                error={errors.categoryId?.message}
                disabled={categoriesLoading}
              >
                <option value="">请选择分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                规格 <span className="text-red-500">*</span>
              </label>
              <Input {...register('specification')} placeholder="如：100mg*30片" error={errors.specification?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                单位 <span className="text-red-500">*</span>
              </label>
              <Input {...register('unit')} placeholder="如：盒、瓶、支" error={errors.unit?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                生产厂家
              </label>
              <Input {...register('manufacturer')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                价格(元) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                {...register('price')}
                error={errors.price?.message}
              />
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gradient">详细信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                药品描述
              </label>
              <Textarea {...register('description')} rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                禁忌症
              </label>
              <Textarea {...register('contraindications')} rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                副作用
              </label>
              <Textarea {...register('sideEffects')} rows={2} />
            </div>
          </div>
        </div>

        {/* 表单按钮 */}
        <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="submit" variant="neon" disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : isEditing ? '更新' : '创建'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
