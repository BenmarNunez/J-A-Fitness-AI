import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/dashboard',    label: 'Home',      icon: '⊞' },
  { to: '/fitness-plan', label: 'Plan',      icon: '🏋' },
  { to: '/nutrition',    label: 'Nutrition', icon: '🥗' },
  { to: '/posture-check', label: 'Posture',   icon: '🧍' },
  { to: '/chatbot',      label: 'Chat',      icon: '💬' },
]

const MORE_TABS = [
  { to: '/body-scan', label: 'Body Scan', icon: '🔍' },
  { to: '/bmi',       label: 'BMI',       icon: '⚖️' },
  { to: '/logbook',    label: 'Logbook',   icon: '📖' },
  { to: '/profile',    label: 'Profile',    icon: '👤' },
  { to: '/settings',   label: 'Settings',   icon: '⚙️' },
]

export default function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  return (
    <>
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
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium text-text-dim hover:text-text-muted transition-all duration-200"
          >
            <span className="text-base leading-none">⋯</span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          <div
            className="relative w-full max-w-md bg-surface border-t border-border-soft rounded-t-2xl p-6 pb-12 transition-transform duration-300 ease-out"
            style={{ boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.5)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-text-base font-bold">More Options</h3>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-bg text-text-muted hover:text-text-base transition"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {MORE_TABS.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                      isActive
                      ? 'bg-[#16a34a]/10 border-[#16a34a] text-primary'
                      : 'bg-bg border-border-soft text-text-muted hover:border-border-mid'
                    }`
                  }
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-medium">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
