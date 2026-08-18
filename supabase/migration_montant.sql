-- Migration : suppression des colonnes facturation, ajout colonne montant
-- A exécuter dans l'éditeur SQL de Supabase

-- Supprimer les colonnes facturation
ALTER TABLE dossiers_fiscaux
  DROP COLUMN IF EXISTS honoraires,
  DROP COLUMN IF EXISTS decaissements,
  DROP COLUMN IF EXISTS montant_recu,
  DROP COLUMN IF EXISTS statut_paiement,
  DROP COLUMN IF EXISTS date_facturation,
  DROP COLUMN IF EXISTS date_paiement,
  DROP COLUMN IF EXISTS notes_facturation;

-- Ajouter la colonne montant
ALTER TABLE dossiers_fiscaux
  ADD COLUMN IF NOT EXISTS montant NUMERIC(12,2) DEFAULT NULL;

-- Vérification
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'dossiers_fiscaux'
ORDER BY ordinal_position;
