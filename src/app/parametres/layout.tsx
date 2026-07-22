import Sidebar from '@/components/Sidebar'

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
