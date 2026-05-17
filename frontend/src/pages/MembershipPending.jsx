import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function MembershipPending() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const { default: api } = await import('../api')
      await api.post('/api/auth/logout/')
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-white">Membership Pending</h1>
        <p className="mt-4 text-text-muted">
          Hi <span className="text-white">{user?.first_name}</span>, your account has been created.
          Your membership is currently{' '}
          <span className={`font-semibold ${
            user?.profile?.membership_status === 'inactive' ? 'text-danger' : 'text-warn'
          }`}>
            {user?.profile?.membership_status ?? 'pending'}
          </span>.
        </p>
        <p className="mt-3 text-text-muted text-sm">
          Please visit the J&A Fitness gym or contact management to activate your membership.
          Once activated, you will have full access to all features.
        </p>
        <button
          onClick={handleLogout}
          className="mt-8 px-6 py-2.5 border border-accent/30 text-accent rounded-lg hover:bg-accent/5 transition text-sm"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}
