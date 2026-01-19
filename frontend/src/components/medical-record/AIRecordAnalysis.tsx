/**
 * AI病历分析结果组件 - 里程碑6
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Lightbulb,
  Activity,
  Calendar,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AIRecordAnalysis as AIRecordAnalysisType } from '@/api/medical-record.api'

interface AIRecordAnalysisProps {
  analysis: AIRecordAnalysisType
  showCopyButton?: boolean
}

export function AIRecordAnalysis({ analysis, showCopyButton = true }: AIRecordAnalysisProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    keyFindings: true,
    diagnosisSuggestions: true,
    treatmentRecommendations: true,
    followUpAdvice: true,
    riskWarnings: true,
  })

  // 切换折叠状态
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // 复制到剪贴板
  const handleCopy = () => {
    const text = `
AI病历分析报告

【智能摘要】
${analysis.summary}

【关键发现】
${analysis.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

【诊断建议】
${analysis.diagnosisSuggestions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

【治疗建议】
${analysis.treatmentRecommendations.map((t, i) => `${i + 1}. ${t}`).join('\n')}

【随访建议】
${analysis.followUpAdvice.map((a, i) => `${i + 1}. ${a}`).join('\n')}

【风险警告】
${analysis.riskWarnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}
    `.trim()

    navigator.clipboard.writeText(text)
    toast.success('分析结果已复制到剪贴板')
  }

  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  }

  return (
    <div className="space-y-4">
      {/* 智能摘要 */}
      <Card variant="neon-blue" padding="lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-text-primary">AI智能摘要</h3>
          </div>
          <div className="flex items-center gap-2">
            {showCopyButton && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                icon={<Copy className="w-4 h-4" />}
              >
                复制全部
              </Button>
            )}
            <button
              onClick={() => toggleSection('summary')}
              className="p-1 hover:bg-background-secondary rounded transition-colors"
            >
              {expandedSections.summary ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>
        </div>
        {expandedSections.summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">
              {analysis.summary}
            </p>
          </motion.div>
        )}
      </Card>

      {/* 关键发现 */}
      {analysis.keyFindings.length > 0 && (
        <Card variant="glass" padding="lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent-400" />
              <h3 className="text-lg font-semibold text-text-primary">关键发现</h3>
              <Badge variant="cyan" size="sm">{analysis.keyFindings.length}</Badge>
            </div>
            <button
              onClick={() => toggleSection('keyFindings')}
              className="p-1 hover:bg-background-secondary rounded transition-colors"
            >
              {expandedSections.keyFindings ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>
          {expandedSections.keyFindings && (
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {analysis.keyFindings.map((finding, index) => (
                <motion.li
                  key={index}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 bg-background-secondary/30 rounded-lg"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-500/20 flex items-center justify-center text-xs font-semibold text-accent-400">
                    {index + 1}
                  </span>
                  <span className="text-text-secondary flex-1">{finding}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      )}

      {/* 诊断建议 */}
      {analysis.diagnosisSuggestions.length > 0 && (
        <Card variant="glass" padding="lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning-400" />
              <h3 className="text-lg font-semibold text-text-primary">诊断建议</h3>
              <Badge variant="warning" size="sm">{analysis.diagnosisSuggestions.length}</Badge>
            </div>
            <button
              onClick={() => toggleSection('diagnosisSuggestions')}
              className="p-1 hover:bg-background-secondary rounded transition-colors"
            >
              {expandedSections.diagnosisSuggestions ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>
          {expandedSections.diagnosisSuggestions && (
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {analysis.diagnosisSuggestions.map((suggestion, index) => (
                <motion.li
                  key={index}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 bg-background-secondary/30 rounded-lg"
                >
                  <Lightbulb className="flex-shrink-0 w-5 h-5 text-warning-400 mt-0.5" />
                  <span className="text-text-secondary flex-1">{suggestion}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      )}

      {/* 治疗建议 */}
      {analysis.treatmentRecommendations.length > 0 && (
        <Card variant="glass" padding="lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-success-400" />
              <h3 className="text-lg font-semibold text-text-primary">治疗建议</h3>
              <Badge variant="success" size="sm">{analysis.treatmentRecommendations.length}</Badge>
            </div>
            <button
              onClick={() => toggleSection('treatmentRecommendations')}
              className="p-1 hover:bg-background-secondary rounded transition-colors"
            >
              {expandedSections.treatmentRecommendations ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>
          {expandedSections.treatmentRecommendations && (
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {analysis.treatmentRecommendations.map((recommendation, index) => (
                <motion.li
                  key={index}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 bg-background-secondary/30 rounded-lg"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-success-500/20 flex items-center justify-center text-xs font-semibold text-success-400">
                    {index + 1}
                  </span>
                  <span className="text-text-secondary flex-1">{recommendation}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      )}

      {/* 随访建议 */}
      {analysis.followUpAdvice.length > 0 && (
        <Card variant="glass" padding="lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-text-primary">随访建议</h3>
              <Badge variant="primary" size="sm">{analysis.followUpAdvice.length}</Badge>
            </div>
            <button
              onClick={() => toggleSection('followUpAdvice')}
              className="p-1 hover:bg-background-secondary rounded transition-colors"
            >
              {expandedSections.followUpAdvice ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>
          {expandedSections.followUpAdvice && (
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {analysis.followUpAdvice.map((advice, index) => (
                <motion.li
                  key={index}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 bg-background-secondary/30 rounded-lg"
                >
                  <Calendar className="flex-shrink-0 w-5 h-5 text-primary-400 mt-0.5" />
                  <span className="text-text-secondary flex-1">{advice}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      )}

      {/* 风险警告 */}
      {analysis.riskWarnings.length > 0 && (
        <Card variant="glass" padding="lg" className="border-error-500/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-error-400" />
              <h3 className="text-lg font-semibold text-error-400">风险警告</h3>
              <Badge variant="error" size="sm">{analysis.riskWarnings.length}</Badge>
            </div>
            <button
              onClick={() => toggleSection('riskWarnings')}
              className="p-1 hover:bg-background-secondary rounded transition-colors"
            >
              {expandedSections.riskWarnings ? (
                <ChevronUp className="w-5 h-5 text-text-secondary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>
          {expandedSections.riskWarnings && (
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {analysis.riskWarnings.map((warning, index) => (
                <motion.li
                  key={index}
                  variants={itemVariants}
                  className="flex items-start gap-3 p-3 bg-error-500/10 rounded-lg border border-error-500/20"
                >
                  <AlertTriangle className="flex-shrink-0 w-5 h-5 text-error-400 mt-0.5" />
                  <span className="text-error-300 flex-1 font-medium">{warning}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      )}
    </div>
  )
}
