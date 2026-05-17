import { create } from 'zustand'

const useUIStore = create((set) => ({
  loading: {},
  errors: {},
  setLoading: (key, value) => set((s) => ({ loading: { ...s.loading, [key]: value } })),
  setError: (key, value) => set((s) => ({ errors: { ...s.errors, [key]: value } })),
  clearError: (key) => set((s) => { const e = { ...s.errors }; delete e[key]; return { errors: e } }),
}))

export default useUIStore
