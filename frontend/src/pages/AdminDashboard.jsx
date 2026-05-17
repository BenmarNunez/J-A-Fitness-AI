import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/members/'),
      api.get('/api/analytics/summary/'),
    ]).then(([membersRes, analyticsRes]) => {
      setMembers(membersRes.data)
      setAnalytics(analyticsRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const updateMembership = async (userId, newStatus) => {
    setUpdating(userId)
    try {
      await api.put(`/api/admin/members/${userId}/`, { membership_status: newStatus })
      setMembers(prev => prev.map(m =>
        m.id === userId ? { ...m, profile: { ...m.profile, membership_status: newStatus } } : m
      ))
    } finally {
      setUpdating(null)
    }
  }

  const STATUS_COLORS = {
    active: 'bg-primary-dark text-accent',
    pending: 'bg-[#3D3000] text-warn',
    inactive: 'bg-[#3D1A1A] text-danger',
  }

  return (
    <div className="min-h-screen bg-bg">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-admin-accent/20 bg-admin-dark">
        <span className="text-admin-accent font-bold text-lg">J&A Fitness — Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-text-muted text-sm">{user?.email}</span>
          <button onClick={() => navigate('/dashboard')} className="text-admin-accent text-sm hover:underline">Member View</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              ['Total Members', analytics.total_members],
              ['Active', analytics.active_members],
              ['Pending', analytics.pending_members],
              ['Inactive', analytics.total_members - analytics.active_members - analytics.pending_members],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface border border-admin-accent/20 rounded-xl p-4">
                <p className="text-text-muted text-xs uppercase tracking-wide">{label}</p>
                <p className="text-white text-2xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>
        )}

        {analytics?.feature_usage?.length > 0 && (
          <div className="bg-surface border border-admin-accent/20 rounded-xl p-6 mb-8">
            <h2 className="text-white font-semibold mb-4">Feature Usage</h2>
            <div className="space-y-2">
              {analytics.feature_usage.map(({ feature, count }) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="text-text-muted text-sm capitalize min-w-28">{feature.replace('_', ' ')}</span>
                  <div className="flex-1 bg-bg rounded-full h-2">
                    <div
                      className="bg-admin-accent h-2 rounded-full"
                      style={{ width: `${Math.min(100, (count / analytics.feature_usage[0].count) * 100)}%` }}
                    />
                  </div>
                  <span className="text-text-muted text-sm w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface border border-admin-accent/20 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-admin-accent/10">
            <h2 className="text-white font-semibold">Members ({members.length})</h2>
          </div>
          {loading ? (
            <p className="p-6 text-text-muted text-sm">Loading…</p>
          ) : (
            <div className="divide-y divide-white/5">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1">
                    <p className="text-white font-medium">{member.first_name} {member.last_name}</p>
                    <p className="text-text-muted text-sm">{member.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[member.profile?.membership_status] || ''}`}>
                    {member.profile?.membership_status}
                  </span>
                  <div className="flex gap-2">
                    {member.profile?.membership_status !== 'active' && (
                      <button
                        onClick={() => updateMembership(member.id, 'active')}
                        disabled={updating === member.id}
                        className="text-xs bg-primary/20 text-accent border border-accent/30 px-3 py-1 rounded-lg hover:bg-primary/30 transition disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                    {member.profile?.membership_status === 'active' && (
                      <button
                        onClick={() => updateMembership(member.id, 'inactive')}
                        disabled={updating === member.id}
                        className="text-xs bg-danger/10 text-danger border border-danger/30 px-3 py-1 rounded-lg hover:bg-danger/20 transition disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
