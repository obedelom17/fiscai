import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const clientId = request.nextUrl.searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id requis' }, { status: 400 })

  const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single()
  const { data: dossiers } = await supabase
    .from('dossiers_fiscaux')
    .select('*')
    .eq('client_id', clientId)
    .order('date_echeance', { ascending: false })
  const { data: relances } = await supabase
    .from('relances')
    .select('*')
    .eq('client_id', clientId)
    .order('date_envoi', { ascending: false })

  if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

  const STATUT_LABELS: Record<string, string> = {
    en_attente: 'En attente',
    recu: 'Reçu',
    valide: 'Validé',
    televerse_otr: 'Téléversé OTR',
  }
  const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bulletin fiscal — ${client.raison_sociale}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: white; font-size: 11px; }
  .header { background: linear-gradient(135deg, #1a3c2e, #2d6a4f); color: white; padding: 28px 32px; }
  .header-logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .header-sub { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 2px; }
  .header-title { font-size: 16px; font-weight: 700; margin-top: 16px; }
  .header-date { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 4px; }
  .content { padding: 24px 32px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 700; color: #2d6a4f; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #2d6a4f; padding-bottom: 5px; margin-bottom: 12px; }
  .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .client-item { background: #f8fafb; border-radius: 8px; padding: 10px; }
  .client-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
  .client-value { font-size: 12px; font-weight: 600; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1a3c2e; }
  th { text-align: left; padding: 8px 10px; font-size: 9px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; font-size: 10px; border-bottom: 1px solid #f0f4f1; }
  tr:nth-child(even) td { background: #f8fafb; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 600; }
  .badge-attente { background: #fef9c3; color: #854d0e; }
  .badge-recu { background: #dbeafe; color: #1e40af; }
  .badge-valide { background: #dcfce7; color: #166534; }
  .badge-otr { background: #f3e8ff; color: #6b21a8; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat-card { background: #f8fafb; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-num { font-size: 22px; font-weight: 900; color: #1a3c2e; }
  .stat-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; margin-top: 2px; }
  .footer { background: #f8fafb; padding: 14px 32px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #2d6a4f; margin-top: 24px; }
  .footer-text { font-size: 9px; color: #9ca3af; }
  .gold { color: #e8a317; }
</style>
</head>
<body>
<div class="header">
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div>
      <div class="header-logo">FiscAl</div>
      <div class="header-sub">Experts Afrique Conseils — Lomé, Togo</div>
    </div>
    <div style="text-align:right;">
      <div class="header-title">Bulletin de Suivi Fiscal</div>
      <div class="header-date">Généré le ${now}</div>
    </div>
  </div>
</div>

<div class="content">
  <div class="section">
    <div class="section-title">Informations client</div>
    <div class="client-grid">
      <div class="client-item">
        <div class="client-label">Raison sociale</div>
        <div class="client-value">${client.raison_sociale}</div>
      </div>
      <div class="client-item">
        <div class="client-label">NIF</div>
        <div class="client-value">${client.nif || '—'}</div>
      </div>
      <div class="client-item">
        <div class="client-label">Régime fiscal</div>
        <div class="client-value">${client.regime_fiscal || '—'}</div>
      </div>
      <div class="client-item">
        <div class="client-label">Secteur</div>
        <div class="client-value">${client.secteur_activite || '—'}</div>
      </div>
      <div class="client-item">
        <div class="client-label">Email</div>
        <div class="client-value">${client.email_contact || '—'}</div>
      </div>
      <div class="client-item">
        <div class="client-label">Téléphone</div>
        <div class="client-value">${client.telephone || '—'}</div>
      </div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-num">${dossiers?.length || 0}</div>
      <div class="stat-label">Total dossiers</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#d97706">${dossiers?.filter(d => d.statut === 'en_attente').length || 0}</div>
      <div class="stat-label">En attente</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#2d6a4f">${dossiers?.filter(d => d.statut === 'valide' || d.statut === 'televerse_otr').length || 0}</div>
      <div class="stat-label">Traités</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#9333ea">${relances?.length || 0}</div>
      <div class="stat-label">Relances</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Dossiers fiscaux</div>
    ${dossiers && dossiers.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Période</th>
          <th>Échéance</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${dossiers.map(d => `
        <tr>
          <td><strong>${d.type_impot}</strong></td>
          <td>${d.periode_mois ? MOIS[d.periode_mois - 1] + ' ' : ''}${d.periode_annee}</td>
          <td>${new Date(d.date_echeance).toLocaleDateString('fr-FR')}</td>
          <td>
            <span class="badge badge-${d.statut === 'en_attente' ? 'attente' : d.statut === 'recu' ? 'recu' : d.statut === 'valide' ? 'valide' : 'otr'}">
              ${STATUT_LABELS[d.statut] || d.statut}
            </span>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#9ca3af;font-size:11px;">Aucun dossier enregistré</p>'}
  </div>

  ${relances && relances.length > 0 ? `
  <div class="section">
    <div class="section-title">Historique des relances</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Canal</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${relances.slice(0, 10).map(r => `
        <tr>
          <td>${new Date(r.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
          <td>${r.canal === 'whatsapp' ? 'WhatsApp' : 'Email'}</td>
          <td>${r.statut}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}
</div>

<div class="footer">
  <div class="footer-text">Document généré automatiquement par <strong>FiscAl</strong> — Experts Afrique Conseils</div>
  <div class="footer-text" style="color:#2d6a4f;font-weight:600;">Confidentiel</div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="bulletin-fiscal-${client.raison_sociale.replace(/[^a-zA-Z0-9]/g, '-')}.html"`,
    },
  })
}
