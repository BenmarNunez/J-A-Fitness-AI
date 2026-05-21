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

  const PROMPTS = ['Best exercises for weight loss?', 'How much protein should I eat?', 'What is progressive overload?']

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">Powered by Gemini</p>
          <h1 className="page-title">AI Fitness Chat</h1>
        </div>
        <button onClick={handleNewChat}
          className="text-sm text-text-dim hover:text-text-muted transition-colors border border-border-soft rounded-lg px-3 py-1.5">
          + New Chat
        </button>
      </div>

      <DisclaimerBanner message="AI responses may be inaccurate. Do not use as medical advice." />

      {/* Chat container */}
      <div className="card flex flex-col" style={{ height: '62vh' }}>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
              <div className="text-5xl opacity-30">🤖</div>
              <p className="text-text-muted text-sm">Ask anything about fitness & nutrition</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {PROMPTS.map(p => (
                  <button key={p} onClick={() => setInput(p)}
                    className="text-xs text-text-muted border border-border-soft rounded-full px-3 py-1.5 hover:border-primary/30 hover:text-primary transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-2 animate-fade-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs shrink-0">🤖</div>
              )}
              <div className={`max-w-xs md:max-w-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bubble-user' : 'bubble-ai text-text-base'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs">🤖</div>
              <div className="bubble-ai text-text-muted text-sm px-4 py-3 flex items-center gap-1">
                <span className="animate-pulse-soft">●</span>
                <span className="animate-pulse-soft" style={{animationDelay:'0.2s'}}>●</span>
                <span className="animate-pulse-soft" style={{animationDelay:'0.4s'}}>●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-border-soft">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about workouts, nutrition, equipment…"
            className="inp flex-1"
          />
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary shrink-0 px-4">
            Send
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
