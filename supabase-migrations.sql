-- ============================================================
-- MIGRATIONS SUPABASE — FiscAl nouvelles fonctionnalités
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. TABLE: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborateurs voient leurs logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = collaborateur_id OR EXISTS (
    SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Insertion audit par utilisateurs connectés"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() = collaborateur_id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS audit_logs_collaborateur_idx ON audit_logs(collaborateur_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

-- 2. TABLE: modeles_relance
CREATE TABLE IF NOT EXISTS modeles_relance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type_impot TEXT NOT NULL DEFAULT 'TVA',
  canal TEXT NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE modeles_relance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir tous les modèles"
  ON modeles_relance FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Créer ses modèles"
  ON modeles_relance FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Supprimer ses modèles"
  ON modeles_relance FOR DELETE
  USING (auth.uid() = collaborateur_id OR EXISTS (
    SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin'
  ));

-- 3. COLONNE canal sur relances (si pas encore présente)
ALTER TABLE relances ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'email';

-- 4. COLONNE date_depot sur dossiers_fiscaux (si pas encore présente)
ALTER TABLE dossiers_fiscaux ADD COLUMN IF NOT EXISTS date_depot TIMESTAMPTZ;

-- 5. Vérification: colonne telephone sur clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telephone TEXT;

-- ============================================================
-- FIN DES MIGRATIONS
-- ============================================================
