import { create } from 'zustand'

const useNutritionStore = create((set) => ({
  plans: [],
  scanResult: null,
  setPlans: (plans) => set({ plans }),
  setScanResult: (result) => set({ scanResult: result }),
}))

export default useNutritionStore
