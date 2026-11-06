'use client'
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f0f4f1', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ color: '#1a3c2e' }}>FiscAI est momentanément indisponible</h1>
          <p style={{ color: '#6b7280' }}>Rechargez la page. Si le problème persiste, réessayez dans quelques minutes.</p>
          <button onClick={reset} style={{ background: '#2d6a4f', color: '#fff', border: 0, borderRadius: 12, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Recharger</button>
        </div>
      </body>
    </html>
  )
}
