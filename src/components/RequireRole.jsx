import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function RequireRole({ role }) {
  const { profile } = useAuth()

  if (profile?.role !== role) {
    return <Navigate to={profile?.role === 'funcionario' ? '/caixa' : '/admin-home'} replace />
  }

  return <Outlet />
}
