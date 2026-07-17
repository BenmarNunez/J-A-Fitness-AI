import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useAuthStore from '../store/authStore'
import api from '../api'

const FITNESS_GOALS   = ['lose_weight', 'build_muscle', 'maintain']
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active']

const BUILD_LABEL = { light: '🏃 Light Build', medium: '💪 Medium Build', heavy: '🏋️ Heavy Build' }
const BUILD_COLOR = { light: 'text-admin-accent', medium: 'text-primary', heavy: 'text-warn' }

export default function Profile() {
  const { user, setAuth, token } = useAuthStore()
  const navigate = useNavigate()
  const profile = user?.profile
  const [form, setForm] = useState({
    age:            profile?.age ?? '',
    weight_kg:      profile?.weight_kg ?? '',
    height_cm:      profile?.height_cm ?? '',
    gender:         profile?.gender ?? '',
    fitness_goal:   profile?.fitness_goal ?? '',
    activity_level: profile?.activity_level ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const [pictureFile, setPictureFile] = useState(null)
  const [picturePreview, setPicturePreview] = useState(null)
  const [pictureError, setPictureError] = useState('')
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [profile?.profile_picture])

  const handlePictureSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setPictureError('Only JPG and PNG files are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPictureError('File must be 5MB or smaller.')
      return
    }
    setPictureError('')
    setPictureFile(file)
    setPicturePreview(URL.createObjectURL(file))
  }

  const handlePictureUpload = async () => {
    if (!pictureFile) return
    setUploadingPicture(true); setPictureError('')
    try {
      const formData = new FormData()
      formData.append('picture', pictureFile)
      const { data } = await api.patch('/api/profile/picture/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAuth(token, data)
      setPictureFile(null)
      setPicturePreview(null)
    } catch (err) {
      setPictureError(err.response?.data?.picture?.[0] || 'Upload failed. Try again.')
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const { data } = await api.put('/api/profile/', {
        ...form,
        age:       form.age       ? Number(form.age)       : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      })
      setAuth(token, data); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const isActive = profile?.membership_status === 'active'

  return (
    <AppLayout>
      <div className="mb-7">
        <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Account</p>
        <h1 className="page-title">My Profile</h1>
      </div>

      <div className="max-w-lg space-y-4">
        {/* Identity card */}
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              {picturePreview || (profile?.profile_picture && !avatarError) ? (
                <img
                  src={picturePreview || profile.profile_picture}
                  alt="Profile"
                  className="w-14 h-14 rounded-full object-cover border border-primary/25"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center text-primary font-display text-2xl">
                  {user?.first_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <label
                htmlFor="profile-picture-input"
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-bg flex items-center justify-center text-xs cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-bg"
                aria-label="Change profile picture"
              >
                ✎
                <input
                  id="profile-picture-input"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
                  style={{ clip: 'rect(0, 0, 0, 0)' }}
                  onChange={handlePictureSelect}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-base font-semibold text-lg">{user?.first_name} {user?.last_name}</p>
              <p className="text-text-muted text-sm truncate">{user?.email}</p>
              <span className={`inline-block mt-2 ${isActive ? 'badge-active' : 'badge-pending'}`}>
                {profile?.membership_status || 'pending'}
              </span>
            </div>
          </div>
          {pictureError && <p className="text-danger text-xs mt-3">{pictureError}</p>}
          {pictureFile && (
            <button onClick={handlePictureUpload} disabled={uploadingPicture} className="btn-primary text-xs mt-3 py-1.5 px-3">
              {uploadingPicture ? 'Uploading…' : 'Save Photo'}
            </button>
          )}
          <div className="mt-5 pt-4 border-t border-border-soft grid grid-cols-2 md:grid-cols-3 gap-4">
            {profile?.bmi && (
              <div><p className="stat-label">BMI</p><p className="text-text-base font-semibold">{profile.bmi}</p></div>
            )}
            {profile?.bmr && (
              <div><p className="stat-label">BMR</p><p className="text-text-base font-semibold">{profile.bmr} <span className="text-text-dim text-xs">kcal/day</span></p></div>
            )}
            <div>
              <p className="stat-label">Body Build</p>
              {profile?.body_build ? (
                <p className={`font-semibold text-sm ${BUILD_COLOR[profile.body_build]}`}>
                  {BUILD_LABEL[profile.body_build]}
                </p>
              ) : (
                <button onClick={() => navigate('/body-scan')}
                  className="text-xs text-primary border border-primary/30 rounded-full px-2.5 py-1 hover:bg-primary/10 transition-all mt-0.5">
                  + Scan Now
                </button>
              )}
            </div>
          </div>
          {profile?.body_build && (
            <button onClick={() => navigate('/body-scan')}
              className="mt-3 text-xs text-text-dim hover:text-text-muted transition-colors">
              📷 Rescan body build
            </button>
          )}
        </div>

        {/* Fitness profile form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <h2 className="text-text-base font-semibold">Fitness Profile</h2>

          <div className="grid grid-cols-3 gap-3">
            {[['age', 'Age', '25'], ['weight_kg', 'Weight (kg)', '70'], ['height_cm', 'Height (cm)', '170']].map(([name, label, placeholder]) => (
              <div key={name}>
                <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">{label}</label>
                <input type="number" name={name} value={form[name]} onChange={handleChange}
                  step="0.1" placeholder={placeholder} className="inp" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange} className="inp">
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Fitness Goal</label>
            <select name="fitness_goal" value={form.fitness_goal} onChange={handleChange} className="inp">
              <option value="">Select…</option>
              {FITNESS_GOALS.map(g => (
                <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Activity Level</label>
            <select name="activity_level" value={form.activity_level} onChange={handleChange} className="inp">
              <option value="">Select…</option>
              {ACTIVITY_LEVELS.map(l => (
                <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saved ? '✓ Profile Saved!' : saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
