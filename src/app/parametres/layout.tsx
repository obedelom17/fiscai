export const dynamic = 'force-dynamic'

import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
