/**
 * PatientForm 患者创建/编辑表单组件
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import type { Patient } from '@/@types'
import type { CreatePatientRequest } from '@/api/patient.api'

// 表单验证Schema
const patientSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符').max(50, '姓名最多50个字符'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { required_error: '请选择性别' }),
  birthDate: z.string().min(1, '请选择出生日期'),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  idCard: z
    .string()
    .regex(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, '请输入有效的身份证号码'),
  address: z.string().optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', 'UNKNOWN'], { required_error: '请选择血型' }).optional(),
  allergies: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码')
    .optional()
    .or(z.literal('')),
  medicalHistory: z.string().optional(),
})

type PatientFormData = z.infer<typeof patientSchema>

interface PatientFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreatePatientRequest) => Promise<void>
  patient?: Patient
  isLoading?: boolean
}

export const PatientForm = ({ open, onClose, onSubmit, patient, isLoading }: PatientFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  })

  // 编辑模式时填充表单
  useEffect(() => {
    if (patient && open) {
      setValue('name', patient.name)
      setValue('gender', patient.gender)
      // 将ISO格式日期转换为yyyy-MM-dd格式
      setValue('birthDate', patient.birthDate?.split('T')[0] || '')
      setValue('phone', patient.phone)
      setValue('idCard', patient.idCard)
      setValue('address', patient.address || '')
      setValue('bloodType', patient.bloodType)
      // allergies可能是字符串或数组，统一转换为逗号分隔的字符串
      const allergiesText = Array.isArray(patient.allergies)
        ? patient.allergies.join(', ')
        : patient.allergies || ''
      setValue('allergies', allergiesText)
      setValue('emergencyContact', patient.emergencyContact || '')
      setValue('emergencyPhone', patient.emergencyPhone || '')
      setValue('medicalHistory', patient.medicalHistory || '')
    } else if (!patient && open) {
      reset()
    }
  }, [patient, open, setValue, reset])

  const handleFormSubmit = async (data: PatientFormData) => {
    const submitData: CreatePatientRequest = {
      ...data,
      // 后端期望 allergies 为字符串，而非数组
      allergies: data.allergies || undefined,
    }
    await onSubmit(submitData)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patient ? '编辑患者信息' : '新建患者'}
      description="请填写患者的基本信息"
      size="xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="姓名"
            required
            placeholder="请输入姓名"
            error={errors.name?.message}
            {...register('name')}
          />

          <NativeSelect
            label="性别"
            required
            error={errors.gender?.message}
            {...register('gender')}
          >
            <option value="">请选择性别</option>
            <option value="MALE">男</option>
            <option value="FEMALE">女</option>
            <option value="OTHER">其他</option>
          </NativeSelect>

          <Input
            label="出生日期"
            type="date"
            required
            error={errors.birthDate?.message}
            {...register('birthDate')}
          />

          <NativeSelect
            label="血型"
            error={errors.bloodType?.message}
            {...register('bloodType')}
          >
            <option value="">请选择血型</option>
            <option value="A">A型</option>
            <option value="B">B型</option>
            <option value="AB">AB型</option>
            <option value="O">O型</option>
            <option value="UNKNOWN">未知</option>
          </NativeSelect>

          <Input
            label="手机号码"
            type="tel"
            required
            placeholder="请输入手机号码"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="身份证号"
            required
            placeholder="请输入身份证号"
            error={errors.idCard?.message}
            {...register('idCard')}
          />
        </div>

        {/* 地址 */}
        <Input
          label="地址"
          placeholder="请输入地址"
          error={errors.address?.message}
          {...register('address')}
        />

        {/* 过敏史 */}
        <Textarea
          label="过敏史"
          placeholder="请输入过敏史，多个过敏源用逗号分隔"
          rows={2}
          error={errors.allergies?.message}
          {...register('allergies')}
        />

        {/* 病史 */}
        <Textarea
          label="既往病史"
          placeholder="请输入既往病史"
          rows={3}
          error={errors.medicalHistory?.message}
          {...register('medicalHistory')}
        />

        {/* 紧急联系人 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="紧急联系人"
            placeholder="请输入紧急联系人姓名"
            error={errors.emergencyContact?.message}
            {...register('emergencyContact')}
          />

          <Input
            label="紧急联系电话"
            type="tel"
            placeholder="请输入紧急联系电话"
            error={errors.emergencyPhone?.message}
            {...register('emergencyPhone')}
          />
        </div>

        {/* 底部按钮 */}
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            {patient ? '保存修改' : '创建患者'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
