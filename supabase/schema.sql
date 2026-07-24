-- ============================================================
-- FiscAI — Schema complet et final
-- Supabase SQL Editor → New query → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. COLLABORATEURS
-- ============================================================
CREATE TABLE collaborateurs (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  prenom     TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'collaborateur' CHECK (role IN ('admin', 'collaborateur')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collaborateurs ENABLE ROW LEVEL SECURITY;

-- Tous voient tous les collaborateurs (pour les listes d'assignation)
CREATE POLICY "collab_select" ON collaborateurs
  FOR SELECT TO authenticated USING (true);

-- Chacun insère uniquement son propre profil (à l'inscription)
CREATE POLICY "collab_insert" ON collaborateurs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Chacun modifie uniquement son propre profil
-- Changement de rôle géré via /api/set-role (service role)
CREATE POLICY "collab_update" ON collaborateurs
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Suppression via /api/delete-account (service role) uniquement

-- ============================================================
-- 2. CLIENTS
-- ============================================================
CREATE TABLE clients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raison_sociale    TEXT NOT NULL,
  nif               TEXT NOT NULL,
  regime_fiscal     TEXT,
  secteur_activite  TEXT,
  email_contact     TEXT,
  telephone         TEXT,
  collaborateur_id  UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Collaborateur voit ses clients + les non assignés ; admin voit tout
CREATE POLICY "clients_select" ON clients
  FOR SELECT TO authenticated USING (
    collaborateur_id = auth.uid()
    OR collaborateur_id IS NULL
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clients_insert" ON clients
  FOR INSERT TO authenticated WITH CHECK (
    collaborateur_id = auth.uid()
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clients_update" ON clients
  FOR UPDATE TO authenticated USING (
    collaborateur_id = auth.uid()
    OR collaborateur_id IS NULL
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "clients_delete" ON clients
  FOR DELETE TO authenticated USING (
    collaborateur_id = auth.uid()
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. DOSSIERS FISCAUX
-- ============================================================
CREATE TABLE dossiers_fiscaux (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  type_impot       TEXT NOT NULL,
  periode_mois     INTEGER CHECK (periode_mois BETWEEN 1 AND 12),
  periode_annee    INTEGER NOT NULL,
  date_echeance    DATE,
  statut           TEXT NOT NULL DEFAULT 'en_attente'
                   CHECK (statut IN ('en_attente', 'en_cours', 'depose', 'valide', 'rejete')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dossiers_fiscaux ENABLE ROW LEVEL SECURITY;

-- Accès via collaborateur_id du dossier OU via client assigné
CREATE POLICY "dossiers_select" ON dossiers_fiscaux
  FOR SELECT TO authenticated USING (
    collaborateur_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = dossiers_fiscaux.client_id
      AND (c.collaborateur_id = auth.uid() OR c.collaborateur_id IS NULL)
    )
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "dossiers_insert" ON dossiers_fiscaux
  FOR INSERT TO authenticated WITH CHECK (
    collaborateur_id = auth.uid()
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "dossiers_update" ON dossiers_fiscaux
  FOR UPDATE TO authenticated USING (
    collaborateur_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = dossiers_fiscaux.client_id
      AND (c.collaborateur_id = auth.uid() OR c.collaborateur_id IS NULL)
    )
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "dossiers_delete" ON dossiers_fiscaux
  FOR DELETE TO authenticated USING (
    collaborateur_id = auth.uid()
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. DOCUMENTS
-- ============================================================
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id    UUID NOT NULL REFERENCES dossiers_fiscaux(id) ON DELETE CASCADE,
  nom_fichier   TEXT NOT NULL,
  url_stockage  TEXT NOT NULL,
  type_document TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = documents.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR c.collaborateur_id IS NULL
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = documents.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR c.collaborateur_id IS NULL
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = documents.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- ============================================================
-- 5. RELANCES
-- ============================================================
CREATE TABLE relances (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id     UUID NOT NULL REFERENCES dossiers_fiscaux(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contenu_email  TEXT,
  statut         TEXT DEFAULT 'envoye' CHECK (statut IN ('envoye', 'envoye_whatsapp')),
  canal          TEXT DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  date_envoi     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE relances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relances_select" ON relances
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = relances.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR c.collaborateur_id IS NULL
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "relances_insert" ON relances
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = relances.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR c.collaborateur_id IS NULL
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- ============================================================
-- 6. MODELES RELANCE
-- ============================================================
CREATE TABLE modeles_relance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL,
  type_impot  TEXT,
  canal       TEXT DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  contenu     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE modeles_relance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modeles_select" ON modeles_relance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "modeles_insert" ON modeles_relance
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "modeles_delete" ON modeles_relance
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 7. COMMENTAIRES DOSSIERS
-- ============================================================
CREATE TABLE commentaires_dossiers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id       UUID NOT NULL REFERENCES dossiers_fiscaux(id) ON DELETE CASCADE,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  contenu          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commentaires_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commentaires_select" ON commentaires_dossiers
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = commentaires_dossiers.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR c.collaborateur_id IS NULL
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "commentaires_insert" ON commentaires_dossiers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = commentaires_dossiers.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR c.collaborateur_id IS NULL
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "commentaires_delete" ON commentaires_dossiers
  FOR DELETE TO authenticated USING (
    collaborateur_id = auth.uid()
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 8. HISTORIQUE STATUTS
-- ============================================================
CREATE TABLE historique_statuts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id       UUID NOT NULL REFERENCES dossiers_fiscaux(id) ON DELETE CASCADE,
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  ancien_statut    TEXT NOT NULL,
  nouveau_statut   TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE historique_statuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historique_select" ON historique_statuts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM dossiers_fiscaux d
      JOIN clients c ON c.id = d.client_id
      WHERE d.id = historique_statuts.dossier_id
      AND (
        d.collaborateur_id = auth.uid()
        OR c.collaborateur_id = auth.uid()
        OR c.collaborateur_id IS NULL
        OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "historique_insert" ON historique_statuts
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 9. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaborateur_id UUID REFERENCES collaborateurs(id) ON DELETE SET NULL,
  action           TEXT NOT NULL,
  details          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT TO authenticated USING (
    collaborateur_id = auth.uid()
    OR EXISTS (SELECT 1 FROM collaborateurs WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- STORAGE BUCKETS
-- Créer manuellement dans Storage si non existants :
-- • documents-fiscaux  → privé
-- • avatars            → public
--
-- Policies Storage (SQL Editor) :
--
-- CREATE POLICY "avatars_public_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars');
--
-- CREATE POLICY "avatars_owner_write" ON storage.objects
--   FOR ALL TO authenticated
--   USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "docs_fiscaux_auth" ON storage.objects
--   FOR ALL TO authenticated
--   USING (bucket_id = 'documents-fiscaux')
--   WITH CHECK (bucket_id = 'documents-fiscaux');
-- ============================================================
