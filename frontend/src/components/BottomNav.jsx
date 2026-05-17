import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/dashboard', label: 'Home' },
  { to: '/fitness-plan', label: 'Plan' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/posture', label: 'Posture' },
  { to: '/chatbot', label: 'Chat' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary-dark border-t border-accent/20 flex">
      {TABS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-xs transition ${
              isActive ? 'text-accent font-semibold' : 'text-text-muted'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
