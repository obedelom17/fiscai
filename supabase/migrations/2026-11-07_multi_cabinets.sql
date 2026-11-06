-- FiscAI : passage en multi-cabinets (06/11/2026, 2e migration)
-- À exécuter UNE FOIS dans Supabase > SQL Editor, APRÈS 2026-11-06_ameliorations.sql.
-- Les données existantes sont rattachées à un premier cabinet « Experts Afrique Conseils » (renommable ensuite dans Paramètres).
-- Script idempotent.

-- 1. Cabinets et opérateurs de la plateforme
CREATE TABLE IF NOT EXISTS cabinets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom              TEXT NOT NULL,
  email_contact    TEXT,
  code_invitation  TEXT NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;

-- Opérateurs = propriétaires de la plateforme (accès au journal d'erreurs et aux clés VAPID)
CREATE TABLE IF NOT EXISTS operateurs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE operateurs ENABLE ROW LEVEL SECURITY;

ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_collaborateurs_cabinet ON collaborateurs(cabinet_id);

-- 2. Fonctions utilitaires (utilisées par les policies)
CREATE OR REPLACE FUNCTION public.mon_cabinet() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cabinet_id FROM public.collaborateurs WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.est_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.collaborateurs WHERE id = auth.uid() AND role = 'admin' AND cabinet_id IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION public.est_operateur() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.operateurs WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.generer_code_cabinet() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE h TEXT; c TEXT;
BEGIN
  LOOP
    h := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    c := substr(h, 1, 4) || '-' || substr(h, 5, 4) || '-' || substr(h, 9, 4);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cabinets WHERE code_invitation = c);
  END LOOP;
  RETURN c;
END $$;

