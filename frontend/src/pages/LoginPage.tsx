/**
 * 登录页面 - 未来感设计
 */
import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { toast } from 'sonner'

// 表单验证Schema
const loginSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  password: z.string().min(6, '密码至少6个字符'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const onSubmit = async (data: LoginFormData) => {
    clearError()
    try {
      await login(data.username, data.password)
      toast.success('登录成功')
      navigate(from, { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登录失败，请重试')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-gradient p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl animate-float animation-delay-200" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl animate-float animation-delay-400" />
      </div>

      {/* 登录卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-strong p-8 rounded-2xl shadow-neon-blue">
          {/* Logo和标题 */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-block mb-4"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-neon-blue mx-auto">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold text-gradient mb-2">AiliaoX医疗系统</h1>
            <p className="text-text-secondary">欢迎回来，请登录您的账户</p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 用户名输入 */}
            <Input
              {...register('username')}
              label="用户名"
              placeholder="请输入用户名"
              error={errors.username?.message}
              leftIcon={<User className="w-5 h-5" />}
              fullWidth
              autoComplete="username"
              disabled={isLoading}
            />

            {/* 密码输入 */}
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              label="密码"
              placeholder="请输入密码"
              error={errors.password?.message}
              leftIcon={<Lock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
              fullWidth
              autoComplete="current-password"
              disabled={isLoading}
            />

            {/* 错误提示 */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-error-500/10 border border-error-500/30 rounded-lg"
              >
                <p className="text-sm text-error-400">{error}</p>
              </motion.div>
            )}

            {/* 登录按钮 */}
            <Button
              type="submit"
              variant="neon"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>

            {/* 其他选项 */}
            <div className="flex items-center justify-between text-sm">
              <Link
                to="/forgot-password"
                className="text-text-tertiary hover:text-primary-400 transition-colors"
              >
                忘记密码？
              </Link>
              <Link
                to="/register"
                className="text-text-tertiary hover:text-primary-400 transition-colors"
              >
                还没有账户？<span className="text-primary-400">立即注册</span>
              </Link>
            </div>
          </form>

          {/* 快速登录提示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pt-6 border-t border-border-subtle"
          >
            <div className="text-xs text-text-tertiary text-center space-y-1">
              <p className="font-medium mb-2">测试账号信息：</p>
              <p>管理员: admin / Admin123!</p>
              <p>医生: zhangsan / Doctor123!</p>
              <p>操作员: wangwu / Operator123!</p>
            </div>
          </motion.div>
        </div>

        {/* 版权信息 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-8 text-sm text-text-tertiary"
        >
          © 2025 AiliaoX. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  )
}
