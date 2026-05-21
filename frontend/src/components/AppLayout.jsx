import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen relative">
      <Sidebar />
      <main className="flex-1 relative z-10 px-5 py-7 pb-24 md:pb-8 max-w-5xl w-full mx-auto page-enter">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