-- 3. Colonne cabinet_id sur toutes les tables métier (remplie automatiquement à l'insertion)
ALTER TABLE clients               ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE dossiers_fiscaux      ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE documents             ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE relances              ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE modeles_relance       ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE commentaires_dossiers ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE historique_statuts    ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE audit_logs            ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();
ALTER TABLE parametres            ADD COLUMN IF NOT EXISTS cabinet_id UUID REFERENCES cabinets(id) ON DELETE CASCADE DEFAULT public.mon_cabinet();

-- 4. Rattachement des données existantes au premier cabinet
DO $$
DECLARE eac UUID;
BEGIN
  SELECT id INTO eac FROM cabinets ORDER BY created_at LIMIT 1;
  IF eac IS NULL THEN
    INSERT INTO cabinets (nom, code_invitation) VALUES ('Experts Afrique Conseils', public.generer_code_cabinet()) RETURNING id INTO eac;
  END IF;
  -- bypass du trigger de protection le temps du rattachement
  PERFORM set_config('fiscai.bypass', '1', true);
  UPDATE collaborateurs         SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE clients                SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE dossiers_fiscaux       SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE documents              SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE relances               SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE modeles_relance        SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE commentaires_dossiers  SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE historique_statuts     SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE audit_logs             SET cabinet_id = eac WHERE cabinet_id IS NULL;
  UPDATE parametres             SET cabinet_id = eac WHERE cabinet_id IS NULL;
  -- le premier administrateur devient opérateur de la plateforme
  INSERT INTO operateurs (user_id)
    SELECT id FROM collaborateurs WHERE role = 'admin' ORDER BY created_at LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;

ALTER TABLE clients               ALTER COLUMN cabinet_id SET NOT NULL;
ALTER TABLE dossiers_fiscaux      ALTER COLUMN cabinet_id SET NOT NULL;
ALTER TABLE documents             ALTER COLUMN cabinet_id SET NOT NULL;
ALTER TABLE relances              ALTER COLUMN cabinet_id SET NOT NULL;
ALTER TABLE modeles_relance       ALTER COLUMN cabinet_id SET NOT NULL;
ALTER TABLE commentaires_dossiers ALTER COLUMN cabinet_id SET NOT NULL;
ALTER TABLE historique_statuts    ALTER COLUMN cabinet_id SET NOT NULL;
ALTER TABLE parametres            ALTER COLUMN cabinet_id SET NOT NULL;

-- parametres : une ligne par cabinet et par clé
ALTER TABLE parametres DROP CONSTRAINT IF EXISTS parametres_pkey;
ALTER TABLE parametres ADD PRIMARY KEY (cabinet_id, cle);

CREATE INDEX IF NOT EXISTS idx_clients_cabinet    ON clients(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_cabinet   ON dossiers_fiscaux(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_relances_cabinet   ON relances(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_audit_cabinet      ON audit_logs(cabinet_id, created_at DESC);

-- 5. Protection du rôle et du cabinet (remplace le trigger précédent)
CREATE OR REPLACE FUNCTION public.proteger_role_collaborateur() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('fiscai.bypass', true) = '1' OR auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'collaborateur';
    NEW.cabinet_id := NULL;      -- le rattachement passe uniquement par creer_cabinet / rejoindre_cabinet
  ELSE
    NEW.role := OLD.role;
    NEW.cabinet_id := OLD.cabinet_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proteger_role ON collaborateurs;
CREATE TRIGGER trg_proteger_role BEFORE INSERT OR UPDATE ON collaborateurs
  FOR EACH ROW EXECUTE FUNCTION public.proteger_role_collaborateur();

-- 6. Création / adhésion à un cabinet
CREATE OR REPLACE FUNCTION public.creer_cabinet(p_nom TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cab UUID; v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF length(trim(coalesce(p_nom, ''))) < 2 THEN RAISE EXCEPTION 'Nom du cabinet requis'; END IF;
  SELECT cabinet_id INTO v_cab FROM collaborateurs WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_cab IS NOT NULL THEN RAISE EXCEPTION 'Vous appartenez déjà à un cabinet'; END IF;
  INSERT INTO cabinets (nom, code_invitation) VALUES (trim(p_nom), public.generer_code_cabinet()) RETURNING id INTO v_id;
  PERFORM set_config('fiscai.bypass', '1', true);
  UPDATE collaborateurs SET cabinet_id = v_id, role = 'admin' WHERE id = auth.uid();
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.rejoindre_cabinet(p_code TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cab UUID; v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT cabinet_id INTO v_cab FROM collaborateurs WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable'; END IF;
  IF v_cab IS NOT NULL THEN RAISE EXCEPTION 'Vous appartenez déjà à un cabinet'; END IF;
  SELECT id INTO v_id FROM cabinets WHERE code_invitation = upper(trim(coalesce(p_code, '')));
  IF v_id IS NULL THEN RAISE EXCEPTION 'Code d''invitation invalide'; END IF;
  PERFORM set_config('fiscai.bypass', '1', true);
  UPDATE collaborateurs SET cabinet_id = v_id, role = 'collaborateur' WHERE id = auth.uid();
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.regenerer_code_cabinet() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code TEXT;
BEGIN
  IF NOT public.est_admin() THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  v_code := public.generer_code_cabinet();
  UPDATE cabinets SET code_invitation = v_code WHERE id = public.mon_cabinet();
  RETURN v_code;
END $$;

REVOKE ALL ON FUNCTION public.creer_cabinet(TEXT), public.rejoindre_cabinet(TEXT), public.regenerer_code_cabinet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_cabinet(TEXT), public.rejoindre_cabinet(TEXT), public.regenerer_code_cabinet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mon_cabinet(), public.est_admin(), public.est_operateur() TO authenticated, service_role;

-- 7. Policies : on repart de zéro sur toutes les tables concernées
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'collaborateurs','cabinets','operateurs','clients','dossiers_fiscaux','documents','relances',
      'modeles_relance','commentaires_dossiers','historique_statuts','audit_logs','parametres','error_logs')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- collaborateurs
CREATE POLICY "collab_select" ON collaborateurs FOR SELECT TO authenticated
  USING (id = auth.uid() OR (cabinet_id IS NOT NULL AND cabinet_id = public.mon_cabinet()));
CREATE POLICY "collab_insert" ON collaborateurs FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "collab_update" ON collaborateurs FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- cabinets
CREATE POLICY "cabinets_select" ON cabinets FOR SELECT TO authenticated USING (id = public.mon_cabinet());
CREATE POLICY "cabinets_update" ON cabinets FOR UPDATE TO authenticated
  USING (id = public.mon_cabinet() AND public.est_admin()) WITH CHECK (id = public.mon_cabinet() AND public.est_admin());

-- operateurs
CREATE POLICY "operateurs_select_own" ON operateurs FOR SELECT TO authenticated USING (user_id = auth.uid());

-- clients
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet());
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (cabinet_id = public.mon_cabinet() AND (collaborateur_id = auth.uid() OR public.est_admin()));
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (cabinet_id = public.mon_cabinet() AND (collaborateur_id = auth.uid() OR public.est_admin()))
  WITH CHECK (cabinet_id = public.mon_cabinet());
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (cabinet_id = public.mon_cabinet() AND (collaborateur_id = auth.uid() OR public.est_admin()));

-- dossiers_fiscaux
CREATE POLICY "dossiers_select" ON dossiers_fiscaux FOR SELECT TO authenticated USING (
  cabinet_id = public.mon_cabinet() AND (
    public.est_admin()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = dossiers_fiscaux.client_id AND c.collaborateur_id = auth.uid())));
CREATE POLICY "dossiers_insert" ON dossiers_fiscaux FOR INSERT TO authenticated WITH CHECK (
  cabinet_id = public.mon_cabinet()
  AND (collaborateur_id = auth.uid() OR public.est_admin())
  AND EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.cabinet_id = public.mon_cabinet()));
CREATE POLICY "dossiers_update" ON dossiers_fiscaux FOR UPDATE TO authenticated
  USING (cabinet_id = public.mon_cabinet() AND (public.est_admin()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = dossiers_fiscaux.client_id AND c.collaborateur_id = auth.uid())))
  WITH CHECK (cabinet_id = public.mon_cabinet());
CREATE POLICY "dossiers_delete" ON dossiers_fiscaux FOR DELETE TO authenticated
  USING (cabinet_id = public.mon_cabinet() AND (public.est_admin()
    OR EXISTS (SELECT 1 FROM clients c WHERE c.id = dossiers_fiscaux.client_id AND c.collaborateur_id = auth.uid())));

-- Tables rattachées à un dossier : même visibilité que le dossier, dans le cabinet
CREATE OR REPLACE FUNCTION public.dossier_accessible(p_dossier UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dossiers_fiscaux d
    JOIN public.clients c ON c.id = d.client_id
    WHERE d.id = p_dossier
      AND d.cabinet_id = public.mon_cabinet()
      AND (d.collaborateur_id = auth.uid() OR c.collaborateur_id = auth.uid() OR public.est_admin())
  )
$$;
GRANT EXECUTE ON FUNCTION public.dossier_accessible(UUID) TO authenticated, service_role;

-- documents
CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));
CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated WITH CHECK (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));
CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated USING (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));

