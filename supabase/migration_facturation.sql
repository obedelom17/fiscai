-- Migration : ajout des champs de facturation sur dossiers_fiscaux
-- A exécuter dans l'éditeur SQL de Supabase si la base existe déjà

ALTER TABLE dossiers_fiscaux
  ADD COLUMN IF NOT EXISTS honoraires       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decaissements    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS montant_recu     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS statut_paiement  TEXT NOT NULL DEFAULT 'non_facture'
    CHECK (statut_paiement IN ('non_facture','facture','partiellement_paye','paye')),
  ADD COLUMN IF NOT EXISTS date_facturation DATE,
  ADD COLUMN IF NOT EXISTS date_paiement    DATE,
  ADD COLUMN IF NOT EXISTS notes_facturation TEXT;

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dossiers_fiscaux'
  AND column_name IN ('honoraires','decaissements','montant_recu','statut_paiement','date_facturation','date_paiement','notes_facturation');
