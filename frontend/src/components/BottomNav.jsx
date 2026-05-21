import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/dashboard',    label: 'Home',      icon: '⊞' },
  { to: '/fitness-plan', label: 'Plan',      icon: '🏋' },
  { to: '/nutrition',    label: 'Nutrition', icon: '🥗' },
  { to: '/posture',      label: 'Posture',   icon: '🧍' },
  { to: '/chatbot',      label: 'Chat',      icon: '💬' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-soft"
      style={{ background: 'rgba(9,18,10,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="flex">
        {TABS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-text-dim hover:text-text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-base leading-none">{icon}</span>
                <span className={`transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
