import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',     icon: IconHome },
  { to: '/fitness-plan', label: 'Fitness Plan',  icon: IconDumbbell },
  { to: '/nutrition',    label: 'Nutrition',     icon: IconLeaf },
  { to: '/posture-check', label: 'Posture Check', icon: IconPerson },
  { to: '/body-scan',    label: 'Body Scan',     icon: IconScan },
  { to: '/bmi',          label: 'BMI',           icon: IconScale },
  { to: '/chatbot',      label: 'AI Chat',       icon: IconChat },
  { to: '/logbook',      label: 'Logbook',       icon: IconBook },
  { to: '/profile',      label: 'Profile',       icon: IconUser },
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
    <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-border-soft bg-bg relative z-10">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-border-soft">
        <div className="font-display text-2xl tracking-widest text-text-base leading-none">
          J&A FITNESS
        </div>
        <div className="font-display text-lg tracking-[0.3em] text-primary leading-none mt-0.5">
          AI TRAINER
        </div>
        <div className="mt-3 w-8 h-0.5 bg-primary rounded-full" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group ${
                isActive
                  ? 'bg-primary/8 text-primary'
                  : 'text-text-muted hover:text-text-base hover:bg-white/3'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full shadow-glow-sm" />
                )}
                <Icon size={16} active={isActive} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {user?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mt-2 ${
                isActive
                  ? 'bg-admin-dark/40 text-admin-accent'
                  : 'text-admin-accent/60 hover:text-admin-accent hover:bg-admin-dark/20'
              }`
            }
          >
            <IconShield size={16} />
            <span>Admin Panel</span>
          </NavLink>
        )}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-5 border-t border-border-soft">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm">
            {user?.first_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-base text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-text-dim text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-dim hover:text-danger hover:bg-danger/5 transition-all duration-200"
        >
          <IconLogout size={14} />
          Log Out
        </button>
      </div>
    </aside>
  )
}

/* ── Inline SVG Icons ────────────────────────────────── */
function Ico({ size, active, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? '#00E676' : 'currentColor'} strokeWidth={active ? 2 : 1.6}
      strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  )
}
function IconHome(p)     { return <Ico {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico> }
function IconDumbbell(p) { return <Ico {...p}><path d="M6 5v14M18 5v14M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/></Ico> }
function IconLeaf(p)     { return <Ico {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></Ico> }
function IconPerson(p)   { return <Ico {...p}><circle cx="12" cy="5" r="2"/><path d="M12 7v8m-4 4h8"/><path d="M8 11h8"/></Ico> }
function IconScale(p)    { return <Ico {...p}><path d="M12 3v2m0 14v2M3 12h2m14 0h2"/><circle cx="12" cy="12" r="4"/><path d="M6.34 6.34l1.42 1.42m8.48 8.48 1.42 1.42M6.34 17.66l1.42-1.42m8.48-8.48 1.42-1.42"/></Ico> }
function IconChat(p)     { return <Ico {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ico> }
function IconBook(p)     { return <Ico {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></Ico> }
function IconUser(p)     { return <Ico {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico> }
function IconShield(p)   { return <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ico> }
function IconScan(p)     { return <Ico {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 12h8M12 8v8"/></Ico> }
function IconLogout(p)   { return <Ico {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ico> }
