import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
