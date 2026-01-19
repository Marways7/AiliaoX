/**
 * 药物库管理页面
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { MedicineForm } from '@/components/medicine/MedicineForm'
import {
  getMedicines,
  getMedicineStatistics,
  getMedicineCategories,
  deleteMedicine,
  type Medicine,
  type MedicineSearchParams,
} from '@/api/medicine.api'
import { Package, AlertTriangle, Calendar, Plus, Pencil, Trash2 } from 'lucide-react'

export function MedicineListPage() {
  const [searchParams, setSearchParams] = useState<MedicineSearchParams>({
    page: 1,
    pageSize: 20,
  })
  const [showForm, setShowForm] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)

  // 获取药物列表
  const { data: medicinesData, isLoading, refetch } = useQuery({
    queryKey: ['medicines', searchParams],
    queryFn: () => getMedicines(searchParams),
  })

  // 获取药品分类列表
  const { data: categories = [] } = useQuery({
    queryKey: ['medicineCategories'],
    queryFn: getMedicineCategories,
  })

  // 获取统计信息
  const { data: statistics } = useQuery({
    queryKey: ['medicine-statistics'],
    queryFn: getMedicineStatistics,
  })

  // 处理搜索
  const handleSearch = (keyword: string) => {
    setSearchParams(prev => ({ ...prev, keyword, page: 1 }))
  }

  // 处理分类筛选
  const handleCategoryFilter = (categoryId: string) => {
    setSearchParams(prev => ({
      ...prev,
      categoryId: categoryId || undefined,
      page: 1,
    }))
  }

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这个药品吗？')) return

    try {
      await deleteMedicine(id)
      toast.success('删除成功')
      refetch()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 打开编辑表单
  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine)
    setShowForm(true)
  }

  // 打开新建表单
  const handleCreate = () => {
    setEditingMedicine(null)
    setShowForm(true)
  }

  // 表单关闭
  const handleFormClose = () => {
    setShowForm(false)
    setEditingMedicine(null)
  }

  // 表单提交成功
  const handleFormSuccess = () => {
    handleFormClose()
    refetch()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading size="lg" text="加载药物库..." />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">药物库管理</h1>
            <p className="text-text-secondary mt-2">管理医院药品信息和库存</p>
          </div>
          <Button onClick={handleCreate} variant="neon" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            新建药品
          </Button>
        </div>

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">总药品数</p>
                    <p className="text-3xl font-bold text-gradient mt-2">
                      {statistics.total}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                    <Package className="h-8 w-8 text-neon-blue" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">在售药品</p>
                    <p className="text-3xl font-bold text-neon-blue mt-2">
                      {statistics.total}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                    <Package className="h-8 w-8 text-neon-cyan" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">低库存</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">
                      {statistics.alerts?.lowStock || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="card-neon">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-sm">即将过期</p>
                    <p className="text-3xl font-bold text-orange-500 mt-2">
                      {statistics.alerts?.expired || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <Calendar className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}

        {/* 搜索和筛选 */}
        <Card className="card-neon p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索药品名称、通用名、批准文号..."
                value={searchParams.name || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-48">
              <NativeSelect
                value={searchParams.categoryId || ''}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="w-full"
              >
                <option value="">全部分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </Card>

        {/* 药物列表 */}
        <Card className="card-neon">
          <DataTable
            columns={[
              {
                key: 'name',
                title: '药品名称',
                render: (medicine: Medicine) => (
                  <div>
                    <div className="font-medium text-text-primary">{medicine.name}</div>
                    {medicine.genericName && (
                      <div className="text-sm text-text-secondary">{medicine.genericName}</div>
                    )}
                  </div>
                ),
              },
              {
                key: 'category',
                title: '分类',
                render: (medicine: Medicine) => (
                  <Badge variant="info">
                    {medicine.category.name}
                  </Badge>
                ),
              },
              {
                key: 'specification',
                title: '规格',
                render: (medicine: Medicine) => (
                  <div className="text-sm">
                    <div>{medicine.specification}</div>
                    <div className="text-text-secondary">{medicine.unit}</div>
                  </div>
                ),
              },
              {
                key: 'stock',
                title: '库存',
                render: (medicine: Medicine) => {
                  const totalStock = medicine.stocks?.reduce((sum, stock) => sum + stock.quantity, 0) || 0
                  const minStock = medicine.stocks?.[0]?.minStock || 0
                  return (
                    <div className="text-sm">
                      <div className={totalStock <= minStock && totalStock > 0 ? 'text-red-500 font-bold' : ''}>
                        {totalStock} {medicine.unit}
                      </div>
                      {minStock > 0 && (
                        <div className="text-text-secondary">
                          最小: {minStock} {medicine.unit}
                        </div>
                      )}
                    </div>
                  )
                },
              },
              {
                key: 'price',
                title: '单价',
                render: (medicine: Medicine) => (
                  <div className="text-neon-cyan font-medium">
                    ¥{Number(medicine.price).toFixed(2)}
                  </div>
                ),
              },
              {
                key: 'status',
                title: '状态',
                render: (medicine: Medicine) => (
                  <div className="space-y-1">
                    <Badge variant="info">{medicine.category.name}</Badge>
                    {medicine.stocks && medicine.stocks.length > 0 && (
                      <Badge variant="success">有库存</Badge>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                title: '操作',
                render: (medicine: Medicine) => (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(medicine)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(medicine.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={medicinesData?.data || []}
            emptyText="暂无药品数据"
          />

          {/* 分页 */}
          {medicinesData && medicinesData.total > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div className="text-sm text-text-secondary">
                共 {medicinesData.total} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={searchParams.page === 1}
                  onClick={() =>
                    setSearchParams(prev => ({ ...prev, page: (prev.page || 1) - 1 }))
                  }
                >
                  上一页
                </Button>
                <div className="flex items-center px-4 text-sm text-text-secondary">
                  第 {searchParams.page} / {Math.ceil(medicinesData.total / (searchParams.pageSize || 20))} 页
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    (searchParams.page || 1) >=
                    Math.ceil(medicinesData.total / (searchParams.pageSize || 20))
                  }
                  onClick={() =>
                    setSearchParams(prev => ({ ...prev, page: (prev.page || 1) + 1 }))
                  }
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 药品表单Modal */}
      {showForm && (
        <MedicineForm
          medicine={editingMedicine}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </DashboardLayout>
  )
}
