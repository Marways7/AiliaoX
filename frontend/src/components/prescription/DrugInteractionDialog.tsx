/**
 * 药物相互作用检查Dialog
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { checkDrugInteractions } from '@/api/prescription.api'
import { getMedicines, type Medicine } from '@/api/medicine.api'
import { AlertTriangle, Plus, X, Search } from 'lucide-react'

interface DrugInteractionDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function DrugInteractionDialog({ isOpen, onClose }: DrugInteractionDialogProps) {
  const [selectedMedicines, setSelectedMedicines] = useState<Medicine[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [hasChecked, setHasChecked] = useState(false)

  // 搜索药品
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines', searchKeyword],
    queryFn: () => getMedicines({ name: searchKeyword, page: 1, pageSize: 20 }),
    enabled: showSearch && searchKeyword.length > 0,
  })

  // 检查药物相互作用
  const {
    data: interactionResult,
    isLoading: isChecking,
    refetch: checkInteractions,
  } = useQuery({
    queryKey: ['drug-interactions', selectedMedicines.map(m => m.id)],
    queryFn: () => checkDrugInteractions(selectedMedicines.map(m => m.id)),
    enabled: false,
  })

  // 添加药品
  const handleAddMedicine = (medicine: Medicine) => {
    if (selectedMedicines.find(m => m.id === medicine.id)) {
      return
    }
    setSelectedMedicines([...selectedMedicines, medicine])
    setShowSearch(false)
    setSearchKeyword('')
    setHasChecked(false)
  }

  // 移除药品
  const handleRemoveMedicine = (medicineId: string) => {
    setSelectedMedicines(selectedMedicines.filter(m => m.id !== medicineId))
    setHasChecked(false)
  }

  // 执行检查
  const handleCheck = () => {
    if (selectedMedicines.length < 2) {
      return
    }
    checkInteractions()
    setHasChecked(true)
  }

  // 重置
  const handleReset = () => {
    setSelectedMedicines([])
    setHasChecked(false)
  }

  // 获取严重程度配置
  const getSeverityConfig = (severity: 'MILD' | 'MODERATE' | 'SEVERE') => {
    const configs = {
      MILD: {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        label: '轻度',
        variant: 'default' as const,
      },
      MODERATE: {
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        label: '中度',
        variant: 'warning' as const,
      },
      SEVERE: {
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: '严重',
        variant: 'error' as const,
      },
    }
    return configs[severity]
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="药物相互作用检查" size="xl">
      <div className="space-y-6">
        {/* 药品选择区 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">
              已选药品 ({selectedMedicines.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加药品
            </Button>
          </div>

          {/* 药品搜索 */}
          {showSearch && (
            <div className="space-y-2">
              <Input
                placeholder="输入药品名称搜索..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
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
                        {selectedMedicines.find(m => m.id === medicine.id) && (
                          <Badge variant="success">已添加</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSearch(false)
                  setSearchKeyword('')
                }}
              >
                取消
              </Button>
            </div>
          )}

          {/* 已选药品列表 */}
          {selectedMedicines.length > 0 ? (
            <div className="space-y-2">
              {selectedMedicines.map((medicine) => (
                <motion.div
                  key={medicine.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-background-secondary border border-white/10 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-text-primary">{medicine.name}</div>
                    <div className="text-sm text-text-secondary">
                      {medicine.specification}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(medicine.id)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>请添加至少2个药品进行检查</p>
            </div>
          )}
        </div>

        {/* 检查按钮 */}
        {selectedMedicines.length >= 2 && !hasChecked && (
          <Button
            variant="neon"
            onClick={handleCheck}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? (
              <>
                <Loading size="sm" className="mr-2" />
                检查中...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                检查药物相互作用
              </>
            )}
          </Button>
        )}

        {/* 检查结果 */}
        {hasChecked && interactionResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* 整体风险 */}
            <div
              className={`p-4 rounded-lg ${
                interactionResult.risk === 'HIGH'
                  ? 'bg-red-500/10 border border-red-500/30'
                  : interactionResult.risk === 'MEDIUM'
                  ? 'bg-orange-500/10 border border-orange-500/30'
                  : 'bg-green-500/10 border border-green-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">整体风险等级</span>
                <Badge
                  variant={
                    interactionResult.risk === 'HIGH'
                      ? 'danger'
                      : interactionResult.risk === 'MEDIUM'
                      ? 'warning'
                      : 'success'
                  }
                >
                  {interactionResult.risk === 'HIGH'
                    ? '高风险'
                    : interactionResult.risk === 'MEDIUM'
                    ? '中风险'
                    : '低风险'}
                </Badge>
              </div>
            </div>

            {/* 相互作用列表 */}
            {interactionResult.interactions && interactionResult.interactions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="font-medium text-text-primary">
                    发现 {interactionResult.interactions.length} 个药物相互作用
                  </span>
                </div>
                {interactionResult.interactions.map((interaction, index) => {
                  const config = getSeverityConfig(interaction.severity)
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-text-primary">
                              {interaction.drug1} + {interaction.drug2}
                            </span>
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </div>
                          <p className="text-sm text-text-secondary">{interaction.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-text-primary text-center">未发现药物相互作用，可以安全使用</p>
              </div>
            )}

            {/* 建议 */}
            {interactionResult.recommendations && interactionResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary">用药建议</h4>
                <div className="space-y-2">
                  {interactionResult.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="p-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg"
                    >
                      <p className="text-sm text-text-primary">• {recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 重新检查按钮 */}
            <Button variant="outline" onClick={handleReset} className="w-full">
              重新检查
            </Button>
          </motion.div>
        )}

        {/* 关闭按钮 */}
        <div className="flex justify-end pt-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  )
}
