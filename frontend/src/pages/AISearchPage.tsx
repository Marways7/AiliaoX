/**
 * AI病历智能检索页面 - 里程碑6
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NativeSelect } from '@/components/ui/NativeSelect'
import { Loading } from '@/components/ui/Loading'
import { Badge } from '@/components/ui/Badge'

import {
  searchMedicalRecordsWithAI,
  MedicalRecord,
  MedicalRecordStatus
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

const exampleQueries = [
  '查找所有高血压患者的病历',
  '找出最近一个月胸痛的患者',
  '搜索糖尿病合并冠心病的病例',
  '查询使用阿司匹林治疗的患者',
  '找出需要手术治疗的患者'
]

const statusBadgeMap: Record<MedicalRecordStatus, { variant: 'gray' | 'success' | 'blue'; label: string }> = {
  [MedicalRecordStatus.DRAFT]: { variant: 'gray', label: '草稿' },
  [MedicalRecordStatus.COMPLETED]: { variant: 'success', label: '已完成' },
  [MedicalRecordStatus.ARCHIVED]: { variant: 'blue', label: '已归档' },
}

export function AISearchPage() {
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filters, setFilters] = useState<{
    patientId?: string
    department?: string
    startDate?: string
    endDate?: string
  }>({})

  const [searchResults, setSearchResults] = useState<{
    records: MedicalRecord[]
    relevanceScores: { recordId: string; score: number }[]
    explanation: string
  } | null>(null)

  // AI搜索
  const searchMutation = useMutation({
    mutationFn: ({ query, filters }: { query: string; filters?: any }) =>
      searchMedicalRecordsWithAI(query, filters),
    onSuccess: (data) => {
      setSearchResults(data)
      if (data.records.length === 0) {
        toast.info('没有找到匹配的病历')
      } else {
        toast.success(`找到 ${data.records.length} 条相关病历`)
      }
    },
    onError: () => {
      toast.error('AI检索失败，请稍后重试')
    },
  })

  // 执行搜索
  const handleSearch = () => {
    if (!query.trim()) {
      toast.error('请输入搜索内容')
      return
    }

    const searchFilters: any = {}
    if (filters.patientId) searchFilters.patientId = filters.patientId
    if (filters.department && filters.department !== '全部') searchFilters.department = filters.department
    if (filters.startDate) searchFilters.startDate = filters.startDate
    if (filters.endDate) searchFilters.endDate = filters.endDate

    searchMutation.mutate({ query, filters: searchFilters })
  }

  // 使用示例查询
  const handleExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery)
  }

  // 获取相关性评分
  const getRelevanceScore = (recordId: string) => {
    const scoreData = searchResults?.relevanceScores.find(s => s.recordId === recordId)
    return scoreData ? scoreData.score : 0
  }

  // 高亮关键词
  const highlightText = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0) return text

    let result = text
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi')
      result = result.replace(regex, '<mark class="bg-primary-500/30 text-primary-300">$1</mark>')
    })
    return result
  }

  // 提取关键词（简单实现）
  const extractKeywords = () => {
    return query.split(/\s+/).filter(k => k.length > 1)
  }

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
            <Sparkles className="w-8 h-8 text-secondary-500" />
            AI智能检索
          </h1>
          <p className="text-text-secondary mt-2">使用自然语言搜索病历，AI为您智能匹配</p>
        </motion.div>

        {/* 搜索区域 */}
        <Card variant="neon-purple" padding="lg">
          <div className="space-y-4">
            {/* 主搜索框 */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="尝试输入：查找所有高血压患者的病历..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg h-14 neon-input"
                  leftIcon={<Search className="w-6 h-6" />}
                />
              </div>
              <Button
                size="lg"
                variant="neon"
                onClick={handleSearch}
                loading={searchMutation.isPending}
                className="px-8"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                AI搜索
              </Button>
            </div>

            {/* 示例查询 */}
            <div>
              <p className="text-xs text-text-tertiary mb-2">试试这些查询：</p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleQuery(example)}
                    className="px-3 py-1 text-xs bg-background-secondary/50 hover:bg-background-secondary text-text-secondary hover:text-primary-400 rounded-full border border-border-subtle hover:border-primary-500/50 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* 高级筛选 */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                高级筛选
              </button>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">患者ID</label>
                    <Input
                      placeholder="患者ID"
                      value={filters.patientId || ''}
                      onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">科室</label>
                    <NativeSelect
                      value={filters.department || '全部'}
                      onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">开始日期</label>
                    <Input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">结束日期</label>
                    <Input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </Card>

        {/* 搜索结果 */}
        {searchMutation.isPending && (
          <Card variant="glass" padding="lg">
            <Loading size="lg" text="AI正在分析搜索结果..." />
          </Card>
        )}

        {searchResults && (
          <div className="space-y-6">
            {/* AI解释 */}
            {searchResults.explanation && (
              <Card variant="glass" padding="lg">
                <CardHeader
                  title="AI解释"
                  description="AI对搜索结果的智能分析"
                />
                <CardBody>
                  <p className="text-text-secondary whitespace-pre-wrap">{searchResults.explanation}</p>
                </CardBody>
              </Card>
            )}

            {/* 搜索结果列表 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-text-primary">
                  找到 {searchResults.records.length} 条相关病历
                </h2>
              </div>

              {searchResults.records.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.records.map((record, index) => {
                    const relevanceScore = getRelevanceScore(record.id)
                    const statusConfig = statusBadgeMap[record.status]

                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          variant="glass"
                          hover
                          padding="lg"
                          className="cursor-pointer"
                          onClick={() => navigate(`/medical-records/${record.id}`)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-primary-400" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="text-lg font-semibold text-text-primary">
                                    {record.recordNumber}
                                  </h3>
                                  <Badge variant={statusConfig.variant} size="sm">
                                    {statusConfig.label}
                                  </Badge>
                                  {relevanceScore > 0 && (
                                    <div className="flex items-center gap-1 text-sm">
                                      <TrendingUp className="w-4 h-4 text-success-400" />
                                      <span className="text-success-400 font-medium">
                                        相关度: {(relevanceScore * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm text-text-tertiary flex-shrink-0 ml-4">
                                  {formatDate(record.visitDate)}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mb-3 text-sm">
                                <div>
                                  <span className="text-text-tertiary">患者: </span>
                                  <span className="text-text-primary">{record.patientName}</span>
                                </div>
                                <div>
                                  <span className="text-text-tertiary">科室: </span>
                                  <span className="text-text-primary">{record.department}</span>
                                </div>
                                <div>
                                  <span className="text-text-tertiary">医生: </span>
                                  <span className="text-text-primary">{record.doctorName}</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div>
                                  <span className="text-sm text-text-tertiary">主诉: </span>
                                  <span
                                    className="text-sm text-text-secondary"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightText(record.chiefComplaint, extractKeywords())
                                    }}
                                  />
                                </div>
                                <div>
                                  <span className="text-sm text-text-tertiary">诊断: </span>
                                  <span
                                    className="text-sm text-text-secondary"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightText(record.diagnosis, extractKeywords())
                                    }}
                                  />
                                </div>
                              </div>

                              {/* 相关性进度条 */}
                              {relevanceScore > 0 && (
                                <div className="mt-3">
                                  <div className="h-1 bg-background-secondary rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${relevanceScore * 100}%` }}
                                      transition={{ duration: 0.5, delay: index * 0.1 }}
                                      className="h-full bg-gradient-to-r from-success-500 to-primary-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <Card variant="glass" padding="lg">
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 mx-auto text-text-tertiary mb-4" />
                    <p className="text-text-secondary text-lg mb-2">没有找到匹配的病历</p>
                    <p className="text-text-tertiary text-sm">
                      尝试使用不同的关键词或调整筛选条件
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!searchResults && !searchMutation.isPending && (
          <Card variant="glass" padding="lg">
            <div className="text-center py-12">
              <Sparkles className="w-20 h-20 mx-auto text-secondary-500 mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                开始智能检索
              </h3>
              <p className="text-text-secondary mb-6">
                输入自然语言描述，AI会为您智能匹配相关病历
              </p>
              <div className="flex justify-center gap-2">
                {exampleQueries.slice(0, 3).map((example, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExampleQuery(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
