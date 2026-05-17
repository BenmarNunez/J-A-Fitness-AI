import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function AdminRoute({ children }) {
  const { token, user } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />

  return children
}
