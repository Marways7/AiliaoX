/**
 * AI用药审查结果组件
 */
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react'
import type { AIReviewResult as AIReviewResultType } from '@/api/prescription.api'

interface AIReviewResultProps {
  result: AIReviewResultType
}

export function AIReviewResult({ result }: AIReviewResultProps) {
  // 获取风险等级配置
  const getRiskConfig = () => {
    const configs = {
      LOW: {
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: CheckCircle,
        label: '低风险',
      },
      MEDIUM: {
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: AlertCircle,
        label: '中风险',
      },
      HIGH: {
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        icon: AlertTriangle,
        label: '高风险',
      },
    }
    return configs[result.overallRisk]
  }

  const riskConfig = getRiskConfig()
  const RiskIcon = riskConfig.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`card-neon p-6 ${riskConfig.borderColor}`}>
        <div className="space-y-6">
          {/* 标题和整体风险 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${riskConfig.bgColor}`}>
                <RiskIcon className={`h-6 w-6 ${riskConfig.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gradient">AI智能审查结果</h3>
                <p className="text-sm text-text-secondary mt-1">基于大模型的用药安全分析</p>
              </div>
            </div>
            <Badge
              variant={
                result.overallRisk === 'LOW'
                  ? 'success'
                  : result.overallRisk === 'MEDIUM'
                  ? 'warning'
                  : 'danger'
              }
            >
              {riskConfig.label}
            </Badge>
          </div>

          {/* 警告列表 */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-500 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>警告事项 ({result.warnings.length})</span>
              </div>
              <div className="space-y-2">
                {result.warnings.map((warning, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-primary">{warning}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 药物相互作用 */}
          {result.interactions && result.interactions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-500 font-semibold">
                <AlertCircle className="h-5 w-5" />
                <span>药物相互作用 ({result.interactions.length})</span>
              </div>
              <div className="space-y-2">
                {result.interactions.map((interaction, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg ${
                      interaction.severity === 'SEVERE'
                        ? 'bg-red-500/10 border border-red-500/30'
                        : interaction.severity === 'MODERATE'
                        ? 'bg-orange-500/10 border border-orange-500/30'
                        : 'bg-yellow-500/10 border border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary">
                            {interaction.drug1} + {interaction.drug2}
                          </span>
                          <Badge
                            variant={
                              interaction.severity === 'SEVERE'
                                ? 'danger'
                                : interaction.severity === 'MODERATE'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {interaction.severity === 'SEVERE'
                              ? '严重'
                              : interaction.severity === 'MODERATE'
                              ? '中度'
                              : '轻度'}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary">{interaction.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 禁忌症 */}
          {result.contraindications && result.contraindications.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-500 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>禁忌症提示 ({result.contraindications.length})</span>
              </div>
              <div className="space-y-2">
                {result.contraindications.map((contraindication, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-primary">{contraindication}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 剂量问题 */}
          {result.dosageIssues && result.dosageIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-500 font-semibold">
                <AlertCircle className="h-5 w-5" />
                <span>剂量相关问题 ({result.dosageIssues.length})</span>
              </div>
              <div className="space-y-2">
                {result.dosageIssues.map((issue, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-primary">{issue}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 建议列表 */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-neon-blue font-semibold">
                <Info className="h-5 w-5" />
                <span>用药建议 ({result.suggestions.length})</span>
              </div>
              <div className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-neon-blue/10 border border-neon-blue/30 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-neon-blue flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-text-primary">{suggestion}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 无问题提示 */}
          {result.overallRisk === 'LOW' &&
            (!result.warnings || result.warnings.length === 0) &&
            (!result.interactions || result.interactions.length === 0) &&
            (!result.contraindications || result.contraindications.length === 0) &&
            (!result.dosageIssues || result.dosageIssues.length === 0) && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">处方审查通过，未发现明显用药风险</span>
                </div>
              </div>
            )}
        </div>
      </Card>
    </motion.div>
  )
}
