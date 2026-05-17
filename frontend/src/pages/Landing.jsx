import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-accent/20">
        <span className="text-accent font-bold text-xl tracking-tight">J&A Fitness AI</span>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-accent border border-accent/40 rounded-lg hover:bg-accent/10 transition"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm bg-primary hover:bg-primary/80 text-white rounded-lg transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white max-w-3xl leading-tight">
          Your Personal AI{' '}
          <span className="text-accent">Fitness Trainer</span>
        </h1>
        <p className="mt-6 text-text-muted text-lg max-w-xl">
          Personalized workout plans, real-time posture correction, and AI nutrition
          guidance — built for J&A Fitness members in Legazpi City.
        </p>
        <Link
          to="/register"
          className="mt-10 px-8 py-3 bg-primary hover:bg-primary/80 text-white font-semibold rounded-xl text-lg transition"
        >
          Start Your Journey
        </Link>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            {
              title: 'AI Fitness Plans',
              desc: 'Hyper-personalized workout regimens generated from your biometrics and goals.',
              color: 'border-accent/30',
            },
            {
              title: 'Posture Checker',
              desc: 'Real-time form assessment and rep counting via your device camera.',
              color: 'border-warn/30',
            },
            {
              title: 'AI Nutritionist',
              desc: 'Meal plans and macro scanning powered by Gemini Vision.',
              color: 'border-admin-accent/30',
            },
          ].map(({ title, desc, color }) => (
            <div
              key={title}
              className={`bg-surface border ${color} rounded-xl p-6 text-left`}
            >
              <h3 className="text-white font-semibold text-lg">{title}</h3>
              <p className="mt-2 text-text-muted text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-text-muted text-xs border-t border-white/5">
        J&A Fitness AI — Computer Arts and Technological College, Inc. · Legazpi City
      </footer>
    </div>
  )
}
