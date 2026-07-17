import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import api from '../api'

const TOGGLES = [
  { key: 'workout_reminders', label: 'Workout Reminders', desc: 'Get an email nudge on days you have a scheduled workout and haven\'t logged one yet.' },
  { key: 'plan_updates',      label: 'Plan Updates',       desc: 'Get an email whenever your fitness or nutrition plan is regenerated.' },
  { key: 'weekly_summary',    label: 'Weekly Summary',     desc: 'Get a weekly email recapping your logged sessions and top exercises.' },
]

export default function Settings() {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/api/notifications/prefs/').then(({ data }) => setPrefs(data)).finally(() => setLoading(false))
  }, [])

  const handleToggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    try {
      await api.patch('/api/notifications/prefs/', { [key]: next[key] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="mb-7">
        <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Account</p>
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="card p-6">
          <h2 className="text-text-base font-semibold mb-4">Email Notifications</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="shimmer-line h-10" />)}
            </div>
          ) : (
            <div className="space-y-5">
              {TOGGLES.map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-text-base text-sm font-medium">{label}</p>
                    <p className="text-text-dim text-xs mt-0.5">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(key)}
                    disabled={saving}
                    aria-pressed={prefs[key]}
                    className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${
                      prefs[key] ? 'bg-primary' : 'bg-border-mid'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        prefs[key] ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