-- relances
CREATE POLICY "relances_select" ON relances FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));
CREATE POLICY "relances_insert" ON relances FOR INSERT TO authenticated WITH CHECK (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));

-- commentaires
CREATE POLICY "commentaires_select" ON commentaires_dossiers FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));
CREATE POLICY "commentaires_insert" ON commentaires_dossiers FOR INSERT TO authenticated WITH CHECK (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));
CREATE POLICY "commentaires_delete" ON commentaires_dossiers FOR DELETE TO authenticated
  USING (cabinet_id = public.mon_cabinet() AND (collaborateur_id = auth.uid() OR public.est_admin()));

-- historique des statuts
CREATE POLICY "historique_select" ON historique_statuts FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));
CREATE POLICY "historique_insert" ON historique_statuts FOR INSERT TO authenticated WITH CHECK (cabinet_id = public.mon_cabinet() AND public.dossier_accessible(dossier_id));

-- modèles de relance
CREATE POLICY "modeles_select" ON modeles_relance FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet());
CREATE POLICY "modeles_insert" ON modeles_relance FOR INSERT TO authenticated WITH CHECK (cabinet_id = public.mon_cabinet());
CREATE POLICY "modeles_delete" ON modeles_relance FOR DELETE TO authenticated USING (cabinet_id = public.mon_cabinet());

-- journal d'audit
CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet());
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (cabinet_id = public.mon_cabinet());

-- paramètres du cabinet
CREATE POLICY "parametres_select" ON parametres FOR SELECT TO authenticated USING (cabinet_id = public.mon_cabinet());
CREATE POLICY "parametres_admin_write" ON parametres FOR ALL TO authenticated
  USING (cabinet_id = public.mon_cabinet() AND public.est_admin())
  WITH CHECK (cabinet_id = public.mon_cabinet() AND public.est_admin());

-- journal d'erreurs : réservé aux opérateurs de la plateforme
CREATE POLICY "error_logs_operateur_select" ON error_logs FOR SELECT TO authenticated USING (public.est_operateur());
CREATE POLICY "error_logs_operateur_delete" ON error_logs FOR DELETE TO authenticated USING (public.est_operateur());

-- 8. Stockage des documents : privé, cloisonné par cabinet (le 1er dossier du chemin = id du dossier)
UPDATE storage.buckets SET public = false WHERE id = 'documents-fiscaux';

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') LIKE '%documents-fiscaux%' OR coalesce(with_check, '') LIKE '%documents-fiscaux%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "docs_fiscaux_cabinet" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents-fiscaux' AND CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    THEN public.dossier_accessible(((storage.foldername(name))[1])::uuid) ELSE FALSE END)
  WITH CHECK (bucket_id = 'documents-fiscaux' AND CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    THEN public.dossier_accessible(((storage.foldername(name))[1])::uuid) ELSE FALSE END);
