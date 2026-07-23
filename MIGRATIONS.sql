-- ========================================
-- MIGRATIONS FISCAI — Nouvelles fonctionnalités
-- À exécuter dans Supabase SQL Editor
-- ========================================

-- 1. TABLE: Commentaires internes sur les dossiers
CREATE TABLE IF NOT EXISTS commentaires_dossiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES dossiers_fiscaux(id) ON DELETE CASCADE,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_commentaires_dossier_id ON commentaires_dossiers(dossier_id);
CREATE INDEX IF NOT EXISTS idx_commentaires_created_at ON commentaires_dossiers(created_at DESC);

-- RLS
ALTER TABLE commentaires_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tous les collaborateurs peuvent lire les commentaires"
  ON commentaires_dossiers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Collaborateurs peuvent créer des commentaires"
  ON commentaires_dossiers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auteur peut supprimer ses commentaires"
  ON commentaires_dossiers FOR DELETE USING (
    collaborateur_id = auth.uid() OR
    EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. TABLE: Historique des statuts des dossiers
CREATE TABLE IF NOT EXISTS historique_statuts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES dossiers_fiscaux(id) ON DELETE CASCADE,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  ancien_statut TEXT,
  nouveau_statut TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_historique_dossier_id ON historique_statuts(dossier_id);
CREATE INDEX IF NOT EXISTS idx_historique_created_at ON historique_statuts(created_at ASC);

-- RLS
ALTER TABLE historique_statuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tous les collaborateurs peuvent lire l'historique"
  ON historique_statuts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Collaborateurs peuvent créer des entrées historique"
  ON historique_statuts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Realtime pour les nouvelles tables
ALTER PUBLICATION supabase_realtime ADD TABLE commentaires_dossiers;
ALTER PUBLICATION supabase_realtime ADD TABLE historique_statuts;

-- 4. S'assurer que audit_logs est en realtime (si pas déjà fait)
-- ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
