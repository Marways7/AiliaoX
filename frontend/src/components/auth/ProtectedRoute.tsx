/**
 * 受保护路由组件
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { UserRole } from '@/utils/constants'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  requiredPermissions?: string[]
}

export const ProtectedRoute = ({ children, requiredRoles, requiredPermissions }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 需要特定角色权限
  if (requiredRoles && requiredRoles.length > 0) {
    if (!user || !requiredRoles.includes(user.role)) {
      // 没有权限，重定向到首页或403页面
      return <Navigate to="/403" replace />
    }
  }

  // 需要特定权限
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!user || !user.permissions) {
      return <Navigate to="/403" replace />
    }

    // 检查用户是否拥有所需的所有权限
    const hasAllPermissions = requiredPermissions.every(permission =>
      user.permissions?.includes(permission)
    )

    if (!hasAllPermissions) {
      return <Navigate to="/403" replace />
    }
  }

  return <>{children}</>
}
