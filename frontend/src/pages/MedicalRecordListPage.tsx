/**
 * 病历列表页面 - 里程碑6
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText,
  Search,
  Plus,
  Sparkles,

  Edit,
  Archive,
  Trash2,
  FileDown
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { DataTable } from '@/components/ui/DataTable'

import {
  getMedicalRecords,
  deleteMedicalRecord,
  archiveMedicalRecord,
  exportMedicalRecordToPDF,
  MedicalRecord,
  MedicalRecordStatus,
  MedicalRecordSearchParams
} from '@/api/medical-record.api'
import { formatDate } from '@/utils/format'

const departments = [
  '全部',
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

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: MedicalRecordStatus.DRAFT },
  { label: '已完成', value: MedicalRecordStatus.COMPLETED },
  { label: '已归档', value: MedicalRecordStatus.ARCHIVED },
]

const statusBadgeMap: Record<MedicalRecordStatus, { variant: 'gray' | 'success' | 'blue'; label: string }> = {
  [MedicalRecordStatus.DRAFT]: { variant: 'gray', label: '草稿' },
  [MedicalRecordStatus.COMPLETED]: { variant: 'success', label: '已完成' },
  [MedicalRecordStatus.ARCHIVED]: { variant: 'blue', label: '已归档' },
}

export function MedicalRecordListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState<MedicalRecordSearchParams>({
    page: 1,
    pageSize: 10,
  })
  const [keyword, setKeyword] = useState('')

  // 获取病历列表
  const { data, isLoading } = useQuery({
    queryKey: ['medical-records', searchParams],
    queryFn: () => getMedicalRecords(searchParams),
  })

  // 删除病历
  const deleteMutation = useMutation({
    mutationFn: deleteMedicalRecord,
    onSuccess: () => {
      toast.success('病历删除成功')
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
    },
    onError: () => {
      toast.error('病历删除失败')
    },
  })

  // 归档病历
  const archiveMutation = useMutation({
    mutationFn: archiveMedicalRecord,
    onSuccess: () => {
      toast.success('病历归档成功')
      queryClient.invalidateQueries({ queryKey: ['medical-records'] })
    },
    onError: () => {
      toast.error('病历归档失败')
    },
  })

  // 导出PDF
  const handleExportPDF = async (recordId: string, recordNumber: string) => {
    try {
      const blob = await exportMedicalRecordToPDF(recordId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `病历-${recordNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('病历导出成功')
    } catch (error) {
      toast.error('病历导出失败')
    }
  }

  // 搜索处理
  const handleSearch = () => {
    setSearchParams(prev => ({
      ...prev,
      keyword: keyword.trim() || undefined, // 使用keyword参数进行全文搜索
      page: 1,
    }))
  }

  // 清空搜索
  const handleClearSearch = () => {
    setKeyword('')
    setSearchParams(prev => ({
      ...prev,
      keyword: undefined,
      page: 1,
    }))
  }

  // 科室筛选
  const handleDepartmentChange = (department: string) => {
    setSearchParams(prev => ({
      ...prev,
      department: department === '全部' ? undefined : department,
      page: 1,
    }))
  }

  // 状态筛选
  const handleStatusChange = (status: string) => {
    setSearchParams(prev => ({
      ...prev,
      status: status ? (status as MedicalRecordStatus) : undefined,
      page: 1,
    }))
  }

  // 分页处理
  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }))
  }

  // 表格列定义
  const columns = [
    {
      key: 'recordNumber',
      title: '病历编号',
      render: (record: MedicalRecord) => (
        <span className="font-mono text-primary-400">{record.recordNumber}</span>
      ),
    },
    {
      key: 'patientName',
      title: '患者姓名',
    },
    {
      key: 'department',
      title: '科室',
    },
    {
      key: 'doctorName',
      title: '医生',
    },
    {
      key: 'visitDate',
      title: '就诊日期',
      render: (record: MedicalRecord) => formatDate(record.visitDate),
    },
    {
      key: 'diagnosis',
      title: '诊断',
      render: (record: MedicalRecord) => (
        <span className="line-clamp-2">{record.diagnosis}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (record: MedicalRecord) => {
        const config = statusBadgeMap[record.status]
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      key: 'actions',
      title: '操作',
      render: (record: MedicalRecord) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/medical-records/${record.id}`)}
            icon={<FileText className="w-4 h-4" />}
          >
            查看
          </Button>
          {record.status === MedicalRecordStatus.DRAFT && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/medical-records/${record.id}/edit`)}
              icon={<Edit className="w-4 h-4" />}
            >
              编辑
            </Button>
          )}
          {record.status === MedicalRecordStatus.COMPLETED && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => archiveMutation.mutate(record.id)}
              loading={archiveMutation.isPending}
              icon={<Archive className="w-4 h-4" />}
            >
              归档
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleExportPDF(record.id, record.recordNumber)}
            icon={<FileDown className="w-4 h-4" />}
          >
            导出
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (window.confirm('确定要删除这条病历吗？')) {
                deleteMutation.mutate(record.id)
              }
            }}
            loading={deleteMutation.isPending}
            icon={<Trash2 className="w-4 h-4" />}
          >
            删除
          </Button>
        </div>
      ),
    },
  ]

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
              病历管理
            </h1>
            <p className="text-text-secondary mt-2">管理患者病历信息，支持AI智能检索和分析</p>
          </div>
        </motion.div>

        {/* 搜索和筛选栏 */}
        <Card variant="glass" padding="lg">
          <div className="space-y-4">
            {/* 搜索框 */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索病历号、主诉、诊断、治疗方案..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  leftIcon={<Search className="w-5 h-5" />}
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="w-5 h-5" />
                搜索
              </Button>
              {keyword && (
                <Button variant="ghost" onClick={handleClearSearch}>
                  清空
                </Button>
              )}
            </div>

            {/* 筛选器和操作按钮 */}
            <div className="flex flex-wrap gap-4">
              {/* 科室筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">科室:</span>
                <div className="flex gap-2">
                  {departments.map((dept) => (
                    <Button
                      key={dept}
                      size="sm"
                      variant={
                        (dept === '全部' && !searchParams.department) ||
                        searchParams.department === dept
                          ? 'primary'
                          : 'ghost'
                      }
                      onClick={() => handleDepartmentChange(dept)}
                    >
                      {dept}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 状态筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">状态:</span>
                <NativeSelect
                value={searchParams.status || ''}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </NativeSelect>
              </div>

              <div className="flex-1" />

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/medical-records/search')}
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  AI智能检索
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate('/medical-records/new')}
                  icon={<Plus className="w-5 h-5" />}
                >
                  新建病历
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 病历列表 */}
        <Card variant="glass" padding="none">
          {isLoading ? (
            <div className="p-12">
              <Loading size="lg" text="加载病历列表..." />
            </div>
          ) : data && data.data.length > 0 ? (
            <DataTable
              columns={columns}
              data={data.data}
              currentPage={data.page}
              totalPages={data.totalPages}
              totalItems={data.total}
              pageSize={data.pageSize}
              onPageChange={handlePageChange}
            />
          ) : (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-secondary text-lg mb-2">暂无病历记录</p>
              <p className="text-text-tertiary text-sm mb-6">
                {keyword || searchParams.department || searchParams.status
                  ? '没有找到符合条件的病历，请尝试其他筛选条件'
                  : '开始创建您的第一条病历记录'}
              </p>
              <Button onClick={() => navigate('/medical-records/new')} icon={<Plus className="w-5 h-5" />}>
                新建病历
              </Button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
