import { useEffect, useRef, useState } from 'react'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useChatStore from '../store/chatStore'
import api from '../api'

export default function Chatbot() {
  const { sessionId, messages, setSessionId, addMessage, clearChat } = useChatStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()
  const geminiChatRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      api.post('/api/ai/chat/session/').then(({ data }) => setSessionId(data.id))
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getGeminiChat = async () => {
    if (geminiChatRef.current) return geminiChatRef.current
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are a friendly AI fitness assistant for J&A Fitness gym. Answer questions about workouts, nutrition, equipment, and healthy habits. Keep responses concise and encouraging. Always recommend consulting professionals for medical advice.',
    })
    geminiChatRef.current = model.startChat({
      history: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    })
    return geminiChatRef.current
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', content: input.trim() }
    addMessage(userMsg)
    setInput('')
    setSending(true)
    try {
      const chat = await getGeminiChat()
      const result = await chat.sendMessage(userMsg.content)
      const assistantMsg = { role: 'assistant', content: result.response.text() }
      addMessage(assistantMsg)
      if (sessionId) {
        api.post(`/api/ai/chat/history/${sessionId}/`, { messages: [userMsg, assistantMsg] }).catch(() => {})
      }
    } catch {
      addMessage({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  const handleNewChat = () => {
    geminiChatRef.current = null
    clearChat()
    api.post('/api/ai/chat/session/').then(({ data }) => setSessionId(data.id))
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">AI Fitness Chat</h1>
        <button onClick={handleNewChat} className="text-sm text-text-muted hover:text-accent transition">New Chat</button>
      </div>
      <DisclaimerBanner message="AI responses may be inaccurate (hallucinations). Do not use as medical advice." />

      <div className="bg-surface border border-accent/20 rounded-xl flex flex-col" style={{ height: '60vh' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-text-muted text-sm text-center mt-8">Ask me anything about workouts, nutrition, or gym equipment!</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-bg border border-accent/20 text-white rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-bg border border-accent/20 px-4 py-2 rounded-2xl rounded-bl-sm text-text-muted text-sm">Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-accent/10">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about workouts, nutrition, equipment…"
            className="flex-1 bg-bg border border-accent/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
          />
          <button type="submit" disabled={sending || !input.trim()}
            className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition">
            Send
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
