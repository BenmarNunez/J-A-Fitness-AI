import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function PrivateRoute({ children }) {
  const { token, user } = useAuthStore()

  if (!token) return <Navigate to="/login" replace />

  const status = user?.profile?.membership_status
  if (status === 'pending' || status === 'inactive') {
    return <Navigate to="/membership-pending" replace />
  }

  return children
}
