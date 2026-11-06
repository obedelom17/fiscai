'use client'
import { useEffect, useState } from 'react'

type Choix = 'clair' | 'sombre' | 'auto'
const CLE = 'fiscai_theme'

export function appliquerTheme(choix: Choix) {
  const sombre = choix === 'sombre' || (choix === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', sombre ? 'dark' : 'light')
}

/** Script injecté dans <head> pour éviter l'éclair blanc au chargement. */
export const SCRIPT_THEME = `(function(){try{var c=localStorage.getItem('${CLE}')||'clair';var d=c==='sombre'||(c==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){}})()`

export default function ThemeToggle() {
  const [choix, setChoix] = useState<Choix>('clair')
  useEffect(() => { try { setChoix((localStorage.getItem(CLE) as Choix) || 'clair') } catch {} }, [])

  function changer(c: Choix) {
    setChoix(c)
    try { localStorage.setItem(CLE, c) } catch {}
    appliquerTheme(c)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-800">Apparence <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 align-middle">bêta</span></h2>
      <p className="text-sm text-gray-500 mt-1">Choisissez le thème de l'application. Le mode sombre est encore en test.</p>
      <div className="flex gap-2 mt-4" role="radiogroup" aria-label="Thème">
        {([['clair', 'Clair'], ['sombre', 'Sombre'], ['auto', 'Automatique']] as [Choix, string][]).map(([v, l]) => (
          <button key={v} role="radio" aria-checked={choix === v} onClick={() => changer(v)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={choix === v ? { background: '#1a3c2e', color: '#fff' } : { background: '#f0f4f1', color: '#2d6a4f' }}>{l}</button>
        ))}
      </div>
    </div>
  )
}
