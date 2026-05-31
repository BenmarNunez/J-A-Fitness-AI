import { create } from 'zustand'

const useFitnessStore = create((set) => ({
  activePlan: null,
  plans: [],
  workoutLogs: [],
  bodyMetrics: [],
  postureExercise: null,          // #6: exercise key synced from chatbot
  setActivePlan: (plan) => set({ activePlan: plan }),
  setPlans: (plans) => set({ plans, activePlan: plans.find(p => p.is_active) || null }),
  setWorkoutLogs: (logs) => set({ workoutLogs: logs }),
  setBodyMetrics: (metrics) => set({ bodyMetrics: metrics }),
  addBodyMetric: (metric) => set((s) => ({ bodyMetrics: [metric, ...s.bodyMetrics] })),
  setPostureExercise: (key) => set({ postureExercise: key }), // #6
}))

export default useFitnessStore
