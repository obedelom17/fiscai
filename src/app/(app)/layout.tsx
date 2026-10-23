import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

// Ce layout est partagé par toutes les pages connectées (dashboard, admin, paramètres).
// La sidebar n'est donc montée qu'une seule fois : elle ne se recharge plus à chaque navigation.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen" style={{ background: 'var(--surface)' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
