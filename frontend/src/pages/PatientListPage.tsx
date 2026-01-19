/**
 * PatientListPage 患者列表页面
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Sparkles,
  UserPlus,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from '@/components/ui/Table'
import { PatientForm } from '@/components/patient/PatientForm'
import { AIConsultationDialog } from '@/components/patient/AIConsultationDialog'
import { getPatients, createPatient, updatePatient, deletePatient } from '@/api/patient.api'
import type { Patient, SearchParams } from '@/@types'
import type { CreatePatientRequest } from '@/api/patient.api'
import { formatDate } from '@/utils/format'

export const PatientListPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState<SearchParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
  })
  const [genderFilter, setGenderFilter] = useState('')
  const [bloodTypeFilter, setBloodTypeFilter] = useState('')

  // 表单和对话框状态
  const [formOpen, setFormOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>()
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>()

  // 获取患者列表
  const { data, isLoading } = useQuery({
    queryKey: ['patients', searchParams, genderFilter, bloodTypeFilter],
    queryFn: () =>
      getPatients({
        ...searchParams,
        gender: genderFilter || undefined,
        bloodType: bloodTypeFilter || undefined,
      }),
  })

  // 创建患者
  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('患者创建成功')
      setFormOpen(false)
      setEditingPatient(undefined)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '创建失败')
    },
  })

  // 更新患者
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePatientRequest> }) =>
      updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('患者信息更新成功')
      setFormOpen(false)
      setEditingPatient(undefined)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新失败')
    },
  })

  // 删除患者
  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('患者删除成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    },
  })

  // 处理搜索
  const handleSearch = (keyword: string) => {
    setSearchParams((prev) => ({ ...prev, keyword, page: 1 }))
  }

  // 处理创建
  const handleCreate = () => {
    setEditingPatient(undefined)
    setFormOpen(true)
  }

  // 处理编辑
  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient)
    setFormOpen(true)
  }

  // 处理删除
  const handleDelete = (patient: Patient) => {
    if (confirm(`确定要删除患者【${patient.name}】吗？此操作不可恢复。`)) {
      deleteMutation.mutate(patient.id)
    }
  }

  // 处理表单提交
  const handleFormSubmit = async (data: CreatePatientRequest) => {
    if (editingPatient) {
      await updateMutation.mutateAsync({ id: editingPatient.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  // 处理查看详情
  const handleViewDetail = (patient: Patient) => {
    navigate(`/patients/${patient.id}`)
  }

  // 处理AI问诊
  const handleAIConsultation = (patient: Patient) => {
    setSelectedPatient(patient)
    setAiDialogOpen(true)
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

  // 处理分页
  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }))
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gradient mb-2">患者管理</h1>
            <p className="text-text-secondary">管理患者信息，查看就诊记录</p>
          </div>
          <Button onClick={handleCreate} variant="primary" size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            新建患者
          </Button>
        </div>

        {/* 搜索和筛选 */}
        <Card variant="glass">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="搜索患者姓名、电话、身份证..."
                leftIcon={<Search className="w-5 h-5" />}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <NativeSelect value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
              <option value="">全部性别</option>
              <option value="MALE">男</option>
              <option value="FEMALE">女</option>
              <option value="OTHER">其他</option>
            </NativeSelect>
            <NativeSelect
              value={bloodTypeFilter}
              onChange={(e) => setBloodTypeFilter(e.target.value)}
            >
              <option value="">全部血型</option>
              <option value="A">A型</option>
              <option value="B">B型</option>
              <option value="AB">AB型</option>
              <option value="O">O型</option>
              <option value="UNKNOWN">未知</option>
            </NativeSelect>
          </div>
        </Card>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card variant="neon-blue" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">总患者数</p>
                  <p className="text-3xl font-bold text-gradient">{data?.total || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-primary-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card variant="neon-purple" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">本月新增</p>
                  <p className="text-3xl font-bold text-gradient">
                    {data?.data.filter((p) => {
                      const created = new Date(p.createdAt)
                      const now = new Date()
                      return (
                        created.getMonth() === now.getMonth() &&
                        created.getFullYear() === now.getFullYear()
                      )
                    }).length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary-500/20 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-secondary-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card variant="neon-cyan" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">男性患者</p>
                  <p className="text-3xl font-bold text-gradient">
                    {data?.data.filter((p) => p.gender === 'MALE').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                  <Filter className="w-6 h-6 text-accent-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card variant="neon-blue" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">女性患者</p>
                  <p className="text-3xl font-bold text-gradient">
                    {data?.data.filter((p) => p.gender === 'FEMALE').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Filter className="w-6 h-6 text-primary-400" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* 患者列表 */}
        <Card variant="glass">
          <Table loading={isLoading}>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>性别</TableHead>
                <TableHead>年龄</TableHead>
                <TableHead>血型</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((patient) => (
                  <TableRow key={patient.id} clickable>
                    <TableCell>
                      <div className="font-medium text-text-primary">{patient.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          patient.gender === 'MALE'
                            ? 'blue'
                            : patient.gender === 'FEMALE'
                            ? 'purple'
                            : 'gray'
                        }
                      >
                        {patient.gender === 'MALE' ? '男' : patient.gender === 'FEMALE' ? '女' : '其他'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-text-secondary">
                        {calculateAge(patient.birthDate)}岁
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="cyan">{patient.bloodType || '未知'}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-text-secondary">{patient.phone}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-text-tertiary text-sm">
                        {formatDate(patient.createdAt, 'yyyy-MM-dd')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(patient)}
                          className="p-2 text-text-tertiary hover:text-primary-400 transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(patient)}
                          className="p-2 text-text-tertiary hover:text-accent-400 transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAIConsultation(patient)}
                          className="p-2 text-text-tertiary hover:text-secondary-400 transition-colors"
                          title="AI问诊"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(patient)}
                          className="p-2 text-text-tertiary hover:text-error-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      title="暂无患者数据"
                      description="点击右上角【新建患者】按钮创建第一个患者"
                      icon={<UserPlus className="w-12 h-12" />}
                      action={
                        <Button onClick={handleCreate} variant="primary">
                          <Plus className="w-5 h-5 mr-2" />
                          创建患者
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border-subtle">
              <p className="text-sm text-text-tertiary">
                共 {data.total} 条记录，第 {data.page} / {data.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page === data.totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 患者表单对话框 */}
      <PatientForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingPatient(undefined)
        }}
        onSubmit={handleFormSubmit}
        patient={editingPatient}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* AI问诊对话框 */}
      {selectedPatient && (
        <AIConsultationDialog
          open={aiDialogOpen}
          onClose={() => {
            setAiDialogOpen(false)
            setSelectedPatient(undefined)
          }}
          patient={selectedPatient}
        />
      )}
    </DashboardLayout>
  )
}
