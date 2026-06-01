import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import PWAInstallButton from './PWAInstallButton'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen relative">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 min-w-0 w-full flex flex-col relative z-10">
        <header className="h-16 border-b border-border-soft bg-bg/50 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-20">
          <div className="text-text-dim text-xs font-medium uppercase tracking-widest">
            Member Portal
          </div>
          <PWAInstallButton />
        </header>
        <main className="flex-1 px-5 py-7 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
