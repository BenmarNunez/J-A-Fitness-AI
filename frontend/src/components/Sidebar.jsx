import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/fitness-plan', label: 'Fitness Plan' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/posture', label: 'Posture Check' },
  { to: '/bmi', label: 'BMI' },
  { to: '/chatbot', label: 'AI Chat' },
  { to: '/logbook', label: 'Logbook' },
  { to: '/profile', label: 'Profile' },
]

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout/') } finally {
      clearAuth()
      navigate('/login')
    }
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-primary-dark border-r border-accent/20 px-4 py-6">
      <span className="text-accent font-bold text-lg mb-8 px-2">J&A Fitness AI</span>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-white/5'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
        {user?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-admin-dark text-white font-semibold' : 'text-admin-accent hover:bg-admin-dark/20'
              }`
            }
          >
            Admin
          </NavLink>
        )}
      </nav>
      <button
        onClick={handleLogout}
        className="mt-4 px-3 py-2 text-sm text-text-muted hover:text-danger transition text-left"
      >
        Log Out
      </button>
    </aside>
  )
}
