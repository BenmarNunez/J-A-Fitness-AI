import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import DisclaimerBanner from '../components/DisclaimerBanner'
import useChatStore from '../store/chatStore'
import useFitnessStore from '../store/fitnessStore'
import useAuthStore from '../store/authStore'
import useNutritionStore from '../store/nutritionStore'
import api from '../api'

// #6 — Map exercise keywords to posture checker keys
const POSTURE_MAP = {
  squat:      ['squat', 'squats', 'goblet squat', 'front squat', 'back squat'],
  bicep_curl: ['bicep curl', 'bicep curls', 'dumbbell curl', 'barbell curl', 'hammer curl'],
  push_up:    ['push-up', 'push up', 'pushup', 'push ups', 'pushups'],
  deadlift:   ['deadlift', 'deadlifts', 'romanian deadlift', 'rdl'],
}

function detectPostureExercise(text) {
  const lower = text.toLowerCase()
  for (const [key, keywords] of Object.entries(POSTURE_MAP)) {
    if (keywords.some(k => lower.includes(k))) return key
  }
  return null
}

// #4 — Detect food mentions for Add to Diet
const FOOD_KEYWORDS = ['eat', 'food', 'meal', 'diet', 'calories', 'protein', 'carbs', 'nutrition', 'breakfast', 'lunch', 'dinner', 'snack']
function detectFoodContext(text) {
  const lower = text.toLowerCase()
  return FOOD_KEYWORDS.some(k => lower.includes(k))
}

// #4 — Detect exercise mentions for Add to Logbook
const EXERCISE_KEYWORDS_GENERAL = ['exercise', 'workout', 'training', 'reps', 'sets', 'lift', 'run', 'cardio', 'strength']
function detectExerciseContext(text) {
  const lower = text.toLowerCase()
  return EXERCISE_KEYWORDS_GENERAL.some(k => lower.includes(k))
}

const PROMPTS = [
  'Best exercises for weight loss?',
  'How much protein do I need daily?',
  'What is progressive overload?',
]

export default function Chatbot() {
  const { sessionId, messages, setSessionId, addMessage, clearChat } = useChatStore()
  const { activePlan, bodyMetrics, setPostureExercise } = useFitnessStore()
  const { user } = useAuthStore()
  const { plans: nutritionPlans } = useNutritionStore()
  const navigate = useNavigate()

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

  // #5 — Build system instruction with user progress context
  const buildSystemInstruction = () => {
    const profile = user?.profile
    const latestMetric = bodyMetrics[0]
    const planContent = activePlan?.weekly_schedule || {}
    const goal = planContent.goal || profile?.fitness_goal?.replace(/_/g, ' ') || 'general fitness'

    let context = `You are a friendly AI fitness assistant for J&A Fitness gym in Legazpi City, Philippines.
Answer questions about workouts, nutrition (Filipino foods preferred), equipment, and healthy habits.
Keep responses concise and encouraging. Always recommend consulting professionals for medical advice.`

    if (profile) {
      context += `\n\nUser Profile:
- Name: ${user?.first_name} ${user?.last_name}
- Age: ${profile.age || 'unknown'} years
- Weight: ${profile.weight_kg || 'unknown'} kg
- Height: ${profile.height_cm || 'unknown'} cm
- Gender: ${profile.gender || 'unknown'}
- BMI: ${profile.bmi || 'unknown'}
- BMR: ${profile.bmr || 'unknown'} kcal/day
- Fitness Goal: ${goal}
- Activity Level: ${profile.activity_level?.replace(/_/g, ' ') || 'unknown'}`
    }

    if (latestMetric) {
      context += `\n- Latest logged weight: ${latestMetric.weight_kg} kg (${latestMetric.date})`
    }

    if (activePlan?.goal) {
      context += `\n- Current training goal: ${activePlan.goal}`
    }

    context += `\n\nUse this profile to give personalized, specific advice.`
    return context
  }

  const getGeminiChat = async () => {
    if (geminiChatRef.current) return geminiChatRef.current
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_PUBLIC_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: buildSystemInstruction(), // #5
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
      const text = result.response.text()

      // #4 + #6 — Detect exercise and food context in response
      const postureKey  = detectPostureExercise(text)
      const hasFood     = detectFoodContext(text)
      const hasExercise = detectExerciseContext(text)

      const assistantMsg = {
        role: 'assistant',
        content: text,
        postureKey,
        hasFood,
        hasExercise,
      }
      addMessage(assistantMsg)

      if (sessionId) {
        api.post(`/api/ai/chat/history/${sessionId}/`, {
          messages: [userMsg, { role: 'assistant', content: text }]
        }).catch(() => {})
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

  // #6 — Sync exercise to posture checker
  const handleCheckPosture = (key) => {
    setPostureExercise(key)
    navigate('/posture')
  }

  // #4 — Navigate to logbook with exercise context
  const handleAddToLogbook = () => navigate('/logbook')
  const handleViewNutrition = () => navigate('/nutrition')

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

      {/* #5 — Show user context badge */}
      {user?.profile && (
        <div className="flex items-center gap-2 mb-4 text-xs text-text-muted bg-surface border border-border-soft rounded-lg px-3 py-2">
          <span className="text-primary">✓</span>
          Personalized for {user.first_name} — {user.profile.fitness_goal?.replace(/_/g, ' ')} · BMI {user.profile.bmi} · {user.profile.bmr} kcal/day
        </div>
      )}

      {/* Chat container */}
      <div className="card flex flex-col" style={{ height: '58vh' }}>
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
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs shrink-0 self-start mt-1">🤖</div>
              )}
              <div className="flex flex-col gap-2 max-w-xs md:max-w-lg">
                <div className={`px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bubble-user' : 'bubble-ai text-text-base'
                }`}>
                  {msg.content}
                </div>

                {/* #4 + #6 — Action buttons on assistant messages */}
                {msg.role === 'assistant' && (msg.postureKey || msg.hasExercise || msg.hasFood) && (
                  <div className="flex flex-wrap gap-2 ml-1">
                    {msg.postureKey && (
                      <button
                        onClick={() => handleCheckPosture(msg.postureKey)}
                        className="text-[11px] bg-primary/10 text-primary border border-primary/30 rounded-full px-3 py-1 hover:bg-primary/20 transition-all font-medium"
                      >
                        📸 Check Posture for {msg.postureKey.replace(/_/g, ' ')}
                      </button>
                    )}
                    {msg.hasExercise && (
                      <button
                        onClick={handleAddToLogbook}
                        className="text-[11px] bg-surface border border-border-mid text-text-muted rounded-full px-3 py-1 hover:text-text-base transition-all"
                      >
                        📓 Log Exercise
                      </button>
                    )}
                    {msg.hasFood && (
                      <button
                        onClick={handleViewNutrition}
                        className="text-[11px] bg-surface border border-border-mid text-text-muted rounded-full px-3 py-1 hover:text-text-base transition-all"
                      >
                        🥗 View Nutrition Plan
                      </button>
                    )}
                  </div>
                )}
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
