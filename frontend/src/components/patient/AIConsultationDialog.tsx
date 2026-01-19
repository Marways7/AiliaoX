/**
 * AIConsultationDialog AI智能问诊对话框组件
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { sendAIChat } from '@/api/ai.api'
import type { Patient, ChatMessage } from '@/@types'
import { formatDate } from '@/utils/format'

interface AIConsultationDialogProps {
  open: boolean
  onClose: () => void
  patient: Patient
}

// 预设问题
const PRESET_QUESTIONS = [
  '请分析患者的主要症状',
  '建议进行哪些检查？',
  '可能的诊断是什么？',
  '推荐的治疗方案',
]

export const AIConsultationDialog = ({ open, onClose, patient }: AIConsultationDialogProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 初始化对话
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `您好！我是AI智能助手，正在为患者【${patient.name}】提供问诊服务。\n\n患者信息：\n- 性别：${patient.gender === 'MALE' ? '男' : '女'}\n- 年龄：${calculateAge(patient.birthDate)}岁\n- 血型：${patient.bloodType || '未知'}\n${patient.allergies ? `- 过敏史：${patient.allergies}` : ''}\n\n请描述患者的症状，我会为您提供专业的诊断建议。`,
        timestamp: new Date().toISOString(),
      }
      setMessages([welcomeMessage])
    }
  }, [open, patient, messages.length])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  // 发送消息
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 调用AI API
      const response = await sendAIChat({
        message: content,
        context: {
          patientId: patient.id,
          symptoms: content,
          history: patient.medicalHistory,
        },
      })

      // 添加AI回复
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMessage])

      // 如果有后续问题建议，添加为系统消息
      if (response.followUpQuestions && response.followUpQuestions.length > 0) {
        const followUpMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'system',
          content: `建议继续询问：\n${response.followUpQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, followUpMessage])
      }
    } catch (error) {
      console.error('AI对话失败:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试。',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 处理预设问题点击
  const handlePresetClick = (question: string) => {
    handleSendMessage(question)
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" title="AI智能问诊" showCloseButton={true}>
      <div className="flex flex-col h-[600px]">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* 头像 */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary-500/20 text-primary-400'
                        : message.role === 'system'
                        ? 'bg-accent-500/20 text-accent-400'
                        : 'bg-secondary-500/20 text-secondary-400'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-5 h-5" />
                    ) : message.role === 'system' ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>

                  {/* 消息气泡 */}
                  <div
                    className={`flex flex-col ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary-500/20 text-text-primary border border-primary-500/30'
                          : message.role === 'system'
                          ? 'bg-accent-500/10 text-text-secondary border border-accent-500/20 text-sm'
                          : 'glass text-text-primary border border-border-subtle'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    <span className="text-xs text-text-tertiary mt-1">
                      {formatDate(message.timestamp, 'HH:mm')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 加载状态 */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 max-w-[85%]">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary-500/20 text-secondary-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="glass px-4 py-3 rounded-2xl border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-secondary-400" />
                    <span className="text-text-secondary">AI思考中...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 预设问题快捷按钮 */}
        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {PRESET_QUESTIONS.map((question, index) => (
              <button
                key={index}
                onClick={() => handlePresetClick(question)}
                disabled={isLoading}
                className="px-4 py-2 text-sm glass rounded-lg hover:bg-primary-500/20 hover:border-primary-500/50 transition-all border border-border-subtle text-text-secondary hover:text-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {question}
              </button>
            ))}
          </motion.div>
        )}

        {/* 输入框 */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }
              }}
              placeholder="描述患者症状，按Enter发送，Shift+Enter换行..."
              rows={2}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            variant="primary"
            className="px-6"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
