import { create } from 'zustand'

const useChatStore = create((set) => ({
  sessionId: null,
  messages: [],
  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearChat: () => set({ sessionId: null, messages: [] }),
}))

export default useChatStore
