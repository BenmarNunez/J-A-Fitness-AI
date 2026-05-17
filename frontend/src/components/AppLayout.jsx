import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6 w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
